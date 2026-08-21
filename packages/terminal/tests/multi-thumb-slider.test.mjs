import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createMultiThumbSlider } from '../dist/multi-thumb-slider.js';

test('terminal multi-thumb slider owns constrained value and thumb keys', () => {
  const slider = unwrap(createMultiThumbSlider({ thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValues: [2, 8], policies: { minGap: 2 } }));
  slider.handleKeyboardInput({ key: 'end' }); slider.handleKeyboardInput({ key: 'tab' }); slider.handleKeyboardInput({ key: 'right' });
  assert.deepEqual(slider.getSnapshot().state.ticks, [6, 9]); assert.equal(slider.getSnapshot().state.cursor.current, 'high');
});
