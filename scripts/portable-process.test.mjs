import assert from 'node:assert/strict';
import { win32 } from 'node:path';
import test from 'node:test';
import { resolvePortableCommand } from '../tools/tooling/portable-process.mjs';

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

test('active package-manager CLIs are reused without relying on PATH', () => {
  const node = '/runtime/node';
  const cli = '/runtime/pnpm.cjs';
  for (const platform of ['linux', 'darwin']) {
    assert.deepEqual(resolvePortableCommand('pnpm', ['verify'], {
      env: {
        npm_config_user_agent: 'pnpm/11.24.0 npm/? node/v24.21.0 linux x64',
        npm_execpath: cli,
        npm_node_execpath: node,
      },
      platform,
    }), {
      command: node,
      args: [cli, 'verify'],
    });
  }
});

test('commands without an active package-manager CLI remain direct', () => {
  assert.deepEqual(resolvePortableCommand('pnpm', ['verify'], { platform: 'darwin' }), {
    command: 'pnpm',
    args: ['verify'],
  });
  assert.deepEqual(resolvePortableCommand('git', ['status'], { platform: 'win32' }), {
    command: 'git',
    args: ['status'],
  });
});
