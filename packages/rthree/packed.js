// D control: exact same arena layout, synchronization and materialization as Rust.
// JS computes instead of Wasm; no call into upstream Matrix4.
export function updatePacked(d,n,force){
 d[48]=force?1:0;
 for(let i=1;i<=n;i++){
  const b=i*64,p=d[b+14]*64,flags=d[b+15],auto=!!(flags&1);
  if(auto){
   const x=d[b+3],y=d[b+4],z=d[b+5],w=d[b+6],x2=x+x,y2=y+y,z2=z+z;
   const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
   const sx=d[b+7],sy=d[b+8],sz=d[b+9],m=b+16;
   d[m]=(1-(yy+zz))*sx;d[m+1]=(xy+wz)*sx;d[m+2]=(xz-wy)*sx;d[m+3]=0;
   d[m+4]=(xy-wz)*sy;d[m+5]=(1-(xx+zz))*sy;d[m+6]=(yz+wx)*sy;d[m+7]=0;
   d[m+8]=(xz+wy)*sz;d[m+9]=(yz-wx)*sz;d[m+10]=(1-(xx+yy))*sz;d[m+11]=0;
   d[m+12]=d[b];d[m+13]=d[b+1];d[m+14]=d[b+2];d[m+15]=1;
   if(d[b+13]){const px=d[b+10],py=d[b+11],pz=d[b+12];d[m+12]+=px-d[m]*px-d[m+4]*py-d[m+8]*pz;d[m+13]+=py-d[m+1]*px-d[m+5]*py-d[m+9]*pz;d[m+14]+=pz-d[m+2]*px-d[m+6]*py-d[m+10]*pz;}
  }
  const changed=auto||!!(flags&4)||!!d[p+48];
  if(changed&&(flags&2)){
   if(i===1&&!d[b+49]){for(let j=0;j<16;j++)d[b+32+j]=d[b+16+j];}
   else for(let col=0;col<4;col++)for(let row=0;row<4;row++)d[b+32+col*4+row]=d[p+32+row]*d[b+16+col*4]+d[p+36+row]*d[b+17+col*4]+d[p+40+row]*d[b+18+col*4]+d[p+44+row]*d[b+19+col*4];
  }
  d[b+48]=changed?1:0;if(changed)d[b+15]=flags&~4;
 }
}
