import assert from 'node:assert/strict';
import { win32 } from 'node:path';
import test from 'node:test';
import { resolvePortableCommand } from './lib/portable-process.mjs';

test('Windows package-manager shims resolve to JavaScript CLIs', () => {
  const node = 'C:\\runtime\\node.exe';
  const pnpm = resolvePortableCommand('pnpm', ['run', 'build'], {
    env: {
      npm_config_user_agent: 'pnpm/11.24.0 npm/? node/v24.18.0 win32 x64',
      npm_execpath: 'C:\\runtime\\pnpm.cjs',
      npm_node_execpath: node,
    },
    platform: 'win32',
  });
  assert.deepEqual(pnpm, {
    command: node,
    args: ['C:\\runtime\\pnpm.cjs', 'run', 'build'],
  });

  const npmCLI = win32.join('C:\\runtime', 'node_modules/npm/bin/npm-cli.js');
  const npm = resolvePortableCommand('npm', ['pack'], {
    env: { npm_node_execpath: node, Path: 'C:\\tools;C:\\runtime' },
    exists: (path) => path === npmCLI,
    platform: 'win32',
  });
  assert.deepEqual(npm, { command: node, args: [npmCLI, 'pack'] });
});

test('native commands remain direct on macOS and Windows', () => {
  assert.deepEqual(resolvePortableCommand('pnpm', ['verify'], { platform: 'darwin' }), {
    command: 'pnpm',
    args: ['verify'],
  });
  assert.deepEqual(resolvePortableCommand('git', ['status'], { platform: 'win32' }), {
    command: 'git',
    args: ['status'],
  });
});
