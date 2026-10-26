import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { analyzeCandidateProfile } from './candidate-profile-analysis.mjs';
import { createCapturedFrameResolver, sourceHash } from './candidate-profile-sources.mjs';

assert(process.argv[2] && process.argv[3] && process.argv.length === 4, 'Usage: node scripts/apps/candidate-profile-analyze.mjs CAPTURE_ROOT FRESH_ANALYSIS_OUT');
const root = await fs.realpath(path.resolve(process.argv[2])), out = path.resolve(process.argv[3]);
await fs.mkdir(path.dirname(out), { recursive: true }); await fs.mkdir(out, { recursive: false });
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json')));
const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = (...args) => execFileSync('git', args, { cwd: toolRoot, encoding: 'utf8' }).trim();
const analysisFiles = ['scripts/apps/candidate-profile-analyze.mjs', 'scripts/apps/candidate-profile-analysis.mjs', 'scripts/apps/candidate-profile-sources.mjs', 'package-lock.json'];
const analysisTool = { sha: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain', '--untracked-files=normal')), node: process.version,
 hashes: Object.fromEntries(await Promise.all(analysisFiles.map(async file => [file, sourceHash(await fs.readFile(path.join(toolRoot, file)))]))) };
const summary = { captureToolSha: manifest.sourceBefore?.tooling.sha ?? null, analysisTool, candidateSha: manifest.candidateSha,
 captureStatus: manifest.status, classification: 'diagnostic-attribution-only', requestedSamplingIntervalUs: manifest.config.samplingIntervalUs,
 scope: 'Exclusive samples and overlapping inclusive call trees; not a CPU speedup estimate, primary quantile, GPU measurement or FPS.',
 runs: [], unprocessed: [] };
for (const entry of manifest.runs) {
 if (entry.status !== 'captured') { summary.unprocessed.push({ ...entry, reason: 'Failed or incomplete capture retained without attribution' }); continue; }
 const run = path.resolve(root, entry.directory); assert(run.startsWith(root + path.sep), 'Run escaped capture directory');
 const runManifest = JSON.parse(await fs.readFile(path.join(run, 'profile-manifest.json')));
 const profile = JSON.parse(await fs.readFile(path.join(run, 'profile.cpuprofile')));
 const { resolve, coverage, sources } = await createCapturedFrameResolver(run, runManifest.origin);
 const analysis = await analyzeCandidateProfile(profile, resolve);
 const file = `${entry.round}-${entry.engine}.json`;
 await fs.writeFile(path.join(out, file), JSON.stringify({ ...analysis, analysisTool, captureToolSha: summary.captureToolSha, engine: entry.engine, round: entry.round, sourceScriptCoverage: coverage, capturedSources: sources }, null, 2) + '\n');
 summary.runs.push({ engine: entry.engine, round: entry.round, file, samples: analysis.samples, durationMs: analysis.durationMs,
  weightedMs: analysis.weightedMs, activeMs: analysis.activeMs, buckets: analysis.buckets, contextBuckets: analysis.contextBuckets,
  sourceCoverage: analysis.sourceCoverage, sampleGapsUs: analysis.sampleGapsUs });
}
assert(summary.runs.length > 0, 'No complete profiles to analyze');
assert.equal(git('rev-parse', 'HEAD'), analysisTool.sha, 'Analyzer commit changed during attribution');
for (const [file, expected] of Object.entries(analysisTool.hashes)) assert.equal(sourceHash(await fs.readFile(path.join(toolRoot, file))), expected, 'Analyzer bytes changed: ' + file);
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ runs: summary.runs.length, unprocessed: summary.unprocessed.length, classification: summary.classification }));
