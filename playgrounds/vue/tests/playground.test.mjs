import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';

test('Vue playground composes Checkbox through its public package subpath', () => {
  assert.equal(CheckboxRoot.name, 'SectileCheckboxRoot');
  assert.equal(CheckboxIndicator.name, 'SectileCheckboxIndicator');
});
