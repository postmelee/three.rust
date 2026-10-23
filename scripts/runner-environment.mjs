import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import os from 'node:os';
const out=process.argv[2]||'work/gpu';mkdirSync(out,{recursive:true});
function command(file,args){try{return {available:true,output:execFileSync(file,args,{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}).trim()};}catch(e){return {available:false,reason:e.code||`exit ${e.status}`};}}
const info={date:new Date().toISOString(),platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0],logicalCpus:os.cpus().length,totalMemory:os.totalmem(),nvidia:command('nvidia-smi',['--query-gpu=name,driver_version,pci.bus_id,memory.total,temperature.gpu,pstate','--format=csv']),pci:command('lspci',['-nnk']),glx:command('glxinfo',['-B']),vulkan:command('vulkaninfo',['--summary'])};
for(const [key,path] of [['cpuQuota','/sys/fs/cgroup/cpu.max'],['memoryLimit','/sys/fs/cgroup/memory.max']])try{info[key]=readFileSync(path,'utf8').trim();}catch{info[key]='unavailable';}
writeFileSync(`${out}/runner.json`,JSON.stringify(info,null,2));console.log('Recorded available hardware/driver observations; browser hardware use must still be verified.');
