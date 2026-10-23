import {check} from './cases.mjs';

// Two synchronous renders; callback writes, explicit reads and matrix preparation
// must be observable in the same order for every engine route.
export function runRenderContract(T,canvas){
  const renderer=new T.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});
  renderer.setSize(64,64,false);renderer.setPixelRatio(1);renderer.setClearColor(0x101820);
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  const scene=new T.Scene(),geometry=new T.BoxGeometry(),material=new T.MeshBasicMaterial({color:0x33aa77});
  const mesh=new T.Mesh(geometry,material);scene.add(mesh);mesh.frustumCulled=false;
  const cameras=[new T.OrthographicCamera(-2,2,2,-2,.1,20),new T.PerspectiveCamera(50,1,.1,20)];
  cameras.forEach((c,i)=>{c.name=`camera-${i}`;c.position.set(i,0,5);c.lookAt(0,0,0);});
  const events=[],frames=[],worldAlias=mesh.matrixWorld.elements,modelViewAlias=mesh.modelViewMatrix.elements;
  mesh.onBeforeRender=function(r,s,c,g,m){
    check.equal(this,mesh);check.equal(r,renderer);check.equal(s,scene);check.equal(g,geometry);check.equal(m,material);
    const stale=this.matrixWorld.elements[12];this.position.x+=.125;
    check.equal(this.matrixWorld.elements[12],stale);
    const refreshed=this.getWorldPosition(new T.Vector3()).x;check.near(refreshed,this.position.x);
    events.push(['object-before',c.name,stale,refreshed]);
  };
  material.onBeforeRender=function(r,s,c,g,o){
    check.equal(this,material);check.equal(o,mesh);
    const expected=new T.Matrix4().multiplyMatrices(c.matrixWorldInverse,mesh.matrixWorld);
    expected.elements.forEach((v,i)=>check.near(mesh.modelViewMatrix.elements[i],v));
    events.push(['material-before',c.name,...mesh.modelViewMatrix.elements]);
  };
  mesh.onAfterRender=function(r,s,c){events.push(['object-after',c.name,this.position.x]);};
  try{
    for(const camera of cameras){
      renderer.render(scene,camera);const pixels=new Uint8Array(64*64*4);
      gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      check.equal(gl.getError(),gl.NO_ERROR);check.equal(mesh.matrixWorld.elements,worldAlias);check.equal(mesh.modelViewMatrix.elements,modelViewAlias);
      frames.push({pixels:[...pixels],png:canvas.toDataURL(),world:[...worldAlias]});
    }
    check.deep(events.map(e=>e[0]),['object-before','material-before','object-after','object-before','material-before','object-after']);
    check.near(mesh.position.x,.25);
    return {events,frames,rendererName};
  }finally{
    geometry.dispose();material.dispose();renderer.dispose();
    T.release?.(scene);for(const c of cameras)T.release?.(c);
  }
}
