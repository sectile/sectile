import assert from 'node:assert/strict';
import test from 'node:test';
import { connectLayoutBasis } from '../.verification-dist/layout-basis.js';

// Native delivery is simulated; CSS query activation/rendering remains browser evidence.
function fixture(count = 0) {
  const observers = [], live = new Set(), snapshots = [];
  let peak = 0, reads = 0, font = '16px', projection = 'compact', failObserve = false;
  let padding = { paddingInlineStart: '3px', paddingInlineEnd: '4px', paddingBlockStart: '5px', paddingBlockEnd: '6px' };
  const fontListeners = new Map();
  const fonts = {
    addEventListener(type, callback) { fontListeners.set(type, callback); },
    removeEventListener(type, callback) { if (fontListeners.get(type) === callback) fontListeners.delete(type); },
    emit(type, ...families) { fontListeners.get(type)?.({ fontfaces: families.map(family => ({ family })) }); },
  };
  const document = { documentElement: {}, fonts };
  const marker = { nodeType: 1, ownerDocument: document, isConnected: true };
  const cells = Array.from({ length: count }, () => ({ nodeType: 1, ownerDocument: document, isConnected: true }));
  const element = { nodeType: 1, ownerDocument: document, isConnected: true, contains: node => node === marker || cells.includes(node) };
  class ResizeObserver {
    targets = new Set();
    boxes = new Map();
    constructor(callback) { this.callback = callback; observers.push(this); live.add(this); peak = Math.max(peak, live.size); }
    observe(target, config) {
      const expected = target === element ? options.box ?? (options.allocations !== undefined && !options.parent ? 'border-box' : 'content-box')
        : target === marker || target === options.parent ? 'content-box' : 'border-box';
      assert.equal(config.box, expected);
      if ((failObserve === true && target === marker) || target === failObserve) throw Error('native observe failed');
      this.targets.add(target);
      this.boxes.set(target, config.box);
    }
    disconnect() { this.targets.clear(); this.boxes.clear(); live.delete(this); }
    emit(entries) { this.callback(entries, this); }
  }
  document.defaultView = { ResizeObserver, getComputedStyle(target) {
    reads++;
    return target === marker ? { getPropertyValue: name => name === '--stage' ? projection : '' } : target === element ? padding : { fontSize: font };
  } };
  const entry = (target, inlineSize, blockSize, border) => ({ target, contentBoxSize: [{ inlineSize, blockSize }], ...(border ? { borderBoxSize: [border] } : {}) });
  const options = { element, marker, ...(count ? { allocations: cells.slice() } : {}), property: '--stage', onChange: snapshot => snapshots.push(snapshot) };
  const deliver = () => observers.at(-1).emit([entry(element, 80.25, 40.5), entry(marker, 1, 16)]);
  return { document, fonts, fontListeners, element, marker, cells, observers, live, snapshots, options, entry, deliver,
    get peak() { return peak; }, get reads() { return reads; },
    set font(value) { font = value; }, set projection(value) { projection = value; }, set failObserve(value) { failObserve = value; },
    set padding(value) { padding = value; } };
}

test('explicit target trigger boxes preserve descendant allocation snapshots and share one native owner', () => {
  for (const box of ['content-box', 'border-box']) {
    const f = fixture(box === 'content-box' ? 1 : 0); f.options.box = box;
    const connected = connectLayoutBasis(f.options); assert.equal(connected.ok, true);
    const observer = f.observers[0]; assert.equal(observer.boxes.get(f.element), box);
    assert.equal(observer.boxes.get(f.marker), 'content-box');
    if (f.cells.length) assert.equal(observer.boxes.get(f.cells[0]), 'border-box');
    observer.emit([f.entry(f.element, 80, 40, { inlineSize: 84, blockSize: 44 }), f.entry(f.marker, 1, 16),
      ...f.cells.map(cell => f.entry(cell, 20, 20, { inlineSize: 22, blockSize: 22 }))]);
    if (f.cells.length) {
      observer.emit([f.entry(f.element, 76, 40, { inlineSize: 84, blockSize: 44 })]);
      assert.equal(f.snapshots.at(-1).contentSize.inlineSize, 76);
      assert.equal(f.snapshots.at(-1).borderSize.inlineSize, 84);
      assert.equal(f.snapshots.at(-1).allocations[0].inlineSize, 22);
    } else assert.equal(f.snapshots.at(-1).borderSize, undefined, 'trigger choice does not add snapshot fields');
    assert.equal(f.peak, 1); connected.value.disconnect();
    assert.equal(f.live.size, 0); assert.equal(observer.targets.size, 0); assert.equal(observer.boxes.size, 0);
  }
  for (const box of ['padding-box', null, 1]) {
    const f = fixture(); f.options.box = box;
    assert.equal(connectLayoutBasis(f.options).error.code, 'dom.layout-basis-invalid'); assert.equal(f.observers.length, 0);
  }
});

