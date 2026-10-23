import {composePacked} from './packed.js';

// Same indexed state, precision, dirty rules and operation order as facade.rs.
export function evaluateFacade(d,ops,count){
 const valid=(slot,generation)=>slot>0&&slot<d.length/64&&generation>0&&d[slot*64+50]===generation;
 for(let i=0;i<count;i++){
  const k=i*7,id=ops[k],parent=ops[k+2],inherit=ops[k+5];
  if(!valid(id,ops[k+1])||id===parent||(parent&&!valid(parent,ops[k+3]))||ops[k+4]>1||ops[k+6]>1||inherit>i||(inherit&&ops[(inherit-1)*7]!==parent))throw Error('rthree invalid facade operation');
 }
 for(let i=0;i<count;i++){
  const k=i*7,b=ops[k]*64,p=ops[k+2]*64,flags=d[b+15],local=!!ops[k+6],auto=!!(flags&1)||local;
  let mask=0;
  if(auto&&d[b+54]){composePacked(d,b);d[b+54]=0;mask|=1;}
  if(local){d[b+15]=flags|4;d[b+51]=mask;continue;}
  const changed=auto||!!(flags&4)||!!ops[k+4]||!!(ops[k+5]&&d[p+48]);
  if(changed&&(flags&2)){
   if(!d[b+49]){for(let j=0;j<16;j++)d[b+32+j]=d[b+16+j];}
   else for(let col=0;col<4;col++)for(let row=0;row<4;row++)d[b+32+col*4+row]=d[p+32+row]*d[b+16+col*4]+d[p+36+row]*d[b+17+col*4]+d[p+40+row]*d[b+18+col*4]+d[p+44+row]*d[b+19+col*4];
   mask|=2;
  }
  d[b+48]=changed?1:0;d[b+51]=mask;if(changed)d[b+15]=flags&~4;
 }
}
