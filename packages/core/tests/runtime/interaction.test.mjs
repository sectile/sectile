import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInteractionState,
  tryCreateInteractionState,
  permitsInteraction,
  requireInteraction,
} from '../../.verification-dist/interaction.js';
import { unwrap } from '../../.verification-dist/result.js';

test('interaction state distinguishes disabled, read-only, and navigation', () => {
  const enabled = createInteractionState();
  assert.equal(permitsInteraction(enabled, 'navigate'), true);
  assert.equal(permitsInteraction(enabled, 'mutate'), true);

  const readOnly = createInteractionState({ readOnly: true });
  assert.equal(permitsInteraction(readOnly, 'navigate'), true);
  assert.equal(permitsInteraction(readOnly, 'mutate'), false);
  assert.equal(requireInteraction(readOnly, 'mutate').error.code, 'interaction-read-only');

  const disabled = createInteractionState({ disabled: true });
  assert.equal(permitsInteraction(disabled, 'navigate'), false);
  assert.equal(permitsInteraction(disabled, 'mutate'), false);
  assert.equal(requireInteraction(disabled, 'navigate').error.code, 'interaction-disabled');
});

test('interaction construction rejects non-boolean flags', () => {
  const result = tryCreateInteractionState({ disabled: 'yes' });
  assert.equal(result.ok, false);
  assert.equal(result.error.class, 'construction');
  assert.equal(result.error.code, 'invalid-disabled-state');
});