test('requested logical padding shares native generations, preserves unknown facts and adds one bounded style read', () => {
  const f = fixture(); f.options.padding = true;
  const connected = connectLayoutBasis(f.options); assert.equal(connected.ok, true);
  try {
    f.deliver(); const first = f.snapshots.at(-1), padding = first.padding;
    assert.deepEqual(padding, { inlineStart: 3, inlineEnd: 4, blockStart: 5, blockEnd: 6 });
    assert.equal(Object.isFrozen(padding), true); assert.equal(f.reads, 3);
    const count = f.snapshots.length; f.deliver(); assert.equal(f.snapshots.length, count); assert.equal(f.snapshots.at(-1), first);
    assert.equal(f.reads, 6); assert.equal(f.live.size, 1);
    f.padding = { paddingInlineStart: '0px', paddingInlineEnd: '7.25px', paddingBlockStart: '.5px', paddingBlockEnd: '12px' };
    f.deliver(); assert.deepEqual(f.snapshots.at(-1).padding, { inlineStart: 0, inlineEnd: 7.25, blockStart: .5, blockEnd: 12 });
    for (const invalid of ['auto', '-1px', '1rem', undefined]) {
      f.padding = { paddingInlineStart: invalid, paddingInlineEnd: '0px', paddingBlockStart: '0px', paddingBlockEnd: '0px' };
      f.deliver(); assert.equal(f.snapshots.at(-1).padding, undefined);
    }
    f.padding = { paddingInlineStart: '0px', paddingInlineEnd: '0px', paddingBlockStart: '8px', paddingBlockEnd: '4px' };
    f.deliver(); assert.equal(f.snapshots.at(-1).padding.blockStart, 8);
    const old = f.observers.at(-1); assert.equal(connected.value.invalidate().ok, true);
    assert.equal(f.snapshots.at(-1).padding, undefined);
    const revoked = f.snapshots.length; old.emit([f.entry(f.marker, 1, 16)]); assert.equal(f.snapshots.length, revoked);
    f.deliver(); assert.equal(f.snapshots.at(-1).padding.blockEnd, 4); assert.equal(f.peak, 1);
  } finally { connected.value.disconnect(); }
  assert.equal(f.live.size, 0); assert.ok(f.observers.every(observer => observer.targets.size === 0));
  const invalid = fixture(); invalid.options.padding = 'all';
  assert.equal(connectLayoutBasis(invalid.options).error.code, 'dom.layout-basis-invalid'); assert.equal(invalid.observers.length, 0);
});

test('layout basis publishes native logical content facts and scalar CSS output without deciding a mode', () => {
  const f = fixture(), connected = connectLayoutBasis(f.options);
  assert.equal(connected.ok, true); assert.deepEqual(f.snapshots, [{ connected: true }]);
  assert.equal(f.observers.length, 1); assert.equal(f.observers[0].targets.size, 2);
  f.deliver();
  assert.deepEqual(f.snapshots.at(-1), { connected: true, contentSize: { inlineSize: 80.25, blockSize: 40.5 }, rootFontSize: 16, projection: 'compact' });
  assert.equal(f.reads, 2); assert.equal(Object.isFrozen(f.snapshots.at(-1)), true);
  assert.equal(Object.isFrozen(f.snapshots.at(-1).contentSize), true);
  const count = f.snapshots.length;
  f.deliver(); assert.equal(f.snapshots.length, count);
  f.font = '20px'; f.projection = 'expanded';
  f.observers[0].emit([f.entry(f.marker, 3, 20)]);
  assert.equal(f.snapshots.at(-1).rootFontSize, 20); assert.equal(f.snapshots.at(-1).projection, 'expanded');
  assert.deepEqual(f.snapshots.at(-1).contentSize, { inlineSize: 80.25, blockSize: 40.5 });
  connected.value.disconnect(); assert.deepEqual(f.snapshots.at(-1), { connected: false });
  assert.equal(f.live.size, 0);
});

