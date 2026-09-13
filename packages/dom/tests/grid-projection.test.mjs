import assert from 'node:assert/strict';
import test from 'node:test';
import { createGridControl } from '../.verification-dist/grid.js';

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('Grid registration is linear and cursor/selection projection is bounded at 1k, 10k, and 100k cells', async () => {
  for (const size of [1_000, 10_000, 100_000]) {
    const stats = counters();
    const root = new Cell();
    const ids = Array.from({ length: size }, (_, id) => id);
    const rows = Array.from({ length: size / 1_000 }, (_, row) => ids.slice(row * 1_000, (row + 1) * 1_000));
    const grid = createGridControl({ root, rows, defaultHighlightedValue: 0 });
    const cells = ids.map((id) => new Cell(stats, id));
    try {
      for (const id of ids) grid.setCellAttributes(cells[id], id);
      assert.equal(stats.roles, size);
      assert.equal(stats.attributes, size * 5);
      assert.equal(stats.tabs, size);
      reset(stats);
      for (const id of ids) grid.setCellAttributes(cells[id], id, { disabled: false });
      assert.deepEqual(stats, counters(), 'unchanged refs perform no host writes');
      stats.record = true;
      grid.send('right');
      await settle();
      assert.deepEqual(stats.tabChanges, [[0, -1], [1, 0]]);
      assert.equal(stats.attributes, 0);
      reset(stats, true);
      grid.send('left');
      await settle();
      assert.deepEqual(stats.tabChanges, [[1, -1], [0, 0]]);
      reset(stats, true);
      grid.send('left');
      await settle();
      assert.equal(stats.tabs, 0, 'stopped movement does not rewrite the cursor');
      grid.send('select');
      assert.deepEqual(stats.selectionChanges, [[0, 'true']]);
      reset(stats, true);
      cells.at(-1).parentNode = root;
      let ancestorReads = 0;
      const label = { get parentNode() { ancestorReads += 1; return cells.at(-1); } };
      root.emit('click', { target: label });
      await settle();
      assert.equal(ancestorReads, 1, 'target routing reads the fixed-depth ancestry once');
      assert.deepEqual(stats.tabChanges, [[0, -1], [size - 1, 0]]);
      assert.deepEqual(stats.selectionChanges, [[0, 'false'], [size - 1, 'true']]);
      assert.equal(stats.roles, 0);
      assert.equal(stats.contains, 0);
      assert.equal(grid.state.cursor.current, size - 1);
      assert.deepEqual(grid.state.selection.selected, [size - 1]);
    } finally { grid.destroy(); }
  }
});

test('Grid cell ownership follows replacement, identity transfer, disabled updates, and release', async () => {
  const root = new Cell();
  const stats = counters();
  const shared = new Cell(stats, 'shared');
  const replacement = new Cell(stats, 'replacement');
  const grid = createGridControl({ root, rows: [[0, '0', 'disabled']], defaultHighlightedValue: 0, disabledItems: ['disabled'] });
  try {
    grid.setCellAttributes(shared, 0);
    assert.equal(shared.tabIndex, 0);
    grid.setCellAttributes(shared, '0', { disabled: true });
    assert.equal(shared.tabIndex, -1);
    assert.equal(shared.attributes.get('aria-colindex'), '2');
    assert.equal(shared.attributes.get('aria-disabled'), 'true');
    assert.equal(grid.handleEvent({ type: 'select', id: '0' }), false);
    grid.setCellAttributes(shared, '0', { disabled: false });
    assert.equal(shared.attributes.has('aria-disabled'), false);
    grid.send({ type: 'select', id: '0' });
    grid.setCellAttributes(replacement, '0');
    assert.equal(shared.tabIndex, -1);
    assert.equal(replacement.tabIndex, 0);
    const before = grid.getSnapshot();
    root.emit('click', { target: shared });
    assert.equal(grid.getSnapshot(), before, 'replaced host has no event ownership');
    grid.setCellAttributes(replacement, '0', { disabled: true });
    grid.setCellAttributes(undefined, '0');
    grid.setCellAttributes(undefined, '0');
    assert.equal(replacement.tabIndex, -1);
    assert.equal(grid.handleEvent({ type: 'select', id: '0' }), true, 'released local disabled state does not poison the domain');
    const released = grid.getSnapshot();
    root.emit('click', { target: replacement });
    assert.equal(grid.getSnapshot(), released);
    grid.setCellAttributes(replacement, 'disabled');
    assert.equal(replacement.attributes.get('aria-disabled'), 'true', 'root disabled policy survives host release');
    grid.setCellAttributes(replacement, 'missing');
    assert.equal(replacement.attributes.get('aria-colindex'), '3');
    await settle();
  } finally { grid.destroy(); }
});

