import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { HISTORICAL_EDITOR_CANDIDATE, EDITOR_SOURCE_PIN, EDITOR_PROTOCOL_SETTINGS, validateEditorProtocol, resolveEditorProtocol, validateEditorProtocolConfiguration } from '../scripts/apps/editor-candidate-protocol.mjs';
const protocol = () => ({ schema:1, contract:'native-editor-e3-v1', editorSha:EDITOR_SOURCE_PIN, candidateSha:'a'.repeat(40), adoptionPolicy:'adoption-v1',
 scene:'Task46 native E3 RobotExpressive and E1 idle; unchanged callbacks, viewport and quality controls', settings:structuredClone(EDITOR_PROTOCOL_SETTINGS), outputPrefixes:{profile:'task49-editor-new-profile-',timing:'task49-editor-new-timing-'} });
test('historical default remains exact and refuses a new candidate without a protocol',async()=>{
 assert.equal((await resolveEditorProtocol('.',{kind:'timing',output:'work/test'})).candidateSha,HISTORICAL_EDITOR_CANDIDATE);
 await assert.rejects(resolveEditorProtocol('.',{kind:'timing',requestedSha:'a'.repeat(40),output:'work/test'}),/committed protocol/);
});
test('new protocol freezes source, thresholds, capture conditions and separate output paths',()=>{
 const p=protocol();assert.equal(validateEditorProtocol(p,'timing','work/task49-editor-new-timing-001').candidateSha,p.candidateSha);
 for(const change of [p=>p.candidateSha='bad',p=>p.editorSha='b'.repeat(40),p=>p.adoptionPolicy='looser',p=>p.settings.timing.full.warmup=1,p=>p.settings.profile.full.samplingIntervalUs=1000,p=>p.scene='different app',p=>p.outputPrefixes.profile=p.outputPrefixes.timing]){
  const changed=protocol();change(changed);assert.throws(()=>validateEditorProtocol(changed,'timing','work/task49-editor-new-timing-001'));
 }
 assert.throws(()=>validateEditorProtocol(p,'timing','work/task46-editor-old-001'),/dedicated prefix/);
 assert.throws(()=>validateEditorProtocol(p,'profile','work/task49-editor-new-timing-001'),/dedicated prefix/);
 assert.throws(()=>validateEditorProtocol(p,'timing','work/task49-editor-new-timing-001','b'.repeat(40)),/differs/);
});
test('runner drift is rejected for both full and smoke conditions',()=>{
 const resolved={evidence:{protocol:protocol()}};
 for(const kind of ['profile','timing'])for(const mode of ['full','smoke']){
  const configuration={mode,...EDITOR_PROTOCOL_SETTINGS[kind][mode]};validateEditorProtocolConfiguration(resolved,kind,configuration);
  configuration[Object.keys(EDITOR_PROTOCOL_SETTINGS[kind][mode])[0]]++;
  assert.throws(()=>validateEditorProtocolConfiguration(resolved,kind,configuration),/frozen protocol/);
 }
});
test('only exact committed task protocol bytes are accepted and recorded by hash',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'editor-protocol-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','pipe']});git('init','-q');
 const relative='mydocs/plans/task_m6_49_editor_protocol.json';await fs.mkdir(path.join(root,'mydocs/plans'),{recursive:true});
 const value=protocol();await fs.writeFile(path.join(root,relative),JSON.stringify(value)+'\n');git('add',relative);git('-c','user.name=Protocol Test','-c','user.email=test@example.invalid','commit','-qm','fixture');
 const args={kind:'timing',protocolPath:relative,output:'work/task49-editor-new-timing-001'};
 const resolved=await resolveEditorProtocol(root,args);assert.equal(resolved.candidateSha,value.candidateSha);assert.match(resolved.evidence.sha256,/^[a-f0-9]{64}$/);assert.equal(resolved.evidence.verifiedAtToolSha,git('rev-parse','HEAD').toString().trim());assert.deepEqual(resolved.files,[relative]);
 await fs.appendFile(path.join(root,relative),' ');await assert.rejects(resolveEditorProtocol(root,args),/Commit the exact/);
 await fs.writeFile(path.join(root,'unreviewed.json'),JSON.stringify(value));await assert.rejects(resolveEditorProtocol(root,{...args,protocolPath:'unreviewed.json'}),/approved task-plan location/);
});