test('layout basis observes one actual parent content allocation with the existing native generation', () => {
  const f = fixture(1), parent = { nodeType: 1, ownerDocument: f.document, isConnected: true };
  f.element.parentElement = parent; f.options.parent = parent;
  const connected = connectLayoutBasis(f.options); assert.equal(connected.ok, true);
  const deliver = observer => observer.emit([f.entry(parent, 100, 70),
    f.entry(f.element, 80, 40, { inlineSize: 84, blockSize: 44 }), f.entry(f.marker, 1, 16),
    f.entry(f.cells[0], 20, 20, { inlineSize: 22, blockSize: 22 })]);
  try {
    assert.equal(f.live.size, 1); assert.deepEqual([...f.observers[0].targets], [f.element, f.marker, parent, f.cells[0]]);
    deliver(f.observers[0]); const first = f.snapshots.at(-1);
    assert.deepEqual(first.parentSize, { inlineSize: 100, blockSize: 70 }); assert.equal(Object.isFrozen(first.parentSize), true);
    f.observers[0].emit([f.entry(parent, 75, 60)]);
    assert.deepEqual(f.snapshots.at(-1).parentSize, { inlineSize: 75, blockSize: 60 });
    assert.deepEqual(first.parentSize, { inlineSize: 100, blockSize: 70 });
    f.observers[0].emit([f.entry(f.element, 76, 36, { inlineSize: 84, blockSize: 44 })]);
    assert.deepEqual(f.snapshots.at(-1).contentSize, { inlineSize: 76, blockSize: 36 });
    for (let index = 0; index < 4; index++) {
      const old = f.observers.at(-1); assert.equal(connected.value.invalidate().ok, true);
      assert.deepEqual(f.snapshots.at(-1), { connected: true }); assert.equal(old.targets.size, 0); assert.equal(f.live.size, 1);
      const count = f.snapshots.length; deliver(old); assert.equal(f.snapshots.length, count);
      deliver(f.observers.at(-1)); assert.deepEqual(f.snapshots.at(-1).parentSize, { inlineSize: 100, blockSize: 70 });
    }
    f.element.parentElement = {}; f.observers.at(-1).emit([f.entry(parent, 100, 70)]);
    assert.deepEqual(f.snapshots.at(-1), { connected: false });
    f.element.parentElement = parent; assert.equal(connected.value.invalidate().ok, true); deliver(f.observers.at(-1));
    assert.equal(f.snapshots.at(-1).connected, true); assert.equal(f.peak, 1);
  } finally { connected.value.disconnect(); connected.value.disconnect(); }
  assert.equal(f.live.size, 0); assert.ok(f.observers.every(observer => observer.targets.size === 0));
  const count = f.snapshots.length; deliver(f.observers.at(-1)); assert.equal(f.snapshots.length, count);
  for (const value of [null, {}, { nodeType: 1, ownerDocument: {}, isConnected: true }]) {
    f.options.parent = value; assert.equal(connectLayoutBasis(f.options).error.code, 'dom.layout-basis-invalid');
  }
  f.options.parent = parent; f.failObserve = parent;
  assert.equal(connectLayoutBasis(f.options).error.code, 'dom.layout-basis-unavailable'); assert.equal(f.live.size, 0);
});

