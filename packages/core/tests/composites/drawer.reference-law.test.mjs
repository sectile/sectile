import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDrawerEvent,
  createDrawerState,
  tryCreateDrawerState,
} from '../../.verification-dist/drawer.js';
import { unwrap } from '../support.mjs';

test('drawer owns open state and its attachment side', () => {
  let state = createDrawerState();
  assert.deepEqual(state, { open: false, side: 'bottom' });
  let update = unwrap(applyDrawerEvent(state, 'open'));
  assert.deepEqual(update, {
    state: { open: true, side: 'bottom' },
    commands: [{ type: 'request-initial-focus' }],
  });
  state = update.state;
  update = unwrap(applyDrawerEvent(state, { type: 'set-side', side: 'left' }));
  assert.deepEqual(update, { state: { open: true, side: 'left' }, commands: [] });
  update = unwrap(applyDrawerEvent(update.state, 'close'));
  assert.deepEqual(update.commands, [{ type: 'request-focus-restore' }]);
});

test('drawer rejects invalid construction and transition inputs atomically', () => {
  assert.equal(tryCreateDrawerState(false, 'center').error.code, 'invalid-drawer-side');
  const state = createDrawerState(true, 'right');
  const result = applyDrawerEvent(state, { type: 'set-side', side: 'center' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-drawer-side');
  assert.deepEqual(state, { open: true, side: 'right' });
});
