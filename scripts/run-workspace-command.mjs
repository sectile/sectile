import { withArtifactSession } from './lib/artifact-session.mjs';
import { runCompact } from './lib/compact-process.mjs';
import { root } from './lib/repository.mjs';
import { parseWorkspaceCommandArguments } from './lib/workspace-command.mjs';

const { args, command, label, verbose } = parseWorkspaceCommandArguments(process.argv.slice(2));
const status = await withArtifactSession(label, () => runCompact({
  args,
  command,
  cwd: root,
  label,
  verbose: verbose || process.env.SECTILE_VERBOSE === '1',
}));
process.exitCode = status;
