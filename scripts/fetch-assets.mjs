import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync('fixtures/provenance.json'));
for(const {path,sha256} of manifest.files.filter(f=>f.path.endsWith('.glb'))){
 mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});
 if(!existsSync(path))execFileSync('curl',['--fail','--location','--silent','--show-error',`https://raw.githubusercontent.com/mrdoob/three.js/${manifest.commit}/examples/models/gltf/Soldier.glb`,'-o',path]);
 if(createHash('sha256').update(readFileSync(path)).digest('hex')!==sha256)throw Error('asset hash mismatch');
}