test('one native boundary observes ordered border allocations without inferring content or missing fragments', () => {
  const f = fixture(128), connected = connectLayoutBasis(f.options);
  assert.equal(connected.ok, true); assert.equal(f.observers[0].targets.size, 130);
  // Input order is owned at connection, independent of subsequent caller edits.
  f.options.allocations.reverse();
  const observer = f.observers[0], border = { inlineSize: 642, blockSize: 40 };
  observer.emit([f.entry(f.element, 640, 38, border), f.entry(f.marker, 1, 16),
    ...f.cells.slice(1).map(cell => f.entry(cell, 3, 22, { inlineSize: 5, blockSize: 38 }))]);
  assert.deepEqual(f.snapshots.at(-1).borderSize, border);
  assert.equal(f.snapshots.at(-1).allocations, undefined);
  observer.emit([f.entry(f.cells[0], 4, 22, { inlineSize: 6, blockSize: 38 })]);
  const first = f.snapshots.at(-1);
  assert.equal(first.allocations.length, 128);
  assert.deepEqual(first.allocations[0], { inlineSize: 6, blockSize: 38 });
  assert.deepEqual(first.allocations[127], { inlineSize: 5, blockSize: 38 });
  assert.equal(Object.isFrozen(first.allocations), true); assert.equal(Object.isFrozen(first.allocations[0]), true);
  const reports = f.snapshots.length;
  observer.emit([f.entry(f.cells[0], 4, 22, { inlineSize: 6, blockSize: 38 })]);
  assert.equal(f.snapshots.length, reports);
  observer.emit([f.entry(f.cells[64], 7, 22, { inlineSize: 9, blockSize: 38 })]);
  assert.equal(f.snapshots.at(-1).allocations[64].inlineSize, 9);
  assert.equal(f.snapshots.at(-1).allocations[0], first.allocations[0]);
  assert.equal(first.allocations[64].inlineSize, 5);
  observer.emit([{ target: f.cells[64], borderBoxSize: [{ inlineSize: 9, blockSize: 38 }, { inlineSize: 1, blockSize: 1 }] }]);
  assert.equal(f.snapshots.at(-1).allocations, undefined);
  observer.emit([f.entry(f.cells[64], 7, 22)]);
  assert.equal(f.snapshots.at(-1).allocations, undefined);
  f.cells[64].isConnected = false;
  observer.emit([f.entry(f.cells[64], 7, 22, { inlineSize: 9, blockSize: 38 })]);
  assert.deepEqual(f.snapshots.at(-1), { connected: false });
  connected.value.disconnect(); assert.equal(f.live.size, 0); assert.equal(observer.targets.size, 0);
  for (const allocations of [[f.marker], [f.element], [f.cells[0], f.cells[0]], Array(129).fill(f.cells[0]), [{}]]) {
    const invalid = fixture(); invalid.options.allocations = allocations;
    assert.equal(connectLayoutBasis(invalid.options).error.code, 'dom.layout-basis-invalid');
    assert.equal(invalid.live.size, 0);
  }
});

test('invalidation revokes measurements, releases the old observer and ignores obsolete deliveries through churn', () => {
  const f = fixture(2);
  for (let index = 0; index < 16; index++) {
    const result = connectLayoutBasis(f.options); assert.equal(result.ok, true); f.deliver();
    const old = f.observers.at(-1);
    old.emit(f.cells.map(cell => f.entry(cell, 20, 22, { inlineSize: 22, blockSize: 38 })));
    assert.equal(f.snapshots.at(-1).allocations.length, 2);
    assert.equal(old.targets.size, 4);
    assert.equal(result.value.invalidate().ok, true);
    assert.deepEqual(f.snapshots.at(-1), { connected: true });
    assert.equal(old.targets.size, 0); assert.equal(f.live.size, 1);
    const count = f.snapshots.length;
    old.emit([f.entry(f.element, 999, 999), f.entry(f.marker, 3, 20), f.entry(f.cells[0], 999, 999, { inlineSize: 999, blockSize: 999 })]);
    assert.equal(f.snapshots.length, count);
    const current = f.observers.at(-1);
    current.emit([f.entry(f.marker, 2, 16)]);
    assert.deepEqual(f.snapshots.at(-1), { connected: true });
    current.emit([f.entry(f.element, 60, 30)]);
    assert.equal(f.snapshots.at(-1).contentSize.inlineSize, 60);
    result.value.disconnect(); result.value.disconnect();
    assert.equal(result.value.invalidate().error.code, 'dom.layout-basis-disposed');
    const terminalCount = f.snapshots.length;
    current.emit([f.entry(f.element, 50, 25)]); assert.equal(f.snapshots.length, terminalCount);
    assert.equal(f.live.size, 0); assert.equal(current.targets.size, 0);
  }
  assert.equal(f.peak, 1);
});

