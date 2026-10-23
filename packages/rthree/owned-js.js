// Algorithm/layout matched JavaScript reference; no calls into Three.js math.
export function slerp(out,o,a,ai,b,bi,t){
 let x=a[ai],y=a[ai+1],z=a[ai+2],w=a[ai+3],u=b[bi],v=b[bi+1],q=b[bi+2],p=b[bi+3];
 if(w!==p||x!==u||y!==v||z!==q){let dot=x*u+y*v+z*q+w*p;if(dot<0){u=-u;v=-v;q=-q;p=-p;dot=-dot;}let s=1-t;
  if(dot<.9995){const theta=Math.acos(dot),sn=Math.sin(theta);s=Math.sin(s*theta)/sn;t=Math.sin(t*theta)/sn;x=x*s+u*t;y=y*s+v*t;z=z*s+q*t;w=w*s+p*t;}
  else{x=x*s+u*t;y=y*s+v*t;z=z*s+q*t;w=w*s+p*t;const f=1/Math.sqrt(x*x+y*y+z*z+w*w);x*=f;y*=f;z*=f;w*=f;}}
 out[o]=x;out[o+1]=y;out[o+2]=z;out[o+3]=w;
}
function multiply(out,o,a,ai,b,bi){for(let col=0;col<4;col++)for(let row=0;row<4;row++)out[o+col*4+row]=a[ai+row]*b[bi+col*4]+a[ai+4+row]*b[bi+col*4+1]+a[ai+8+row]*b[bi+col*4+2]+a[ai+12+row]*b[bi+col*4+3];}
function compose(out,o,p,b){const x=p[b+3],y=p[b+4],z=p[b+5],w=p[b+6],x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2,sx=p[b+7],sy=p[b+8],sz=p[b+9];
 out[o]=(1-(yy+zz))*sx;out[o+1]=(xy+wz)*sx;out[o+2]=(xz-wy)*sx;out[o+3]=0;out[o+4]=(xy-wz)*sy;out[o+5]=(1-(xx+zz))*sy;out[o+6]=(yz+wx)*sy;out[o+7]=0;out[o+8]=(xz+wy)*sz;out[o+9]=(yz-wx)*sz;out[o+10]=(1-(xx+yy))*sz;out[o+11]=0;out[o+12]=p[b];out[o+13]=p[b+1];out[o+14]=p[b+2];out[o+15]=1;}
export class OwnedJS {
 constructor(encoded){const d=encoded.data;Object.assign(this,{n:encoded.n,r:encoded.r,c:encoded.c});const {n,r,c}=this;let o=4;const take=k=>{const x=d.slice(o,o+k);o+=k;return x;};const parents=take(n),rest=take(n*10);this.inverse=take(n*16);this.roots=take(r*16);this.durations=take(c);this.tracks=[];
  for(let t=0;t<d[3];t++){const [clip,node,kind,k]=take(4);this.tracks.push({clip,node,kind,k,times:take(k),values:take(k*(kind===1?4:3))});}
  this.parents=new Float64Array(r*n);this.base=new Float64Array(r*n*10);for(let i=0;i<r;i++){this.parents.set(parents,i*n);this.base.set(rest,i*n*10);}this.pose=new Float64Array(this.base.length);this.world=new Float64Array(r*n*16);this.palette=new Float32Array(r*n*16);this.actions=new Float64Array(r*c*5);for(let i=0;i<r*c;i++)this.actions[i*5+2]=1;
  this.weights=new Float64Array(n*3);this.sample=new Float64Array(4);this.local=new Float64Array(16);this.steps=0;
 }
 commands(d){for(let b=0;b<d.length;b+=20){const type=d[b],rig=d[b+1],id=d[b+2],a=(rig*this.c+id)*5;
  if(type===0)this.actions.set(d.subarray(b+3,b+8),a);if(type===1)this.actions[a+1]=d[b+3];if(type===2)this.actions[a]=d[b+3];if(type===3)this.actions[a+3]=d[b+3];if(type===4)this.roots.set(d.subarray(b+2,b+18),rig*16);if(type===5)this.base.set(d.subarray(b+3,b+13),(rig*this.n+id)*10);if(type===6)this.parents[rig*this.n+id]=d[b+3];
 }}
 step(dt){const {n,r,c,pose,base,actions,world,palette,weights,sample,local}=this;for(let rig=0;rig<r;rig++){
  for(let ci=0;ci<c;ci++){const a=(rig*c+ci)*5,duration=this.durations[ci];if(!actions[a+3]){let t=actions[a]+dt*actions[a+2];if(actions[a+4]){if(t>=duration||t<0){t=Math.max(0,Math.min(duration,t));actions[a+3]=1;}}else t-=Math.floor(t/duration)*duration;actions[a]=t;}}
  pose.set(base.subarray(rig*n*10,(rig+1)*n*10),rig*n*10);weights.fill(0);
  for(const track of this.tracks){const a=(rig*c+track.clip)*5,w=actions[a+1];if(w===0)continue;const time=actions[a],{kind,node,times,values,k}=track,size=kind===1?4:3;let lo=0,hi=k-1;
   while(lo<hi){const mid=(lo+hi)>>>1;if(times[mid]<=time)lo=mid+1;else hi=mid;}const right=lo,left=Math.max(0,right-1);let mix=times[right]>times[left]?Math.max(0,Math.min(1,(time-times[left])/(times[right]-times[left]))):0;
   if(time>=times[k-1]){for(let j=0;j<size;j++)sample[j]=values[(k-1)*size+j];}else if(kind===1)slerp(sample,0,values,left*size,values,right*size,mix);else for(let j=0;j<size;j++)sample[j]=values[left*size+j]*(1-mix)+values[right*size+j]*mix;
   const wi=node*3+kind,old=weights[wi],total=old+w,b=(rig*n+node)*10+[0,3,7][kind];weights[wi]=total;
   if(!old){for(let j=0;j<size;j++)pose[b+j]=sample[j];}else if(kind===1)slerp(pose,b,pose,b,sample,0,w/total);else for(let j=0;j<size;j++)pose[b+j]=pose[b+j]*(1-w/total)+sample[j]*(w/total);
  }
  for(let node=0;node<n;node++){const b=(rig*n+node)*10;for(let kind=0;kind<3;kind++){const weight=weights[node*3+kind];if(weight>0&&weight<1){const o=b+[0,3,7][kind];if(kind===1)slerp(pose,o,pose,o,base,o,1-weight);else for(let j=0;j<3;j++)pose[o+j]=pose[o+j]*weight+base[o+j]*(1-weight);}}
   compose(local,0,pose,b);const m=(rig*n+node)*16,parent=this.parents[rig*n+node];if(parent<0)multiply(world,m,this.roots,rig*16,local,0);else multiply(world,m,world,(rig*n+parent)*16,local,0);multiply(palette,m,world,m,this.inverse,node*16);
  }
 }this.steps++;}
 buffers(){return {pose:this.pose,world:this.world,roots:this.roots,actions:this.actions,palette:this.palette};}
 dispose(){for(const key of Object.keys(this))if(ArrayBuffer.isView(this[key])||Array.isArray(this[key]))this[key]=null;}
}
