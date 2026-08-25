import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function tableNames(source, contract) {
  const body = new RegExp('#### `' + contract + '`([\\s\\S]*?)(?:\\n#### |\\n### |\\n## )', 'u')
    .exec(source)?.[1];
  assert.notEqual(body, undefined, contract);
  return [...body.matchAll(/^\| `([^`]+)` \|/gmu)].map((match) => match[1]);
}

test('API contracts use semantic order instead of declaration order', async () => {
  const pinInput = await readFile(new URL('../components/pin-input.md', import.meta.url), 'utf8');

  assert.deepEqual(tableNames(pinInput, 'PinInputRootProps'), [
    'length',
    'modelValue',
    'defaultValue',
    'mask',
    'otp',
    'disabled',
    'readonly',
    'required',
    'name',
    'form',
    'label',
    'policies',
    'as',
    'asChild',
  ]);
  assert.deepEqual(tableNames(pinInput, 'PinInputInputSlotProps'), [
    'index',
    'value',
    'character',
    'complete',
    'disabled',
    'readonly',
  ]);
  assert.deepEqual(tableNames(pinInput, 'PinInputRoot'), [
    'update:modelValue',
    'complete',
  ]);
});
