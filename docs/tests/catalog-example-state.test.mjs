import assert from 'node:assert/strict';
import test from 'node:test';
import { multiThumbSliderExampleState } from '../.vitepress/theme/catalog-example-state.ts';

test('multi-thumb slider examples always construct a valid range state', () => {
  for (const scenario of ['two-thumb-range', 'three-thumb-thresholds', 'crossing-thumbs']) {
    const { thumbs, values, policies = {} } = multiThumbSliderExampleState(scenario);
    assert.equal(values.length, thumbs.length, `${scenario} must provide one value per thumb`);
    assert.ok(values.every(Number.isSafeInteger), `${scenario} values must be exact ticks`);
    if (policies.allowCross) continue;
    const minGap = policies.minGap ?? 0;
    for (let index = 1; index < values.length; index += 1) {
      assert.ok(values[index - 1] + minGap <= values[index], `${scenario} must preserve thumb order and minimum gap`);
    }
  }
});
