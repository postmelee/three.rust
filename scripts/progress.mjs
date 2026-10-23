import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/progress-source.mjs',...(process.argv.includes('--check')?['--check']:[])],{stdio:'inherit'});
execFileSync(process.env.PYTHON||'python3',['tools/progress.py',...process.argv.slice(2)],{stdio:'inherit'});