test('selected font completion revokes fixed-box facts and releases listeners through churn and failures', () => {
  const f = fixture(); f.options.fontFamilies = ['Inter Variable', 'sans-serif'];
  for (let cycle = 0; cycle < 16; cycle++) {
    const connected = connectLayoutBasis(f.options); assert.equal(connected.ok, true);
    assert.equal(f.fontListeners.size, 2); f.deliver();
    const old = f.observers.at(-1), reports = f.snapshots.length;
    f.fonts.emit('loadingdone', 'Unrelated Font');
    assert.equal(f.snapshots.length, reports); assert.equal(old.targets.size, 2);
    f.fonts.emit('loadingdone', '"INTER VARIABLE"');
    assert.deepEqual(f.snapshots.at(-1), { connected: true });
    assert.equal(old.targets.size, 0); assert.equal(f.live.size, 1);
    const acquired = f.observers.length;
    f.fonts.emit('loadingerror', 'Inter Variable');
    assert.equal(f.observers.length, acquired, 'Missing facts already coalesce completion/error invalidations');
    old.emit([f.entry(f.element, 999, 999), f.entry(f.marker, 1, 16)]);
    assert.deepEqual(f.snapshots.at(-1), { connected: true });
    f.deliver(); assert.equal(f.snapshots.at(-1).contentSize.blockSize, 40.5);
    f.fonts.emit('loadingerror', 'Inter   Variable');
    assert.deepEqual(f.snapshots.at(-1), { connected: true }); f.deliver();
    f.fonts.emit('loadingdone', '"\\49 nter Variable"');
    assert.deepEqual(f.snapshots.at(-1), { connected: true }, 'Uncertain CSS spelling invalidates conservatively');
    f.deliver();
    const stale = [...f.fontListeners.values()];
    connected.value.disconnect(); connected.value.disconnect();
    assert.equal(f.fontListeners.size, 0); assert.equal(f.live.size, 0);
    const terminal = f.snapshots.length;
    for (const callback of stale) callback({ fontfaces: [{ family: 'Inter Variable' }] });
    assert.equal(f.snapshots.length, terminal);
  }
  assert.equal(f.peak, 1);
  const absent = fixture(); delete absent.document.fonts; absent.options.fontFamilies = ['Inter Variable'];
  assert.equal(connectLayoutBasis(absent.options).error.code, 'dom.layout-basis-unavailable');
  assert.equal(absent.live.size, 0);
  const failed = fixture(); failed.options.fontFamilies = ['Inter Variable']; failed.failObserve = true;
  assert.equal(connectLayoutBasis(failed.options).error.code, 'dom.layout-basis-unavailable');
  assert.equal(failed.fontListeners.size, 0); assert.equal(failed.live.size, 0);
  const partial = fixture(); partial.options.fontFamilies = ['Inter Variable'];
  partial.fonts.addEventListener = (type, callback) => {
    partial.fontListeners.set(type, callback); if (type === 'loadingerror') throw Error('native font acquisition');
  };
  assert.equal(connectLayoutBasis(partial.options).error.code, 'dom.layout-basis-unavailable');
  assert.equal(partial.fontListeners.size, 0); assert.equal(partial.live.size, 0);
  const rejected = fixture(); rejected.options.fontFamilies = ['Inter Variable'];
  rejected.options.onChange = snapshot => { if (snapshot.projection) throw Error('font subscriber'); };
  assert.equal(connectLayoutBasis(rejected.options).ok, true);
  assert.throws(rejected.deliver, /font subscriber/u); assert.equal(rejected.fontListeners.size, 0); assert.equal(rejected.live.size, 0);
  const optional = fixture(); const untracked = connectLayoutBasis(optional.options);
  assert.equal(optional.fontListeners.size, 0); untracked.value.disconnect();
  for (const fontFamilies of [[undefined], [' '], Array(1), 'Inter Variable']) {
    const invalid = fixture(); invalid.options.fontFamilies = fontFamilies;
    assert.equal(connectLayoutBasis(invalid.options).error.code, 'dom.layout-basis-invalid');
    assert.equal(invalid.live.size, 0); assert.equal(invalid.fontListeners.size, 0);
  }
});

