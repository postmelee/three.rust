'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

async function main() {
  const [validatorPath, assetPath, outputPath] = process.argv.slice(2);
  if (!validatorPath || !assetPath || !outputPath) throw new Error('Usage: node task49-validate-content.cjs VALIDATOR_PACKAGE ASSET OUTPUT');
  const validator = require(path.resolve(validatorPath));
  const root = await fs.realpath(path.dirname(assetPath));
  const input = await fs.readFile(assetPath);
  const externalResources = [];
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const report = await validator.validateBytes(new Uint8Array(input), {
    uri: path.basename(assetPath),
    format: path.extname(assetPath).slice(1),
    maxIssues: 10000,
    externalResourceFunction: async uri => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) throw new Error('External scheme is not allowed');
      const file = await fs.realpath(path.resolve(root, decodeURIComponent(uri)));
      if (!file.startsWith(root + path.sep)) throw new Error('External resource leaves asset root');
      const data = await fs.readFile(file);
      externalResources.push({uri, bytes: data.byteLength});
      return new Uint8Array(data);
    }
  });
  const codeCounts = {};
  for (const message of report.issues.messages) codeCounts[message.code] = (codeCounts[message.code] || 0) + 1;
  const output = {
    schema: 1,
    validatorVersion: validator.version(),
    supportedExtensions: validator.supportedExtensions(),
    source: {asset: path.basename(assetPath), bytes: input.byteLength, sha256: crypto.createHash('sha256').update(input).digest('hex')},
    options: {maxIssues: 10000, ignoredIssues: [], onlyIssues: null, externalResourceFunction: 'Local-only, realpath-contained asset root; reads actual referenced resources'},
    startedAt,
    elapsedMs: performance.now() - started,
    elapsedScope: 'Validation execution only, not application performance',
    externalResources,
    codeCounts,
    report
  };
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', {flag:'wx'});
  console.log(JSON.stringify({asset:output.source.asset,validatorVersion:output.validatorVersion,elapsedMs:output.elapsedMs,issues:report.issues,codeCounts,externalResources:externalResources.length,externalBytes:externalResources.reduce((sum, x)=>sum+x.bytes,0)}, (key,value)=> key==='messages' ? undefined : value));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
