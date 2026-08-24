import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import {
  applyCarouselEvent,
  createCarouselState,
  getCarouselPosition,
  isCarouselRotationPaused,
} from '../../.verification-dist/carousel.js';
import {
  applyReferenceCarouselEvent,
  createReferenceCarouselState,
} from '../../.verification-dist/internal/reference/composites/carousel.js';
import { unwrap } from '../support.mjs';

test('carousel movement and pause authority match an independent reference', () => {
  const slides = createSequence(['a', 'b', 'c']);
  const events = [
    'next', 'previous', 'first', 'last', 'pause', 'resume', 'toggle-pause',
    { type: 'focus', id: 'b' },
    { type: 'pause-for', reason: 'hover' },
    { type: 'resume-for', reason: 'hover' },
  ];
  for (const current of [null, 'a', 'b', 'c']) {
    for (const paused of [false, true]) {
      for (const pauseReasons of [[], ['focus']]) {
        for (const event of events) {
          const actual = applyCarouselEvent(slides, createCarouselState(slides, current, paused, pauseReasons), event);
          const expected = applyReferenceCarouselEvent(slides, createReferenceCarouselState(current, paused, pauseReasons), event);
          assert.deepEqual(observe(actual), observeRef(expected));
        }
      }
    }
  }
});

test('carousel exposes position and composes independent pause reasons', () => {
  const slides = createSequence(['a', 'b', 'c']);
  let state = createCarouselState(slides, 'b');
  assert.deepEqual(getCarouselPosition(slides, state), { index: 1, count: 3 });
  state = unwrap(applyCarouselEvent(slides, state, { type: 'pause-for', reason: 'hover' })).state;
  state = unwrap(applyCarouselEvent(slides, state, { type: 'pause-for', reason: 'focus' })).state;
  state = unwrap(applyCarouselEvent(slides, state, { type: 'resume-for', reason: 'hover' })).state;
  assert.deepEqual(state.pauseReasons, ['focus']);
  assert.equal(isCarouselRotationPaused(state), true);
  state = unwrap(applyCarouselEvent(slides, state, { type: 'resume-for', reason: 'focus' })).state;
  assert.equal(isCarouselRotationPaused(state), false);
});

function observe(result) {
  return result.ok
    ? { ok: true, state: result.value.state, commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}
function observeRef(result) {
  return result.ok
    ? { ok: true, state: result.value.state, commands: result.value.commands }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
