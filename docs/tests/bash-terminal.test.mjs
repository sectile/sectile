import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SHELL_VIRTUAL_TERMINAL,
  writeShellVirtualTerminal,
} from '../.vitepress/theme/bash-terminal-bridge.ts';

test('Bash terminal renders only the interactive shell virtual terminal', () => {
  const writes = [];
  const terminal = { write: (buffer) => writes.push([...buffer]) };

  assert.equal(writeShellVirtualTerminal(terminal, new Uint8Array([71, 74, 52]), 7), false);
  assert.deepEqual(writes, []);

  assert.equal(
    writeShellVirtualTerminal(terminal, new Uint8Array([117, 115, 101, 114]), SHELL_VIRTUAL_TERMINAL),
    true,
  );
  assert.deepEqual(writes, [[117, 115, 101, 114]]);
});
