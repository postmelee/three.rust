// Shared finite descriptor/command ABI. No Three.js dependency or mutable scene scan.
export const COMMAND_STRIDE=20, MAX_COMMANDS=256;
export function finite(x,name='value'){if(typeof x!=='number'||!Number.isFinite(x))throw Error(`owned: finite ${name} required`);return x;}
function integer(x,min,max,name){finite(x,name);if(!Number.isInteger(x)||x<min||x>max)throw Error(`owned: invalid ${name}`);return x;}
function keys(o,allowed){if(!o||typeof o!=='object')throw Error('owned: descriptor required');for(const k of Object.keys(o))if(!allowed.includes(k))throw Error(`owned: unsupported field ${k}`);}
function numbers(a,n,name){if(!a||a.length!==n)throw Error(`owned: invalid ${name} length`);return Array.from(a,x=>finite(x,name));}
function pose(a){const p=numbers(a,10,'pose');const q=Math.hypot(...p.slice(3,7));if(Math.abs(q-1)>1e-5)throw Error('owned: unit quaternion required');return p;}
function matrix(a){const m=numbers(a,16,'matrix');if(m[3]||m[7]||m[11]||m[15]!==1)throw Error('owned: affine matrix required');const det=m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);if(Math.abs(det)<1e-12)throw Error('owned: invertible matrix required');return m;}
export function encodeDescriptor(d){
 keys(d,['parents','basePose','inverseBind','roots','clips']);const n=integer(d.parents?.length,1,512,'node count'),r=integer(d.roots?.length,1,256,'rig count'),c=integer(d.clips?.length,1,32,'clip count');
 if(d.basePose?.length!==n||d.inverseBind?.length!==n)throw Error('owned: node descriptor lengths');
 const parents=Array.from(d.parents,(p,i)=>integer(p,-1,i-1,'parent')),rest=d.basePose.flatMap(pose),inverse=d.inverseBind.flatMap(matrix),roots=d.roots.flatMap(matrix),durations=[],tracks=[];
 d.clips.forEach((clip,ci)=>{keys(clip,['duration','tracks']);finite(clip.duration);if(clip.duration<=0||clip.duration>1e6)throw Error('owned: invalid duration');durations.push(clip.duration);if(!Array.isArray(clip.tracks))throw Error('owned: tracks required');const seen=new Set();
  for(const t of clip.tracks){keys(t,['node','property','times','values']);integer(t.node,0,n-1,'track node');const kind=['position','quaternion','scale'].indexOf(t.property);if(kind<0)throw Error('owned: unsupported track property');const id=`${t.node}:${kind}`;if(seen.has(id))throw Error('owned: duplicate binding');seen.add(id);const k=integer(t.times?.length,1,10000,'key count'),size=kind===1?4:3;
   const times=numbers(t.times,k,'times').map(Math.fround),values=numbers(t.values,k*size,'values').map(Math.fround);if(!values.every(Number.isFinite)||!times.every((x,i)=>Number.isFinite(x)&&x>=0&&x<=clip.duration&&(!i||x>times[i-1])))throw Error('owned: invalid Float32 keys');
   if(kind===1)for(let j=0;j<k;j++)if(Math.abs(Math.hypot(...values.slice(j*4,j*4+4))-1)>1e-5)throw Error('owned: unit track quaternion required');tracks.push([ci,t.node,kind,k,...times,...values]);
  }
 });
 const flat=[n,r,c,tracks.length,...parents,...rest,...inverse,...roots,...durations];for(const t of tracks)flat.push(...t);if(flat.length>16000000)throw Error('owned: descriptor too large');return {data:new Float64Array(flat),n,r,c};
}
export function encodeCommands(list,{n,r,c}){
 if(!Array.isArray(list)||list.length>MAX_COMMANDS)throw Error('owned: at most 256 commands');const data=new Float64Array(list.length*COMMAND_STRIDE);
 list.forEach((cmd,i)=>{keys(cmd,['type','rig','clip','time','weight','timeScale','paused','loop','value','node','parent']);const b=i*COMMAND_STRIDE;integer(cmd.rig,0,r-1,'rig');data[b+1]=cmd.rig;
  const type=['action','weight','seek','pause','root','pose','reparent'].indexOf(cmd.type);if(type<0)throw Error('owned: unsupported command');data[b]=type;
  const allowed=[['type','rig','clip','time','weight','timeScale','paused','loop'],['type','rig','clip','value'],['type','rig','clip','value'],['type','rig','clip','value'],['type','rig','value'],['type','rig','node','value'],['type','rig','node','parent']][type];keys(cmd,allowed);
  if(type<4){integer(cmd.clip,0,c-1,'clip');data[b+2]=cmd.clip;}
  if(type===0){const time=finite(cmd.time??0),weight=finite(cmd.weight??1),scale=finite(cmd.timeScale??1);if(time<0||time>1e6||weight<0||weight>1e6||Math.abs(scale)>1e6)throw Error('owned: invalid action');if(cmd.paused!==undefined&&typeof cmd.paused!=='boolean')throw Error('owned: paused must be boolean');if(cmd.loop!==undefined&&!['repeat','once'].includes(cmd.loop))throw Error('owned: unsupported loop');data.set([time,weight,scale,cmd.paused?1:0,cmd.loop==='once'?1:0],b+3);}
  if(type===1||type===2){const v=finite(cmd.value);if(v<0||v>1e6)throw Error('owned: invalid weight/time');data[b+3]=v;}
  if(type===3){if(typeof cmd.value!=='boolean')throw Error('owned: pause must be boolean');data[b+3]=cmd.value?1:0;}
  if(type===4)data.set(matrix(cmd.value),b+2);
  if(type===5){integer(cmd.node,0,n-1,'node');data[b+2]=cmd.node;data.set(pose(cmd.value),b+3);}
  if(type===6){integer(cmd.node,0,n-1,'node');data[b+2]=cmd.node;data[b+3]=integer(cmd.parent,-1,cmd.node-1,'parent');}
 });return data;
}
