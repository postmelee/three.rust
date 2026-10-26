import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createCapturedFrameResolver,sourceHash} from './candidate-profile-sources.mjs';
import {analyzeCandidateProfileCounts} from './candidate-profile-count-analysis.mjs';
import {createViewerSourceMapResolver} from './viewer-profile-source-maps.mjs';
import {analyzeViewerProfileRuns,viewerAnalysisRedactor} from './viewer-profile-analysis-runs.mjs';

assert(process.argv.length===5,'Usage: node scripts/apps/viewer-profile-count-analyze.mjs CAPTURE_ROOT RETAINED_WEIGHTED_ANALYSIS_ROOT NEW_COUNT_ANALYSIS_OUT');
const root=await fs.realpath(path.resolve(process.argv[2])),weightedRoot=await fs.realpath(path.resolve(process.argv[3])),out=path.resolve(process.argv[4]);await fs.mkdir(out,{recursive:false});
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'))),weightedSummaryBytes=await fs.readFile(path.join(weightedRoot,'summary.json')),weighted=JSON.parse(weightedSummaryBytes);
assert(manifest.kind.startsWith('viewer-profile'));assert.equal(manifest.configuration.profiling,true);assert(['analysis-complete','incomplete-invalid-profiles','incomplete-capture'].includes(weighted.status),'Bind a retained complete or explicitly failed weighted result before secondary counts');
assert(Array.isArray(weighted.runs)&&Array.isArray(weighted.analysisFailures)&&(weighted.runs.length||weighted.analysisFailures.length),'Retained weighted result has no raw profile evidence');
assert.match(manifest.sourceBefore?.tooling.sha??'',/^[a-f0-9]{40}$/);assert.match(manifest.candidateSha??'',/^[a-f0-9]{40}$/);
assert.equal(weighted.captureToolSha,manifest.sourceBefore?.tooling.sha);assert.equal(weighted.candidateSha,manifest.candidateSha);assert.equal(weighted.group,manifest.group);
const toolRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),git=(...args)=>execFileSync('git',args,{cwd:toolRoot,encoding:'utf8'}).trim();
const files=['scripts/apps/viewer-profile-count-analyze.mjs','scripts/apps/candidate-profile-count-analysis.mjs','scripts/apps/viewer-profile-analysis-runs.mjs','scripts/apps/viewer-profile-source-maps.mjs','scripts/apps/viewer-adapter.mjs','scripts/apps/candidate-profile-sources.mjs','scripts/apps/candidate-profile-analysis.mjs','package-lock.json'];
const analysisTool={sha:git('rev-parse','HEAD'),dirty:Boolean(git('status','--porcelain','--untracked-files=normal')),hashes:Object.fromEntries(await Promise.all(files.map(async file=>[file,sourceHash(await fs.readFile(path.join(toolRoot,file)))])))};
const weightedRecords=new Map(),weightedInputs=new Map([['summary.json',weightedSummaryBytes]]),key=row=>JSON.stringify([row.scenario,row.round,row.engine]);
for(const [status,entries]of [['attributed',weighted.runs],['analysis-failed',weighted.analysisFailures]])for(const row of entries){
 assert(!weightedRecords.has(key(row)),'Ambiguous retained weighted run');assert(typeof row.file==='string'&&row.file===path.basename(row.file)&&!row.file.includes('\\')&&!row.file.includes('..'),'Retained weighted report must use its public basename');const file=await fs.realpath(path.resolve(weightedRoot,row.file));assert(file.startsWith(weightedRoot+path.sep),'Retained weighted report escapes its root');
 const bytes=await fs.readFile(file),report=JSON.parse(bytes);assert.match(report.rawProfile?.sha256??'',/^[a-f0-9]{64}$/);assert.equal(report.rawProfile.integrity,'unchanged','Retained weighted raw bytes were not verified unchanged');
 weightedInputs.set(row.file,bytes);weightedRecords.set(key(row),{status,file:row.file,sha256:sourceHash(bytes),rawProfileSha256:report.rawProfile.sha256});
}
const historicalWeightedGate={status:weighted.status,summarySha256:sourceHash(weightedSummaryBytes),failedRuns:weighted.analysisFailures.length,verdictUnchanged:true,scope:'The retained strict weighted outcome remains unchanged; failures remain failures. Counts are a separate diagnostic observation, not repaired weighted attribution.'};
const summary={method:'counts-only-secondary',performanceQualification:false,captureToolSha:manifest.sourceBefore?.tooling.sha,analysisTool,candidateSha:manifest.candidateSha,group:manifest.group,captureStatus:manifest.status,historicalWeightedGate,
 scope:'All raw sample IDs counted once in original order with exact captured-source attribution. No time weights, milliseconds, sorting, filtering, normalization, FPS or speed claim.'};
