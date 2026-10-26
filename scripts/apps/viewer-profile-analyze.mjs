import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createCapturedFrameResolver, sourceHash } from './candidate-profile-sources.mjs';
import { analyzeCandidateProfile } from './candidate-profile-analysis.mjs';
import { createViewerSourceMapResolver } from './viewer-profile-source-maps.mjs';
import { analyzeViewerProfileRuns, viewerAnalysisRedactor } from './viewer-profile-analysis-runs.mjs';

assert(process.argv.length === 4, 'Usage: node scripts/apps/viewer-profile-analyze.mjs CAPTURE_ROOT NEW_ANALYSIS_OUT');
const root = await fs.realpath(path.resolve(process.argv[2])), out = path.resolve(process.argv[3]); await fs.mkdir(out, { recursive: false });
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json')));
assert(manifest.kind.startsWith('viewer-profile')); assert.equal(manifest.configuration.profiling, true);
const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), git = (...args) => execFileSync('git', args, { cwd: toolRoot, encoding: 'utf8' }).trim();
const files = ['scripts/apps/viewer-profile-analyze.mjs', 'scripts/apps/viewer-profile-analysis-runs.mjs', 'scripts/apps/viewer-profile-source-maps.mjs', 'scripts/apps/viewer-adapter.mjs', 'scripts/apps/candidate-profile-sources.mjs', 'scripts/apps/candidate-profile-analysis.mjs', 'package-lock.json'];
const analysisTool = { sha: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain', '--untracked-files=normal')), hashes: Object.fromEntries(await Promise.all(files.map(async file => [file, sourceHash(await fs.readFile(path.join(toolRoot, file)))]))) };
const summary = { captureToolSha: manifest.sourceBefore?.tooling.sha, analysisTool, candidateSha: manifest.candidateSha, group: manifest.group, captureStatus: manifest.status,
 scope: 'Exclusive diagnostic sampled weight and overlapping inclusive stacks; never primary callback CPU, GPU timing or FPS.',
 sourceScope: 'Generated JS bytes and Wasm indices are verified first. Only exact source-map segments with captured prepared output and sourcesContent/build-input provenance resolve to a unique original AST function. Other positions retain generated attribution with explicit fallback reasons; no minified-name inference or original-r176 map substitution.', runs: [], unprocessed: [] };
const batch = await analyzeViewerProfileRuns({ root, out, entries: manifest.runs, redact: viewerAnalysisRedactor(root, out, toolRoot),
 provenance: { analysisTool, captureToolSha: summary.captureToolSha, candidateSha: summary.candidateSha },
 analyze: async ({ entry, run, profile, file }) => {
 const pin = JSON.parse(await fs.readFile(path.join(run, 'profile-manifest.json')));
 const base = await createCapturedFrameResolver(run, pin.origin), mapped = await createViewerSourceMapResolver(root, run, pin.origin, base), analysis = await analyzeCandidateProfile(profile, mapped.resolve);
 const verifiedSourceFamilies = {};
 for (const node of analysis.exclusive) if (node.sourceStatus === 'verified-js') {
  const file = node.source?.file ?? '';
  const family = /(?:^|\/)dat\.gui\//.test(file) ? 'dat.gui verified source' : /^(?:adapted|viewer)\/src\//.test(file) ? 'Viewer app verified source' : 'other verified JavaScript';
  verifiedSourceFamilies[family] = (verifiedSourceFamilies[family] ?? 0) + node.selfMs;
 }
 return { report: { ...analysis, scenario: entry.scenario, engine: entry.engine, round: entry.round, analysisTool, captureToolSha: summary.captureToolSha, sourceScriptCoverage: base.coverage, sourceMapCoverage: mapped.coverage, verifiedSourceFamilies, capturedSources: base.sources },
  summary: { scenario: entry.scenario, engine: entry.engine, round: entry.round, file, samples: analysis.samples, durationMs: analysis.durationMs, activeMs: analysis.activeMs, buckets: analysis.buckets, contextBuckets: analysis.contextBuckets, sourceCoverage: analysis.sourceCoverage, sourceMapCoverage: mapped.coverage, verifiedSourceFamilies, sampleGapsUs: analysis.sampleGapsUs } };
} });
const { exitCode, ...results } = batch; Object.assign(summary, results);
assert.equal(git('rev-parse', 'HEAD'), analysisTool.sha);
for (const [file, expected] of Object.entries(analysisTool.hashes)) assert.equal(sourceHash(await fs.readFile(path.join(toolRoot, file))), expected);
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ status: summary.status, runs: summary.runs.length, unprocessed: summary.unprocessed.length, analysisFailures: summary.analysisFailures.length, qualification: false }));
process.exitCode = exitCode;
