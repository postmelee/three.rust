import assert from 'node:assert/strict';
import {classifyCandidateProfileNode,candidateProfileWorkCategory} from './candidate-profile-analysis.mjs';

// A separate secondary observation. Never repair, reorder, weight or discard
// samples from a profile that failed the historical timeDelta-weighted gate.
export async function analyzeCandidateProfileCounts(profile,resolveFrame=async frame=>({label:frame.functionName||'(anonymous)',sourceStatus:'unresolved-no-resolver'})) {
 assert(Array.isArray(profile.nodes)&&profile.nodes.length>0&&profile.nodes.length<=200000,'Invalid profile nodes');
 assert(Array.isArray(profile.samples)&&Array.isArray(profile.timeDeltas)&&profile.samples.length>0,'Missing profile samples');
 assert.equal(profile.samples.length,profile.timeDeltas.length,'Sample/timeDelta lengths differ');
 assert(Number.isFinite(profile.startTime)&&Number.isFinite(profile.endTime)&&profile.endTime>=profile.startTime,'Invalid profile time range');
 const nodes=new Map(),parent=new Map();
 for(const node of profile.nodes){
  assert(Number.isSafeInteger(node.id)&&node.id>=0&&!nodes.has(node.id),'Invalid or duplicate profile node id');
  assert(node.callFrame&&typeof node.callFrame.functionName==='string'&&typeof node.callFrame.url==='string','Invalid profile callFrame');
  assert(Number.isInteger(node.callFrame.lineNumber)&&Number.isInteger(node.callFrame.columnNumber),'Invalid profile source position');
  assert(node.children===undefined||Array.isArray(node.children),'Invalid profile children');nodes.set(node.id,node);
 }
 for(const node of profile.nodes)for(const id of node.children??[]){assert(nodes.has(id),'Unknown child node');assert(!parent.has(id),'Duplicate child or multiple parents');parent.set(id,node.id);}
 const roots=[...nodes.keys()].filter(id=>!parent.has(id));assert.equal(roots.length,1,'Profile must have one tree root');
 const order=[],seen=new Set(),stack=[roots[0]];
 while(stack.length){const id=stack.pop();assert(!seen.has(id),'Cycle in profile tree');seen.add(id);order.push(id);for(const child of nodes.get(id).children??[])stack.push(child);}
 assert.equal(seen.size,nodes.size,'Disconnected or cyclic profile nodes');
 const records=new Map();
 for(const id of order){
  const raw=nodes.get(id),resolved=await resolveFrame({...raw.callFrame})??{};
  const record={id,parentId:parent.get(id)??null,children:[...(raw.children??[])],callFrame:{...raw.callFrame},label:resolved.label||raw.callFrame.functionName||'(anonymous)',source:resolved.source??null,sourceStatus:resolved.sourceStatus||'unresolved-no-result',wasm:resolved.wasm??null,selfHits:0,inclusiveHits:0};
  record.category=classifyCandidateProfileNode(record);
  const ownContext=record.sourceStatus==='verified-js'?candidateProfileWorkCategory(record.label,record.source?.file??''):null;
  record.contextCategory=ownContext??records.get(record.parentId)?.contextCategory??'unresolved context';records.set(id,record);
 }
 const buckets=new Map(),contexts=new Map(),coverage=new Map(),negativeEntries=[];
 const add=(table,key)=>table.set(key,(table.get(key)??0)+1);
 let minimumDelta=Infinity,maximumDelta=-Infinity,zeroDeltas=0;
 for(let index=0;index<profile.samples.length;index++){
  const id=profile.samples[index],delta=profile.timeDeltas[index];assert(records.has(id),'Sample refers to an unknown node');assert(Number.isFinite(delta),'Nonfinite sample timeDelta');
  minimumDelta=Math.min(minimumDelta,delta);maximumDelta=Math.max(maximumDelta,delta);if(delta===0)zeroDeltas++;if(delta<0)negativeEntries.push({sampleIndex:index,nodeId:id,rawTimeDelta:delta});
  const node=records.get(id);node.selfHits++;add(buckets,node.category);add(contexts,node.contextCategory);add(coverage,node.sourceStatus);
 }
 // Reverse tree traversal propagates integer ancestry totals. The raw sample
 // sequence and every original ID remain untouched and in their input order.
 for(let index=order.length-1;index>=0;index--){const node=records.get(order[index]);node.inclusiveHits+=node.selfHits;const ancestor=records.get(node.parentId);if(ancestor)ancestor.inclusiveHits+=node.inclusiveHits;}
 const sum=table=>[...table.values()].reduce((total,count)=>total+count,0),totalHits=profile.samples.length;
 const selfHits=[...records.values()].reduce((total,node)=>total+node.selfHits,0),rootInclusiveHits=records.get(roots[0]).inclusiveHits;
 assert.equal(selfHits,totalHits,'Exclusive node accounting mismatch');assert.equal(sum(buckets),totalHits,'Category accounting mismatch');assert.equal(sum(contexts),totalHits,'Context accounting mismatch');assert.equal(sum(coverage),totalHits,'Source coverage accounting mismatch');assert.equal(rootInclusiveHits,totalHits,'Inclusive root accounting mismatch');
 const excluded=['idle','program/native-unresolved','root'],activeHits=totalHits-excluded.reduce((total,key)=>total+(buckets.get(key)??0),0);
 const table=value=>Object.fromEntries([...value].map(([name,hits])=>[name,{hits}]));
 return {
  method:'counts-only-secondary',performanceQualification:false,historicalWeightedGate:'Not repaired, replaced or qualified by this secondary method; retain its separately bound result.',
  totalHits,activeHits,activeDenominatorExcludes:excluded,
  activeDenominatorMeaning:'Integer sampled leaves after the listed exclusions; GC, unresolved source and observation samples remain included. No time normalization or percent is computed.',
  sampleNodeIds:[...profile.samples],sampleOrder:'Original input sample order and IDs, including every sample with a negative or zero timeDelta.',
  buckets:table(buckets),contextBuckets:table(contexts),sourceCoverage:table(coverage),
  sourceCoverageMeaning:'The same exact captured-source and Wasm verification statuses as the weighted analyzer; names without verified source identity remain unresolved.',
  nodes:profile.nodes.map(node=>records.get(node.id)),nodeOrder:'Original profile.nodes order; selfHits are disjoint, inclusiveHits overlap along ancestors and cannot be summed as total work.',
  accounting:{inputSamples:totalHits,exclusiveNodeHits:selfHits,categoryHits:sum(buckets),contextHits:sum(contexts),sourceCoverageHits:sum(coverage),rootInclusiveHits,allSamplesAccounted:true},
  rawTiming:{startTime:profile.startTime,endTime:profile.endTime,timeDeltaCount:profile.timeDeltas.length,finite:true,minimumDelta,maximumDelta,negativeCount:negativeEntries.length,zeroCount:zeroDeltas,negativeEntries,scope:'Raw CDP metadata only; no duration calculation, timestamp sorting, clamping, filtering or sample weight.'},
  limitations:['Sample counts are diagnostic observations, not CPU time, milliseconds, timing quantiles, normalized load, FPS or a performance gain.','Subsystem classification remains heuristic after source verification. Context categories inherit the nearest recognized source ancestor and are not extra work.','Sampling cadence and profiler bias remain uncalibrated; counts do not validate a failed weighted profile or qualify a candidate.']
 };
}