const batch=await analyzeViewerProfileRuns({root,out,manifest,redact:viewerAnalysisRedactor(root,out,toolRoot),provenance:{method:summary.method,performanceQualification:false,analysisTool,historicalWeightedGate},analyze:async({entry,run,profile,file})=>{
 const previous=weightedRecords.get(key(entry));assert(previous,'This captured run has no retained weighted result');assert.equal(sourceHash(await fs.readFile(path.join(run,'profile.cpuprofile'))),previous.rawProfileSha256,'Raw profile differs from retained weighted result');
 const pin=JSON.parse(await fs.readFile(path.join(run,'profile-manifest.json'))),base=await createCapturedFrameResolver(run,pin.origin),mapped=await createViewerSourceMapResolver(root,run,pin.origin,base),analysis=await analyzeCandidateProfileCounts(profile,mapped.resolve),verifiedSourceFamilyHits={};
 for(const node of analysis.nodes)if(node.sourceStatus==='verified-js'){const file=node.source?.file??'',family=/(?:^|\/)dat\.gui\//.test(file)?'dat.gui verified source':/^(?:adapted|viewer)\/src\//.test(file)?'Viewer app verified source':'other verified JavaScript';verifiedSourceFamilyHits[family]=(verifiedSourceFamilyHits[family]??0)+node.selfHits;}
 return {report:{...analysis,scenario:entry.scenario,engine:entry.engine,round:entry.round,analysisTool,captureToolSha:summary.captureToolSha,historicalWeightedRun:previous,historicalWeightedGate,sourceScriptCoverage:base.coverage,sourceMapCoverage:mapped.coverage,verifiedSourceFamilyHits,capturedSources:base.sources},
  summary:{scenario:entry.scenario,engine:entry.engine,round:entry.round,file,method:analysis.method,performanceQualification:false,totalHits:analysis.totalHits,activeHits:analysis.activeHits,activeDenominatorExcludes:analysis.activeDenominatorExcludes,buckets:analysis.buckets,contextBuckets:analysis.contextBuckets,sourceCoverage:analysis.sourceCoverage,sourceMapCoverage:mapped.coverage,verifiedSourceFamilyHits,rawTiming:analysis.rawTiming,historicalWeightedRun:previous}};
}});
const {exitCode,...results}=batch;Object.assign(summary,results);
assert.equal(git('rev-parse','HEAD'),analysisTool.sha);for(const [file,expected]of Object.entries(analysisTool.hashes))assert.equal(sourceHash(await fs.readFile(path.join(toolRoot,file))),expected);
for(const [file,bytes]of weightedInputs)assert((await fs.readFile(path.join(weightedRoot,file))).equals(bytes),'Retained weighted evidence changed');summary.historicalWeightedIntegrity='unchanged';
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({method:summary.method,status:summary.status,runs:summary.runs.length,analysisFailures:summary.analysisFailures.length,performanceQualification:false,historicalWeightedGate:weighted.status}));process.exitCode=exitCode;
