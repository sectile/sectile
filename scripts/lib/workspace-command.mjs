export function parseWorkspaceCommandArguments(input) {
  const separator = input.indexOf('--');
  if (separator < 1 || separator === input.length - 1) throw usageError();

  const header = input.slice(0, separator);
  const verbose = header[0] === '--verbose';
  const labelParts = header.slice(verbose ? 1 : 0);
  if (labelParts.length === 0 || labelParts.some((part) => part.startsWith('--'))) throw usageError();

  const [command, ...args] = input.slice(separator + 1);
  return Object.freeze({ args: Object.freeze(args), command, label: labelParts.join(' '), verbose });
}

function usageError() {
  return new Error('usage: run-workspace-command.mjs [--verbose] <label> -- <command> [...args]');
}
