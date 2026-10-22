export function install(f){
 const {THREE}=f; let tick=0;const metrics={};let profiled=false;
 function wrap(obj,key,label){const fn=obj[key];obj[key]=function(...a){const t=performance.now();try{return fn.apply(this,a)}finally{metrics[label]=(metrics[label]||0)+performance.now()-t}};}
 async function ready(){while(!f.ready())await new Promise(r=>setTimeout(r,10));if(THREE.init) await THREE.init();
 const {scene,renderer}=f.get();const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
 return {userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),gpuTimer:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,dpr:devicePixelRatio,objects:(()=>{let n=0;scene.traverse(()=>n++);return n})()};}
 function profile(){if(profiled)return;profiled=true;const {scene,renderer}=f.get();wrap(scene,'updateMatrixWorld','transforms');wrap(THREE.AnimationMixer.prototype,'update','animation');wrap(THREE.Skeleton.prototype,'update','skeleton');wrap(THREE.Raycaster.prototype,'intersectObjects','raycast');wrap(renderer,'render','render');}
 function step(){for(const k in metrics)metrics[k]=0;window.__tick=tick++;const t=performance.now();f.animate();return {cpu:performance.now()-t,...metrics,...(THREE.diagnostics?{bridge:THREE.diagnostics()}:{} )};}
 window.__bench={ready,profile,step,get:f.get,THREE,
 async run({warmup=30,samples=90,profile:doProfile=false,gpu=false}){
  await ready();if(doProfile)profile();let prev;const rows=[];const {renderer}=f.get(),gl=renderer.getContext();
  const ext=gpu?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null, pending=[];
  for(let i=0;i<warmup+samples;i++){
   const raf=await new Promise(requestAnimationFrame);const interval=prev===undefined?null:raf-prev;prev=raf;
   const query=ext?gl.createQuery():null;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
   const row=step();if(query)gl.endQuery(ext.TIME_ELAPSED_EXT);
   Object.assign(row,{interval,tick:tick-1,gpuMs:null,gpuStatus:gpu?(ext?'pending':'unsupported'):'not-requested'});
   if(i>=warmup)rows.push(row);if(query)pending.push({query,row});
   if(ext){if(gl.getParameter(ext.GPU_DISJOINT_EXT)){for(const p of pending){p.row.gpuStatus='disjoint';gl.deleteQuery(p.query);}pending.length=0;}
    else while(pending.length&&gl.getQueryParameter(pending[0].query,gl.QUERY_RESULT_AVAILABLE)){const p=pending.shift();p.row.gpuMs=gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6;p.row.gpuStatus='available';gl.deleteQuery(p.query);}}
  }
  for(const p of pending){p.row.gpuStatus='pending-at-end';gl.deleteQuery(p.query);}
  return {rows,info:{...renderer.info.render,programs:renderer.info.programs.length},memory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize}:null};
 },
 snapshot(){const {scene,renderer,camera}=f.get();renderer.render(scene,camera);const matrices=[];scene.traverse(o=>matrices.push(...o.matrixWorld.elements));const gl=renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return {matrices,pixels:Array.from(pixels),png:renderer.domElement.toDataURL('image/png'),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};}};
}
