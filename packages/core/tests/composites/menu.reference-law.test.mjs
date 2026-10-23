import assert from 'node:assert/strict'; import test from 'node:test'; import { createTree } from '../../.verification-dist/structures/tree.js'; import { createMenuState, applyMenuEvent } from '../../.verification-dist/menu.js'; import { createReferenceMenuState, applyReferenceMenuEvent } from '../../.verification-dist/internal/reference/composites/menu.js'; import { unwrap } from '../support.mjs';
test('nested menu popup path matches an independent transition reference', () => { const tree = createTree([{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }, { id: 'open', parentID: 'file' }, { id: 'edit', parentID: null }]); const states = [[false, null, []], [true, 'file', []], [true, 'new', ['file']], [true, 'open', ['file']], [true, 'edit', []]]; const events = ['open-popup', 'close-popup', 'next', 'previous', 'first', 'last', 'open-submenu', 'close-submenu', 'invoke', 'escape', { type: 'focus', id: 'edit' }]; for (const [open, current, path] of states) for (const event of events) { const policies = { disabled: (id) => id === 'open' }; const actual = applyMenuEvent(tree, createMenuState(tree, open, current, path), event, policies); const expected = applyReferenceMenuEvent(tree, createReferenceMenuState(open, current, path), event, policies); assert.deepEqual(observe(actual), observeReference(expected)); } });
function observe(result) { return result.ok ? { ok: true, state: result.value.state, commands: result.value.commands } : { ok: false, errorClass: result.error.class, errorCode: result.error.code }; } function observeReference(result) { return result.ok ? { ok: true, state: result.value.state, commands: result.value.commands } : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode }; }

test('menu root movement publishes one root focus and the destination branch only', () => {
  const tree = createTree([{ id: 'file', parentID: null }, { id: 'recent', parentID: 'file' }, { id: 'one', parentID: 'recent' },
    { id: 'edit', parentID: null }, { id: 'undo', parentID: 'edit' }, { id: 'help', parentID: null }]);
  const nested = createMenuState(tree, true, 'one', ['file', 'recent']);
  const moved = unwrap(applyMenuEvent(tree, nested, 'next-root'));
  assert.equal(moved.state.cursor.current, 'edit'); assert.deepEqual(moved.state.openPath, ['edit']);
  assert.deepEqual(moved.commands, [{ type: 'focus', id: 'edit' }]);
  const leaf = unwrap(applyMenuEvent(tree, moved.state, 'next-root'));
  assert.equal(leaf.state.cursor.current, 'help'); assert.deepEqual(leaf.state.openPath, []);
  const wrapped = unwrap(applyMenuEvent(tree, leaf.state, 'next-root'));
  assert.equal(wrapped.state.cursor.current, 'file'); assert.deepEqual(wrapped.state.openPath, []);
  const disabled = unwrap(applyMenuEvent(tree, nested, 'next-root', { disabled: id => id === 'edit' }));
  assert.equal(disabled.state.cursor.current, 'edit'); assert.deepEqual(disabled.state.openPath, []);
  for (const [open, current, path] of [[true, null, []], [true, 'file', []], [true, 'one', ['file', 'recent']], [true, 'edit', ['edit']], [false, null, []]]) {
    for (const event of ['next-root', 'previous-root']) for (const policies of [{}, { disabled: id => id === 'edit' }]) {
      assert.deepEqual(observe(applyMenuEvent(tree, createMenuState(tree, open, current, path), event, policies)),
        observeReference(applyReferenceMenuEvent(tree, createReferenceMenuState(open, current, path), event, policies)));
    }
  }
  const empty = createTree([]), emptyState = createMenuState(empty, true);
  assert.equal(unwrap(applyMenuEvent(empty, emptyState, 'next-root')).state, emptyState);
});

test('menu root movement work follows ancestor depth instead of unrelated tree cardinality', () => {
  for (const count of [1_000, 10_000, 100_000]) {
    const depth = 32, nodes = [{ id: 'root', parentID: null }];
    for (let i = 1; i <= depth; i++) nodes.push({ id: 'nested-' + i, parentID: i === 1 ? 'root' : 'nested-' + (i - 1) });
    for (let i = nodes.length; i < count; i++) nodes.push({ id: 'root-' + i, parentID: null });
    const actual = createTree(nodes), work = { parent: 0, rank: 0, at: 0 }, tree = {
      ...Object.fromEntries(['has', 'childrenOf', 'isLeaf', 'depthOf', 'ancestorsOf', 'subtreeIntervalOf', 'preorder', 'postorder', 'normalizeExpansion', 'visible'].map(name => [name, actual[name].bind(actual)])),
      size: actual.size, parentOf(id) { work.parent++; return actual.parentOf(id); },
      roots: { size: actual.roots.size, indexOf(id) { work.rank++; return actual.roots.indexOf(id); }, at(index) { work.at++; return actual.roots.at(index); },
        get ids() { throw new Error('root movement must use the indexed root view'); } },
    };
    const path = ['root', ...Array.from({ length: depth - 1 }, (_, i) => 'nested-' + (i + 1))];
    const state = createMenuState(tree, true, 'nested-' + depth, path);
    work.parent = work.rank = work.at = 0;
    const result = unwrap(applyMenuEvent(tree, state, 'next-root'));
    assert.equal(result.state.cursor.current, 'root-' + (depth + 1)); assert.equal(result.commands.length, 1);
    assert.deepEqual(work, { parent: depth + 1, rank: 1, at: 1 });
  }
});
