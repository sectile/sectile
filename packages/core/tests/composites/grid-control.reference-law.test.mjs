import assert from 'node:assert/strict'; import test from 'node:test';
import { createGrid, createGridState, applyGridEvent } from '../../.verification-dist/structures/grid.js';
import { createReferenceGridState, applyReferenceGridEvent } from '../../.verification-dist/internal/reference/composites/grid-control.js';
import { unwrap } from '../support.mjs';

test('grid interaction matches an independent coordinate reference', () => {
  const grid = unwrap(createGrid([['a', 'b'], ['c', 'd']]));
  const events = ['left', 'right', 'up', 'down', 'select', 'start-edit', { type: 'focus', id: 'd' }, { type: 'select', id: 'c' }, { type: 'start-edit', id: 'b' }];
  for (const current of [null, 'a', 'b', 'c', 'd']) for (const selected of [[], ['a']]) for (const event of events) {
    const input = { current, selected, anchor: selected[0] ?? null };
    const actual = applyGridEvent(grid, unwrap(createGridState(grid, input)), event, { boundary: 'wrap-axis' });
    const expected = applyReferenceGridEvent(grid, createReferenceGridState(grid, input), event, { boundary: 'wrap-axis' });
    assert.deepEqual(observe(actual), observeReference(expected));
  }
});

function stateOf(state) { return { cursor: state.cursor, selection: { selected: state.selection.selected, anchor: state.selection.anchor, size: state.selection.size }, editMode: state.editMode }; }
function observe(result) { return result.ok ? { ok: true, state: stateOf(result.value.state), commands: result.value.commands } : { ok: false, errorClass: result.error.class, errorCode: result.error.code }; }
function observeReference(result) { return result.ok ? { ok: true, state: stateOf(result.value.state), commands: result.value.commands } : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode }; }
