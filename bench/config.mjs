export const ENGINE_NAMES=['original','js','wasm','packed-js','facade-js','facade-wasm','prepared-js','prepared-wasm'];
export const SCENE_NAMES=['cubes','skinning','shader','small','hierarchy'];
export function hardwareRenderer(renderer){
 if(typeof renderer!=='string'||!renderer.trim())throw Error('Hardware renderer unavailable');
 if(/swiftshader|llvmpipe|lavapipe|softpipe|software|microsoft basic|mesa offscreen|\bwarp\b/i.test(renderer))throw Error(`Hardware mode rejected software renderer: ${renderer}`);
 if(!/nvidia|geforce|quadro|tesla|\bamd\b|radeon|\bati\b|intel|apple|adreno|mali|powervr/i.test(renderer))throw Error(`Hardware renderer is unknown/masked; inspect the driver before measuring: ${renderer}`);
 return renderer;
}
export function configuration(argv){
 const opt={};const allowed=['out','scenarios','engines','repeats','warmup','samples','mode','width','height','headless','angle','profile','gpu','timings'];
 for(const item of argv){const i=item.indexOf('=');if(i<1)throw Error('Expected key=value');const key=item.slice(0,i);if(!allowed.includes(key)||key in opt)throw Error(`Unknown/duplicate option: ${key}`);opt[key]=item.slice(i+1);}
 const integer=(key,fallback,min=1)=>{const n=Number(opt[key]??fallback);if(!Number.isSafeInteger(n)||n<min)throw Error(`Invalid ${key}`);return n;};
 const bool=(key,fallback=false)=>{if(opt[key]===undefined)return fallback;if(!['true','false'].includes(opt[key]))throw Error(`Invalid ${key}`);return opt[key]==='true';};
 const list=(key,fallback,names)=>{const a=(opt[key]??fallback).split(',');if(new Set(a).size!==a.length||!a.every(x=>names.includes(x)))throw Error(`Invalid ${key}`);return a;};
 if(opt.mode!==undefined&&!['hardware','cloud'].includes(opt.mode))throw Error('Invalid mode');
 const hardware=opt.mode==='hardware',headless=bool('headless',!hardware);
 if(opt.angle!==undefined&&!['gl','vulkan','d3d11','metal'].includes(opt.angle))throw Error('Invalid angle backend');
 if(!hardware&&opt.angle)throw Error('angle is a hardware-only option');
 const args=hardware?(opt.angle?['--use-gl=angle',`--use-angle=${opt.angle}`]:[]):['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 return {out:opt.out??'bench/results/m0',scenarios:list('scenarios',SCENE_NAMES.join(','),SCENE_NAMES),engines:list('engines','original',ENGINE_NAMES),repeats:integer('repeats',5),warmup:integer('warmup',30,0),samples:integer('samples',90,2),hardware,headless,args,viewport:{width:integer('width',hardware?1920:640),height:integer('height',hardware?1080:360)},profile:bool('profile'),gpu:bool('gpu'),timings:bool('timings')};
}
