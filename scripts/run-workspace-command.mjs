import { withArtifactSession } from './lib/artifact-session.mjs';
import { runCompact } from './lib/compact-process.mjs';
import { root } from './lib/repository.mjs';

const separator = process.argv.indexOf('--', 2);
if (separator < 3 || separator === process.argv.length - 1) {
  throw new Error('usage: run-workspace-command.mjs <label> -- <command> [...args]');
}
const label = process.argv.slice(2, separator).join(' ');
const [command, ...args] = process.argv.slice(separator + 1);
const status = await withArtifactSession(label, () => runCompact({
  args,
  command,
  cwd: root,
  label,
  verbose: process.env.SECTILE_VERBOSE === '1',
}));
process.exitCode = status;
