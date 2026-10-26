import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const unresolvedWasm = (frame, map, reason) => ({resolved:false,label:frame.functionName || '(anonymous Wasm)',moduleSha256:map?.sha256 ?? null,reason});

// This is a bounded symbol-section reader, not an instruction/type validator.
// The caller must separately bind a CDP scriptId to these exact verified bytes.
export function parseWasmSymbols(input, {expectedSha256} = {}) {
 assert(input instanceof Uint8Array, 'Wasm bytes must be a Uint8Array');
 const bytes = new Uint8Array(input.buffer,input.byteOffset,input.byteLength);
 assert(bytes.length >= 8 && bytes.length <= 64 * 1024 * 1024, 'Invalid Wasm byte length');
 assert.deepEqual([...bytes.subarray(0,8)],[0,97,115,109,1,0,0,0],'Invalid Wasm header/version');
 const digest = sha256(bytes);
 if (expectedSha256 !== undefined) {
  assert.match(expectedSha256,/^[0-9a-f]{64}$/,'Expected Wasm SHA-256 is invalid');
  assert.equal(digest,expectedSha256,'Wasm artifact SHA-256 mismatch');
 }
 const maxEntries = Math.min(bytes.length,1000000), decoder = new TextDecoder('utf-8',{fatal:true});
 function reader(start,end) {
  let position=start;
  const r={
   get remaining(){return end-position;},
   byte(){assert(position<end,'Truncated Wasm section');return bytes[position++];},
   uint(bits=32){
    let value=0n, shift=0n;
    const maxBytes=Math.ceil(bits/7);
    for(let i=0;i<maxBytes;i++) {
     const byte=r.byte();value|=BigInt(byte&127)<<shift;
     assert(value<(1n<<BigInt(bits)),'Overflowing Wasm unsigned LEB');
     if(!(byte&128))return bits<=32?Number(value):value;
     shift+=7n;
    }
    throw Error('Overlong Wasm unsigned LEB');
   },
   count(){const n=r.uint();assert(n<=maxEntries,'Excessive Wasm vector length');return n;},
   string(){const n=r.uint();assert(n<=r.remaining,'Truncated Wasm string');const text=decoder.decode(bytes.subarray(position,position+n));position+=n;return text;},
   sub(n){assert(Number.isSafeInteger(n)&&n>=0&&n<=r.remaining,'Truncated Wasm subsection');const child=reader(position,position+n);position+=n;return child;},
   skip(){position=end;},
   done(){assert.equal(r.remaining,0,'Unexpected bytes in Wasm section');}
  };return r;
 }
 function valueType(r) {assert([0x7f,0x7e,0x7d,0x7c,0x7b,0x70,0x6f].includes(r.byte()),'Unsupported Wasm value/reference type');}
 function limits(r,memory) {
  const flags=r.uint();assert(flags <= (memory?7:1),'Unsupported Wasm limits flags');
  assert(!(flags&2)||(flags&1),'Shared Wasm memory requires a maximum');
  const bits=(flags&4)?64:32, minimum=r.uint(bits), maximum=(flags&1)?r.uint(bits):null;
  if(maximum!==null)assert(maximum>=minimum,'Invalid Wasm limits');
 }
 const imports=[], exports=[], names=new Map(), sectionIds=new Set(), exportNames=new Set();
 let definedFunctions=0, codeFunctions=0, nameSectionPresent=false;
 const module=reader(8,bytes.length);
 while(module.remaining) {
  const id=module.byte();
  const section=module.sub(module.uint());
  if(id!==0){assert(!sectionIds.has(id),'Duplicate Wasm section');sectionIds.add(id);}
  if(id===0) {
   const kind=section.string();
   if(kind==='name') {
    nameSectionPresent=true;
    while(section.remaining) {
     const subsectionId=section.byte(), subsection=section.sub(section.uint());
     if(subsectionId===1) {
      for(let n=subsection.count();n>0;n--) {
       const index=subsection.uint(), name=subsection.string();
       assert(!names.has(index),'Duplicate Wasm function name index');names.set(index,name);
      }
      subsection.done();
     } else subsection.skip();
    }
   } else section.skip();
  } else if(id===2) {
   for(let n=section.count();n>0;n--) {
    const moduleName=section.string(), name=section.string(), kind=section.byte();
    if(kind===0){const typeIndex=section.uint();imports.push({module:moduleName,name,typeIndex});}
    else if(kind===1){assert([0x70,0x6f].includes(section.byte()),'Unsupported Wasm table reference type');limits(section,false);}
    else if(kind===2)limits(section,true);
    else if(kind===3){valueType(section);assert(section.byte()<=1,'Invalid Wasm global mutability');}
    else if(kind===4){assert.equal(section.uint(),0,'Unsupported Wasm tag attribute');section.uint();}
    else throw Error('Unknown Wasm import kind');
   }
  } else if(id===3) {
   definedFunctions=section.count();for(let i=0;i<definedFunctions;i++)section.uint();
  } else if(id===7) {
   for(let n=section.count();n>0;n--) {
    const name=section.string(), kind=section.byte(), index=section.uint();
    assert(!exportNames.has(name),'Duplicate Wasm export name');exportNames.add(name);
    assert(kind<=4,'Unknown Wasm export kind');if(kind===0)exports.push({name,index});
   }
  } else if(id===10) {
   codeFunctions=section.count();for(let i=0;i<codeFunctions;i++)section.sub(section.uint()).skip();
  } else section.skip();
  section.done();
 }
 assert.equal(codeFunctions,definedFunctions,'Wasm function/code counts differ');
 const functionCount=imports.length+definedFunctions;
 assert(functionCount<=maxEntries,'Excessive Wasm function count');
 const functions=Array.from({length:functionCount},(_,index)=>({index,name:names.get(index)??null,exports:[],import:index<imports.length?imports[index]:null}));
 for(const {name,index} of exports){assert(index<functionCount,'Wasm export function index is out of range');functions[index].exports.push(name);}
 for(const index of names.keys())assert(index<functionCount,'Wasm name function index is out of range');
 return {sha256:digest,verified:expectedSha256!==undefined,functionCount,importedFunctionCount:imports.length,definedFunctionCount:definedFunctions,nameSectionPresent,functions};
}

