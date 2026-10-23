// Called only by the trusted push/manual workflow; never by pull_request_target.
export async function syncRoadmap({github,owner,repo,roadmap}) {
 const milestones=await github.paginate(github.rest.issues.listMilestones,{owner,repo,state:'all',per_page:100});
 // Validate every target before mutating anything. Never adopt unrelated issues.
 const issues=new Map();
 for(const task of roadmap.tasks){
  const {data}=await github.rest.issues.get({owner,repo,issue_number:task.issue});
  if(data.pull_request||!data.body?.includes(`<!-- rthree-roadmap:${task.key} -->`))throw Error(`Issue #${task.issue} lacks its roadmap marker`);
  issues.set(task.issue,data);
 }
 const numbers=new Map();
 for(const spec of roadmap.milestones){
  const matches=milestones.filter(m=>m.title===spec.title);
  if(matches.length>1||matches[0]?.state==='closed')throw Error(`Ambiguous/closed milestone: ${spec.title}`);
  const m=matches[0]??(await github.rest.issues.createMilestone({owner,repo,title:spec.title,description:spec.description})).data;
  numbers.set(spec.key,m.number);
 }
 const tasks=[];
 for(const task of roadmap.tasks){
  const milestone=numbers.get(task.milestone);if(!milestone)throw Error(`Unknown milestone ${task.milestone}`);
  if(issues.get(task.issue).milestone?.number!==milestone)await github.rest.issues.update({owner,repo,issue_number:task.issue,milestone});
  const {data}=await github.rest.issues.get({owner,repo,issue_number:task.issue});
  if(data.milestone?.number!==milestone)throw Error(`Milestone assignment failed: #${task.issue}`);
  tasks.push({key:task.key,issue:task.issue,milestone,state:data.state});
 }
 return {milestones:Object.fromEntries(numbers),tasks};
}
