// Preserve the npm entry point; Python is the single report generator.
import {execFileSync} from 'node:child_process';
execFileSync(process.env.PYTHON||'python3',['tools/progress.py',...process.argv.slice(2)],{stdio:'inherit'});