test('missing, fragmented and disconnected bases remain unknown instead of borrowing previous facts', () => {
  const f = fixture(), connected = connectLayoutBasis(f.options); assert.equal(connected.ok, true); f.deliver();
  f.font = 'unknown'; f.projection = 'x'.repeat(129);
  f.observers[0].emit([f.entry(f.marker, 2, 16)]);
  assert.equal(f.snapshots.at(-1).projection, undefined); assert.equal(f.snapshots.at(-1).rootFontSize, undefined);
  f.observers[0].emit([{ target: f.element, contentBoxSize: [{ inlineSize: 1, blockSize: 1 }, { inlineSize: 1, blockSize: 1 }] }]);
  assert.equal(f.snapshots.at(-1).contentSize, undefined);
  f.observers[0].emit([f.entry(f.element, -1, 1)]); assert.equal(f.snapshots.at(-1).contentSize, undefined);
  f.marker.isConnected = false;
  f.observers[0].emit([f.entry(f.element, 50, 30)]); assert.deepEqual(f.snapshots.at(-1), { connected: false });
  f.marker.isConnected = true; f.projection = 'compact'; f.font = '16px';
  f.observers[0].emit([f.entry(f.element, 50, 30)]);
  assert.equal(f.snapshots.at(-1).projection, undefined);
  f.observers[0].emit([f.entry(f.marker, 1, 16)]); assert.equal(f.snapshots.at(-1).projection, 'compact');
  connected.value.disconnect();
});

test('native acquisition and subscriber failures release all connection resources', () => {
  const native = fixture(); native.failObserve = true;
  assert.equal(connectLayoutBasis(native.options).error.code, 'dom.layout-basis-unavailable');
  assert.equal(native.live.size, 0); assert.equal(native.observers[0].targets.size, 0);
  const allocationFailure = fixture(2); allocationFailure.failObserve = allocationFailure.cells[1];
  assert.equal(connectLayoutBasis(allocationFailure.options).error.code, 'dom.layout-basis-unavailable');
  assert.equal(allocationFailure.live.size, 0); assert.equal(allocationFailure.observers[0].targets.size, 0);
  const f = fixture(); let reject = false;
  f.options.onChange = snapshot => { if (reject) throw Error('subscriber failed'); f.snapshots.push(snapshot); };
  const result = connectLayoutBasis(f.options); assert.equal(result.ok, true); reject = true;
  assert.throws(f.deliver, /subscriber failed/u); assert.equal(f.live.size, 0);
  assert.equal(result.value.invalidate().error.code, 'dom.layout-basis-disposed');
  const count = f.snapshots.length; f.deliver(); assert.equal(f.snapshots.length, count);
  const missing = fixture(); delete missing.document.defaultView.ResizeObserver;
  assert.equal(connectLayoutBasis(missing.options).error.code, 'dom.layout-basis-unavailable');
  const foreign = fixture(); foreign.element.contains = () => false;
  assert.equal(connectLayoutBasis(foreign.options).error.code, 'dom.layout-basis-invalid');
});

test('reentrant invalidation rejects while terminal disconnect remains safe during publication', () => {
  const f = fixture(); let connection;
  f.options.onChange = snapshot => {
    f.snapshots.push(snapshot);
    if (snapshot.projection) {
      assert.equal(connection.invalidate().error.code, 'dom.layout-basis-reentrant');
      connection.disconnect();
    }
  };
  const result = connectLayoutBasis(f.options); assert.equal(result.ok, true); connection = result.value;
  f.deliver(); assert.deepEqual(f.snapshots.at(-1), { connected: false }); assert.equal(f.live.size, 0);
});
