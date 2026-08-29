import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedFailureOutput } from './lib/compact-process.mjs';
import { parseWorkspaceCommandArguments } from './lib/workspace-command.mjs';

test('failure output keeps the diagnostic tail without flooding the terminal', () => {
  const output = `${'noise\n'.repeat(10_000)}actionable failure\n`;
  const bounded = boundedFailureOutput(output, 512);
  assert.ok(bounded.length < 600);
  assert.match(bounded, /^… \d+ characters omitted …/u);
  assert.match(bounded, /actionable failure/u);
});

test('workspace commands can opt into inherited interactive output', () => {
  assert.deepEqual(
    parseWorkspaceCommandArguments(['workspace-build', '--', 'pnpm', 'run', 'build:workspace']),
    {
      args: ['run', 'build:workspace'],
      command: 'pnpm',
      label: 'workspace-build',
      verbose: false,
    },
  );
  assert.deepEqual(
    parseWorkspaceCommandArguments([
      '--verbose',
      'package-publication',
      '--',
      'pnpm',
      'run',
      'publish:packages:local',
    ]),
    {
      args: ['run', 'publish:packages:local'],
      command: 'pnpm',
      label: 'package-publication',
      verbose: true,
    },
  );
});
