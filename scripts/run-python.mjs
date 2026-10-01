import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const candidates = process.env.REHABMIND_PYTHON
  ? [[process.env.REHABMIND_PYTHON, []]]
  : process.platform === 'win32'
    ? [['py', ['-3']], ['python', []], [join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'), []]]
    : [['python3', []], ['python', []]];

for (const [command, prefix] of candidates) {
  const probe = spawnSync(command, [...prefix, '--version'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) continue;
  const run = spawnSync(command, [...prefix, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(run.status ?? 1);
}
console.error('Python 3 is required to generate the workbook data and 3D assets.');
process.exit(1);
