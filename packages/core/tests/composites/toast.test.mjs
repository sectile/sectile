import test from 'node:test';
import assert from 'node:assert/strict';
import { applyToastEvent, createToastState } from '../../.verification-dist/toast.js';

test('toast queue announces, pauses, and dismisses after elapsed time', () => {
  let state = createToastState([], false, { defaultDurationMs: 1_000 });
  const pushed = applyToastEvent(state, { type: 'push', toast: { id: 'saved', title: 'Saved', kind: 'success' } }, { defaultDurationMs: 1_000 }).value;
  state = pushed.state;
  assert.deepEqual(pushed.commands, [{ type: 'announce-toast', id: 'saved', kind: 'success' }]);
  state = applyToastEvent(state, 'pause').value.state;
  state = applyToastEvent(state, { type: 'tick', elapsedMs: 1_000 }).value.state;
  assert.equal(state.items.length, 1);
  state = applyToastEvent(state, 'resume').value.state;
  const elapsed = applyToastEvent(state, { type: 'tick', elapsedMs: 1_000 }).value;
  assert.equal(elapsed.state.items.length, 0);
  assert.deepEqual(elapsed.commands, [{ type: 'toast-dismissed', id: 'saved', reason: 'timeout' }]);
});

test('toast queue applies a visible limit and rejects duplicate identifiers', () => {
  const state = createToastState([{ id: 'one', title: 'One' }], false, { maxVisible: 1 });
  const pushed = applyToastEvent(state, { type: 'push', toast: { id: 'two', title: 'Two' } }, { maxVisible: 1 }).value;
  assert.deepEqual(pushed.state.items.map((item) => item.id), ['two']);
  assert.equal(pushed.commands[0].reason, 'overflow');
  assert.equal(applyToastEvent(pushed.state, { type: 'push', toast: { id: 'two', title: 'Again' } }, { maxVisible: 1 }).ok, false);
});

test('toast queue preserves user-defined kinds and defaults blank kinds to info', () => {
  const state = createToastState([
    { id: 'deploying', title: 'Deploying', kind: '  deployment-pending  ' },
    { id: 'default', title: 'Default', kind: '   ' },
  ]);
  assert.equal(state.items[0].kind, 'deployment-pending');
  assert.equal(state.items[1].kind, 'info');

  const pushed = applyToastEvent(state, { type: 'push', toast: { id: 'custom', title: 'Custom', kind: 'product-specific' } }).value;
  assert.deepEqual(pushed.commands.at(-1), { type: 'announce-toast', id: 'custom', kind: 'product-specific' });
});

test('toast queue keeps a controlled timeout proposal stable after it expires', () => {
  const initial = createToastState([{ id: 'saved', title: 'Saved', durationMs: 1_000 }]);
  const expired = Object.freeze({
    items: Object.freeze([Object.freeze({ ...initial.items[0], remainingMs: 0 })]),
    paused: false,
  });
  const elapsed = applyToastEvent(expired, { type: 'tick', elapsedMs: 100 }).value;
  assert.equal(elapsed.state.items[0].remainingMs, 0);
  assert.deepEqual(elapsed.commands, []);
});