test('Grid mixed controlled shapes project live canonical values and reject mismatched sync atomically', async () => {
  for (let mask = 0; mask < 8; mask += 1) {
    const stats = counters();
    const root = new Cell();
    const a = new Cell(stats, 'a');
    const b = new Cell(stats, 'b');
    const values = {
      ...(mask & 1 ? { value: null } : {}),
      ...(mask & 2 ? { highlightedValue: 'a' } : {}),
      ...(mask & 4 ? { editMode: 'navigation' } : {}),
    };
    const trace = [];
    const grid = createGridControl({ root, rows: [['a', 'b']], defaultHighlightedValue: 'a', ...values,
      onValueChange: (value) => trace.push(['value', value]),
      onHighlightedValueChange: (value) => trace.push(['highlight', value]),
      onEditModeChange: (value) => trace.push(['mode', value]),
      onEditStart: (id) => trace.push(['start', id]),
      onEditCommit: (id) => trace.push(['commit', id]),
      onEditCancel: (id) => trace.push(['cancel', id]),
    });
    try {
      grid.setCellAttributes(a, 'a'); grid.setCellAttributes(b, 'b');
      reset(stats);
      grid.send({ type: 'start-edit', id: 'b' });
      assert.deepEqual(trace, [['value', 'b'], ['highlight', 'b'], ['mode', 'editing'], ['start', 'b']]);
      assert.equal(b.tabIndex, mask & 2 ? -1 : 0);
      assert.equal(b.attributes.get('aria-selected'), mask & 1 ? 'false' : 'true');
      const accepted = {
        ...(mask & 1 ? { value: 'b' } : {}),
        ...(mask & 2 ? { highlightedValue: 'b' } : {}),
        ...(mask & 4 ? { editMode: 'editing' } : {}),
      };
      assert.equal(grid.syncControlledValues(accepted).ok, true);
      assert.equal(a.tabIndex, -1); assert.equal(b.tabIndex, 0);
      assert.equal(b.attributes.get('aria-selected'), 'true');
      assert.equal(stats.roles, 0);
      const before = grid.getSnapshot();
      assert.equal(grid.syncControlledValues({ ...accepted, value: mask & 1 ? undefined : null }).ok, false);
      assert.equal(grid.getSnapshot(), before);
      trace.length = 0;
      grid.send('commit-edit');
      assert.deepEqual(trace, [['mode', 'navigation'], ['commit', 'b']]);
      if (mask & 4) assert.equal(grid.syncControlledValues({ ...accepted, editMode: 'navigation' }).ok, true);
      grid.send('start-edit');
      if (mask & 4) assert.equal(grid.syncControlledValues(accepted).ok, true);
      grid.send('cancel-edit');
      assert.deepEqual(trace.at(-1), ['cancel', 'b']);
      await settle();
    } finally { grid.destroy(); }
  }
});

test('Grid focus publication drains against the latest synchronous controlled acceptance', async () => {
  const stats = counters();
  const root = new Cell();
  const a = new Cell(stats, 'a');
  const b = new Cell(stats, 'b');
  let grid;
  const trace = [];
  grid = createGridControl({ root, rows: [['a', 'b']], highlightedValue: 'a', value: null,
    onValueChange: (value) => { trace.push('value'); grid.syncControlledValues({ value, highlightedValue: grid.state.cursor.current }); },
    onHighlightedValueChange: (highlightedValue) => { trace.push('highlight'); grid.syncControlledValues({ value: grid.state.selection.selected[0] ?? null, highlightedValue }); },
    onUpdate: () => trace.push('update'),
  });
  grid.setCellAttributes(a, 'a'); grid.setCellAttributes(b, 'b');
  try {
    reset(stats, true);
    grid.send({ type: 'select', id: 'b' });
    await settle();
    assert.deepEqual(stats.tabChanges, [['a', -1], ['b', 0]]);
    assert.deepEqual(stats.selectionChanges, [['b', 'true']]);
    assert.deepEqual(trace, ['value', 'update', 'highlight', 'update']);
    reset(stats, true);
    root.emit('focusin', { target: a });
    await settle();
    assert.deepEqual(stats.tabChanges, [['b', -1], ['a', 0]]);
    assert.equal(stats.roles, 0);
  } finally { grid.destroy(); }
});

test('Grid disconnect cancels pending focus and detached handlers across ownership churn', async () => {
  for (let cycle = 0; cycle < 32; cycle += 1) {
    const root = new Cell();
    const cell = new Cell();
    let updates = 0;
    const grid = createGridControl({ root, rows: [[0]], onUpdate: () => { updates += 1; } });
    grid.setCellAttributes(cell, 0);
    const focus = [...root.listeners.get('focusin')][0];
    const click = [...root.listeners.get('click')][0];
    root.emit('focusin', { target: cell });
    grid.focusCurrent();
    grid.destroy(); grid.destroy();
    const before = grid.getSnapshot();
    focus({ target: cell }); click({ target: cell });
    await settle();
    assert.equal(cell.focusCalls, 0);
    assert.equal(root.focusCalls, 0);
    assert.equal(updates, 0);
    assert.equal(grid.getSnapshot(), before);
    assert.ok([...root.listeners.values()].every((listeners) => listeners.size === 0));
  }
});

function counters() { return { roles: 0, attributes: 0, tabs: 0, contains: 0, record: false, tabChanges: [], selectionChanges: [] }; }
function reset(stats, record = false) { Object.assign(stats, counters(), { record }); }
class Cell {
  attributes = new Map();
  listeners = new Map();
  parentNode = null;
  focusCalls = 0;
  constructor(stats = counters(), id = null) {
    this.stats = stats; this.id = id;
    let tabIndex = -1;
    Object.defineProperty(this, 'tabIndex', {
      get: () => tabIndex,
      set: (value) => { tabIndex = value; stats.tabs += 1; if (stats.record) stats.tabChanges.push([id, value]); },
    });
  }
  setAttribute(name, value) {
    this.stats.attributes += 1;
    if (name === 'role' && value === 'gridcell') this.stats.roles += 1;
    if (name === 'aria-selected' && this.stats.record) this.stats.selectionChanges.push([this.id, value]);
    this.attributes.set(name, value);
  }
  removeAttribute(name) { this.stats.attributes += 1; this.attributes.delete(name); }
  addEventListener(type, callback) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(callback); this.listeners.set(type, listeners); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, event) { for (const callback of this.listeners.get(type) ?? []) callback(event); }
  focus() { this.focusCalls += 1; }
  contains(target) { this.stats.contains += 1; return target === this; }
}
