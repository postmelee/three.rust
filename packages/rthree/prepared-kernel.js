import {evaluateFacade} from './facade-kernel.js';
export function evaluateVersions(d,ops,count){
 evaluateFacade(d,ops,count);
 for(let i=0;i<count;i++){const b=ops[i*7]*64,mask=d[b+51];if(mask&1)d[b+55]++;if(mask&2)d[b+56]++;}
}
export function evaluatePass(d,p){
 const {meta:m,output:o,camera:c,order}=p,n=m.length/16;let count=0,resources=0;
 for(let i=0;i<n;i++){
  const k=i*16,slot=m[k],parent=m[k+2];
  if(!Number.isInteger(slot)||slot<1||slot>=d.length/64||d[slot*64+50]!==m[k+1]||m[k+1]<=0||!Number.isInteger(parent)||parent<0||parent>i)throw Error('rthree invalid prepared plan');
 }
 for(let i=0;i<n;i++){
  const k=i*16,b=m[k]*64+32,q=i*32,parent=m[k+2],visible=!!m[k+3]&&(!parent||!!o[(parent-1)*32+27]),layer=!!(m[k+4]&c[56]);
  o[q+26]=m[k+5]===1&&layer?m[k+6]:parent?o[(parent-1)*32+26]:0;o[q+27]=+visible;o[q+28]=0;
  if(!visible||!layer||m[k+5]!==2)continue;
  const x=m[k+8],y=m[k+9],z=m[k+10],w=1/(d[b+3]*x+d[b+7]*y+d[b+11]*z+d[b+15]);
  const vx=d[b]*x+d[b+4]*y+d[b+8]*z+d[b+12],vy=d[b+1]*x+d[b+5]*y+d[b+9]*z+d[b+13],vz=d[b+2]*x+d[b+6]*y+d[b+10]*z+d[b+14];
  const cx=vx*w,cy=vy*w,cz=vz*w;
  let scale=0;for(let col=0;col<3;col++){const a=b+col*4;scale=Math.max(scale,d[a]*d[a]+d[a+1]*d[a+1]+d[a+2]*d[a+2]);}
  const radius=m[k+11]*Math.sqrt(scale);let culled=false;
  if(m[k+15])for(let plane=0;plane<6;plane++){const a=32+plane*4;if(c[a]*cx+c[a+1]*cy+c[a+2]*cz+c[a+3]<-radius){culled=true;break;}}
  if(culled)continue;p.resources[resources++]=i;o[q+28]=1;if(!m[k+14])continue;
  const vw=d[b+3]*x+d[b+7]*y+d[b+11]*z+d[b+15];o[q+25]=(c[18]*vx+c[22]*vy+c[26]*vz+c[30]*vw)*(c[58]?-1:1);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)o[q+col*4+row]=c[row]*d[b+col*4]+c[4+row]*d[b+col*4+1]+c[8+row]*d[b+col*4+2]+c[12+row]*d[b+col*4+3];
  const a=o[q],b1=o[q+1],cc=o[q+2],e=o[q+4],f=o[q+5],g=o[q+6],h=o[q+8],ii=o[q+9],j=o[q+10];
  const t11=j*f-g*ii,t12=g*h-j*e,t13=ii*e-f*h,det=a*t11+b1*t12+cc*t13;
  if(det===0)o.fill(0,q+16,q+25);else {const inv=1/det;o[q+16]=t11*inv;o[q+17]=t12*inv;o[q+18]=t13*inv;o[q+19]=(cc*ii-j*b1)*inv;o[q+20]=(j*a-cc*h)*inv;o[q+21]=(b1*h-ii*a)*inv;o[q+22]=(g*b1-cc*f)*inv;o[q+23]=(cc*e-g*a)*inv;o[q+24]=(f*a-b1*e)*inv;}
  order[count++]=i;
 }
 if(c[57])order.subarray(0,count).sort((a,b)=>{
  const x=a*16,y=b*16;
  if(m[x+13]!==m[y+13])return m[x+13]-m[y+13];
  if(o[a*32+26]!==o[b*32+26])return o[a*32+26]-o[b*32+26];
  if(m[x+6]!==m[y+6])return m[x+6]-m[y+6];
  if(!m[x+13]&&m[x+12]!==m[y+12])return m[x+12]-m[y+12];
  if(o[a*32+25]!==o[b*32+25])return (o[a*32+25]-o[b*32+25])*(m[x+13]?-1:1);
  return m[x+7]-m[y+7];
 });
 c[59]=resources;return count;
}