export function resolveWasmFrame(frame,map) {
 if(!map?.verified||!/^[0-9a-f]{64}$/.test(map.sha256??''))return unresolvedWasm(frame,map,'No verified module identity');
 const raw=frame.functionName||'', match=/^wasm-function\[(\d+)\]$/.exec(raw);
 let item,matchedBy;
 if(match) {
  const index=Number(match[1]);
  if(!Number.isSafeInteger(index)||index>=map.functionCount)return unresolvedWasm(frame,map,'Function index is outside verified module');
  item=map.functions[index];matchedBy='function-index';
 } else {
  const matches=map.functions.filter(item=>raw&&(item.name===raw||item.exports.includes(raw)));
  if(matches.length!==1)return unresolvedWasm(frame,map,matches.length?'Ambiguous exact function name':'No exact function index or name; offsets are not inferred');
  [item]=matches;matchedBy='exact-name';
 }
 if(!item)return unresolvedWasm(frame,map,'Function index is absent from verified module');
 return {resolved:true,label:item.name||item.exports[0]||`wasm-function[${item.index}]`,moduleSha256:map.sha256,functionIndex:item.index,name:item.name,exports:[...item.exports],matchedBy};
}

function workCategory(label,file) {
 const text=label+' '+file;
 if(/expandByObject|setFromObject|getVertexPosition|applyBoneTransform|intersectObject|checkGeometryIntersection|raycast/.test(text))return 'bounds/picking/skinned-public-read';
 if(/AnimationMixer|AnimationAction|PropertyMixer|PropertyBinding|Interpolant|interpolate_|slerpFlat/.test(text))return 'animation/binding';
 if(/Skeleton/.test(text))return 'skeleton/palette';
 if(/projectObject|Frustum|painterSort|reversePainterSort|WebGLRenderList/.test(text))return 'visibility/sort';
 if(/WebGLShadowMap/.test(text))return 'shadow pass';
 if(/uniform|Uniform|WebGLAttributes|WebGLTextures|bufferSubData|texSubImage|texImage|renderBufferDirect|renderObject/.test(text))return 'render preparation/submission';
 if(/updateMatrixWorld|updateWorldMatrix|Matrix4|Matrix3|Vector3|Quaternion/.test(text))return 'transform/math';
 if(/render|WebGLRenderer/.test(text))return 'render residual';
 if(/dispatch|Signal|GUI|Stats|Animation\.js|Sidebar|Menubar|Outliner|ui\.js/.test(text))return 'UI/callback';
 return null;
}
function classify(node) {
 const raw=node.callFrame.functionName;
 if(raw==='(idle)')return 'idle';
 if(raw==='(garbage collector)')return 'GC';
 if(raw==='(program)')return 'program/native-unresolved';
 if(raw==='(root)')return 'root';
 if(node.wasm || /^wasm:/.test(node.callFrame.url??''))return node.wasm?.resolved?'Wasm verified function':'Wasm unresolved';
 // The verified engine route itself is /__rthree_candidate__/; its URL is
 // application source identity, not evidence of automation instrumentation.
 if(node.sourceStatus!=='verified-js'&&(/UtilityScript|injectedScript|__pw|__rthree/.test(node.label+' '+node.callFrame.url)||/^(?:observe|evaluate)$/.test(node.label)))return 'automation/observation';
 if(/(?:^|\/)(?:candidate-profile-session|timing-overlay)\.mjs$/.test(node.source?.file??'')&&/profileSnapshot|warmNativeFrames|installProfileObserver|installTimingCollector/.test(node.label))return 'automation/observation';
 if(node.sourceStatus!=='verified-js')return 'source unresolved';
 const file=node.source?.file??'', label=node.label;
 if(/(?:facade|prepared)-kernel\.js$/.test(file))return 'matched-JS kernel';
 if(/facade-state\.js$/.test(file)) {
  if(/(?:^|\.)(?:materialize|readFacadeElements|trackedMatrix)(?:\.|$)/.test(label))return 'facade matrix materialization/proxy';
  if(/(?:^|\.)(?:scalar|trackFacadeObject)(?:\.|$)/.test(label))return 'facade scalar/input/flag tracking';
  if(/markInput|markMeta|upload|facadeUpdate|updateSingle|syncInputs|updatePlan|refreshPassInputs|ensurePlan|objectMeta/.test(label))return 'facade operation preparation';
  if(/(?:^|\.)call$/.test(label))return 'facade ABI dispatch';
  return 'facade other';
 }
 if(/runtime\.js$/.test(file)&&/matrixElements|preparedUploadElements/.test(label))return 'facade matrix materialization/proxy';
 if(/runtime\.js$/.test(file)&&/facadeLocal|facadeSelective/.test(label))return 'facade ABI dispatch';
 return workCategory(label,file)||'verified JS other';
}
function quantile(values,p) {
 if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),at=(sorted.length-1)*p,lo=Math.floor(at);
 return sorted[lo]+(sorted[Math.ceil(at)]-sorted[lo])*(at-lo);
}

