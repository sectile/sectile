import {
  execFile as execFileCallback,
  execFileSync,
  spawnSync,
} from 'node:child_process';
import { existsSync } from 'node:fs';
import { win32 } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFileCallback);
const packageManagerCLIPaths = Object.freeze({
  npm: Object.freeze(['node_modules/npm/bin/npm-cli.js']),
  pnpm: Object.freeze([
    'node_modules/corepack/dist/pnpm.js',
    'node_modules/pnpm/bin/pnpm.cjs',
    'node_modules/pnpm/bin/pnpm.js',
  ]),
});

export function resolvePortableCommand(command, args = [], options = {}) {
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32' || packageManagerCLIPaths[command] === undefined) {
    return Object.freeze({ command, args: Object.freeze([...args]) });
  }

  const environment = options.env ?? process.env;
  const node = environment.npm_node_execpath ?? options.nodePath ?? process.execPath;
  const activeManager = environment.npm_config_user_agent?.split('/')[0];
  let cli = activeManager === command ? environment.npm_execpath : undefined;
  if (cli === undefined) {
    const exists = options.exists ?? existsSync;
    const searchRoots = [
      win32.dirname(node),
      ...(environment.Path ?? environment.PATH ?? '').split(win32.delimiter).filter(Boolean),
    ];
    cli = [...new Set(searchRoots)]
      .flatMap((root) => packageManagerCLIPaths[command].map((path) => win32.join(root, path)))
      .find((path) => exists(path));
  }
  if (cli === undefined) {
    throw new Error(
      `Cannot locate the ${command} JavaScript CLI for Windows. Run this script through ${command} or expose its installation directory on PATH.`,
    );
  }
  return Object.freeze({ command: node, args: Object.freeze([cli, ...args]) });
}

export function spawnSyncPortable(command, args = [], options = {}) {
  const resolved = resolvePortableCommand(command, args, { env: options.env });
  return spawnSync(resolved.command, resolved.args, options);
}

export function execFileSyncPortable(command, args = [], options = {}) {
  const resolved = resolvePortableCommand(command, args, { env: options.env });
  return execFileSync(resolved.command, resolved.args, options);
}

export function execFilePortable(command, args = [], options = {}) {
  const resolved = resolvePortableCommand(command, args, { env: options.env });
  return execFileAsync(resolved.command, resolved.args, options);
}