// Exclusive categories and context categories each account for every sample
// once. Inclusive ancestor totals overlap and must never be summed as CPU time.
export async function analyzeCandidateProfile(profile,resolveFrame=async frame=>({label:frame.functionName||'(anonymous)',sourceStatus:'unresolved-no-resolver'})) {
 assert(Array.isArray(profile.nodes)&&profile.nodes.length>0&&profile.nodes.length<=200000,'Invalid profile nodes');
 assert(Array.isArray(profile.samples)&&Array.isArray(profile.timeDeltas)&&profile.samples.length>0,'Missing profile samples');
 assert.equal(profile.samples.length,profile.timeDeltas.length,'Sample/timeDelta lengths differ');
 assert(Number.isFinite(profile.startTime)&&Number.isFinite(profile.endTime)&&profile.endTime>=profile.startTime,'Invalid profile time range');
 const nodes=new Map(),parent=new Map();
 for(const node of profile.nodes) {
  assert(Number.isSafeInteger(node.id)&&node.id>=0&&!nodes.has(node.id),'Invalid or duplicate profile node id');
  assert(node.callFrame&&typeof node.callFrame.functionName==='string'&&typeof node.callFrame.url==='string','Invalid profile callFrame');
  assert(Number.isInteger(node.callFrame.lineNumber)&&Number.isInteger(node.callFrame.columnNumber),'Invalid profile source position');
  assert(node.children===undefined||Array.isArray(node.children),'Invalid profile children');nodes.set(node.id,node);
 }
 for(const node of profile.nodes)for(const id of node.children??[]) {
  assert(nodes.has(id),'Unknown child node');assert(!parent.has(id),'Duplicate child or multiple parents');parent.set(id,node.id);
 }
 const roots=[...nodes.keys()].filter(id=>!parent.has(id));assert.equal(roots.length,1,'Profile must have one tree root');
 const order=[],seen=new Set(),stack=[roots[0]];
 while(stack.length){const id=stack.pop();assert(!seen.has(id),'Cycle in profile tree');seen.add(id);order.push(id);for(const child of nodes.get(id).children??[])stack.push(child);}
 assert.equal(seen.size,nodes.size,'Disconnected or cyclic profile nodes');
 const records=new Map();
 for(const id of order) {
  const raw=nodes.get(id),resolved=await resolveFrame({...raw.callFrame})??{};
  const record={id,parentId:parent.get(id)??null,children:[...(raw.children??[])],callFrame:{...raw.callFrame},label:resolved.label||raw.callFrame.functionName||'(anonymous)',source:resolved.source??null,sourceStatus:resolved.sourceStatus||'unresolved-no-result',wasm:resolved.wasm??null,selfMs:0,inclusiveMs:0,hits:0,inclusiveHits:0};
  record.category=classify(record);
  const ownContext=record.sourceStatus==='verified-js'?workCategory(record.label,record.source?.file??''):null;
  record.contextCategory=ownContext??records.get(record.parentId)?.contextCategory??'unresolved context';
  records.set(id,record);
 }
 const buckets={},contextBuckets={},coverage={},shortGapBuckets={},longGaps=[];
 let weightedMs=0,minimumGapUs=Infinity,maximumGapUs=0;
 const add=(table,key,ms)=>{const value=table[key]??={sampledMs:0,samples:0};value.sampledMs+=ms;value.samples++;};
 for(let i=0;i<profile.samples.length;i++) {
  const id=profile.samples[i],delta=profile.timeDeltas[i];
  assert(records.has(id),'Sample refers to an unknown node');assert(Number.isFinite(delta)&&delta>=0,'Invalid sample timeDelta');
  minimumGapUs=Math.min(minimumGapUs,delta);maximumGapUs=Math.max(maximumGapUs,delta);
  const ms=delta/1000,node=records.get(id);weightedMs+=ms;assert(Number.isFinite(weightedMs),'Profile duration overflow');
  node.selfMs+=ms;node.hits++;add(buckets,node.category,ms);add(contextBuckets,node.contextCategory,ms);add(coverage,node.sourceStatus,ms);
  if(ms<=5)add(shortGapBuckets,node.category,ms);else longGaps.push({sample:i,nodeId:id,timeDeltaUs:delta,category:node.category});
 }
 for(const id of [...order].reverse()) {
  const node=records.get(id);node.inclusiveMs+=node.selfMs;node.inclusiveHits+=node.hits;
  const ancestor=records.get(node.parentId);if(ancestor){ancestor.inclusiveMs+=node.inclusiveMs;ancestor.inclusiveHits+=node.inclusiveHits;}
 }
 const sum=table=>Object.values(table).reduce((total,bucket)=>total+bucket.sampledMs,0);
 const tolerance=Math.max(1e-9,weightedMs*1e-12);
 assert(Math.abs(sum(buckets)-weightedMs)<=tolerance&&Math.abs(sum(contextBuckets)-weightedMs)<=tolerance,'Exclusive accounting mismatch');
 assert(Math.abs(records.get(roots[0]).inclusiveMs-weightedMs)<=tolerance,'Inclusive root accounting mismatch');
 const excluded=['idle','program/native-unresolved','root'],activeMs=weightedMs-excluded.reduce((sum,key)=>sum+(buckets[key]?.sampledMs??0),0);
 for(const [key,value] of Object.entries(buckets))value.percentOfActive=!excluded.includes(key)&&activeMs>0?value.sampledMs/activeMs*100:null;
 const all=[...records.values()];
 return {
  method:'CDP timeDelta-weighted sample attribution; exclusive categories sum once, ancestor inclusive costs overlap. Not on-CPU cycles, primary callback quantiles, GPU time or FPS.',
  durationMs:(profile.endTime-profile.startTime)/1000,weightedMs,durationMinusWeightedMs:(profile.endTime-profile.startTime)/1000-weightedMs,
  samples:profile.samples.length,activeMs,activeDenominatorExcludes:excluded,buckets,contextBuckets,sourceCoverage:coverage,
  sourceCoverageMeaning:'Resolver verification status for each sampled leaf; Wasm mapping additionally requires a verified artifact bound to its script ID.',
  sampleGapsUs:{min:minimumGapUs,p50:quantile(profile.timeDeltas,.5),p95:quantile(profile.timeDeltas,.95),p99:quantile(profile.timeDeltas,.99),max:maximumGapUs},
  sensitivity:{rule:'Post-capture sensitivity only; all original samples remain in default weighting.',shortGapMaximumUs:5000,shortGapBuckets,longGaps},
  exclusive:[...all].sort((a,b)=>b.selfMs-a.selfMs||a.id-b.id),inclusive:[...all].sort((a,b)=>b.inclusiveMs-a.inclusiveMs||a.id-b.id),
  limitations:['Subsystem classification is heuristic after source verification. Context categories describe the nearest recognized ancestor and are not additional cost.','Native/unknown source frames remain unresolved; a function name or source line alone does not prove artifact identity.']
 };
}
