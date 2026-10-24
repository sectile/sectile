import assert from 'node:assert/strict';
import test from 'node:test';
import { createReorder } from '../.verification-dist/reorder.js';

test('DOM sequence reorder maps keyboard and pointer placement onto stable identities', () => {
  const root = new FakeElement();
  const elements = ['a', 'b', 'c'].map((id, index) => new FakeElement(index * 40));
  const changes = [];
  const reorder = createReorder({
    root,
    ids: ['a', 'b', 'c'],
    onOrderChange: (ids) => changes.push([...ids]),
  });
  elements.forEach((element, index) => reorder.setItemAttributes(element, ['a', 'b', 'c'][index]));

  root.emit('keydown', keyboard(elements[1], 'ArrowUp'));
  assert.deepEqual(reorder.getSnapshot().state.ids, ['b', 'a', 'c']);
  assert.equal(elements[1].attributes.get('aria-posinset'), '1');

  root.emit('pointerdown', pointer(elements[1], 1, 5));
  root.emit('pointermove', pointer(elements[2], 1, 115));
  root.emit('pointerup', pointer(elements[2], 1, 115));
  assert.deepEqual(reorder.getSnapshot().state.ids, ['a', 'c', 'b']);
  assert.deepEqual(changes, [['b', 'a', 'c'], ['a', 'c', 'b']]);
  reorder.disconnect();
});

test('DOM tree reorder supports sibling movement, indent, and outdent', () => {
  const root = new FakeElement();
  const a = new FakeElement(0);
  const b = new FakeElement(40);
  const c = new FakeElement(80);
  const reorder = createReorder({
    root,
    nodes: [
      { id: 'a', parentID: null },
      { id: 'b', parentID: null },
      { id: 'c', parentID: null },
    ],
  });
  reorder.setItemAttributes(a, 'a');
  reorder.setItemAttributes(b, 'b');
  reorder.setItemAttributes(c, 'c');

  root.emit('keydown', keyboard(c, 'ArrowUp'));
  assert.deepEqual(reorder.getSnapshot().state.nodes.map((node) => node.id), ['a', 'c', 'b']);
  root.emit('keydown', keyboard(c, 'ArrowRight'));
  assert.equal(reorder.getSnapshot().state.nodes.find((node) => node.id === 'c').parentID, 'a');
  root.emit('keydown', keyboard(c, 'ArrowLeft'));
  assert.equal(reorder.getSnapshot().state.nodes.find((node) => node.id === 'c').parentID, null);
});

test('DOM reorder releases removed items, active captures and queued focus across replacement churn', async () => {
  for (const tree of [false, true]) {
    const root = new FakeElement();
    const options = tree
      ? { nodes: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }] }
      : { ids: ['a', 'b'] };
    const reorder = createReorder({ root, ...options });
    const b = new FakeElement(40);
    reorder.setItemAttributes(b, 'b');
    for (let cycle = 0; cycle < 20; cycle += 1) {
      const old = new FakeElement();
      const replacement = new FakeElement();
      reorder.setItemAttributes(old, 'a');
      root.emit('keydown', keyboard(old, 'End'));
      root.emit('pointerdown', pointer(old, cycle, 0));
      assert.equal(root.capture, cycle);
      assert.equal(old.focused, true);
      old.focused = false; // Distinguish accepted pointer focus from stale queued restoration below.
      reorder.setItemAttributes(replacement, 'a');
      assert.equal(root.capture, null);
      reorder.removeItem(old);
      let writes = 0;
      old.setAttribute = () => { writes += 1; };
      if (tree) reorder.syncOrder(options.nodes);
      else reorder.syncOrder(options.ids);
      await Promise.resolve();
      assert.equal(old.focused, false);
      assert.equal(replacement.focused, false, 'stale queued focus stays with its original host');
      assert.equal(writes, 0);
      root.emit('pointerdown', pointer(replacement, cycle, 0));
      reorder.removeItem(replacement);
      reorder.removeItem(replacement);
      assert.equal(root.capture, null);
    }
    root.emit('pointerdown', pointer(b, 100, 40));
    root.capture = null; // The platform can release capture before owner cleanup.
    reorder.disconnect();
    reorder.disconnect();
    assert.equal(root.capture, null);
    assert.equal([...root.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
  }
});

test('DOM controlled Reorder proposes from committed order until explicit synchronization', () => {
  for (const tree of [false, true]) {
    const root = new FakeElement();
    const initial = tree
      ? [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }]
      : ['a', 'b'];
    const changes = [];
    const reorder = createReorder({ root, controlled: true,
      ...(tree ? { nodes: initial } : { ids: initial }), onOrderChange: (order) => changes.push(order),
    });
    const a = new FakeElement();
    reorder.setItemAttributes(a, 'a');
    const read = () => tree ? reorder.getSnapshot().state.nodes : reorder.getSnapshot().state.ids;
    let writes = 0;
    const write = a.setAttribute.bind(a);
    a.setAttribute = (name, value) => { writes += 1; write(name, value); };
    root.emit('keydown', keyboard(a, 'End'));
    assert.equal(writes, 0, 'uncommitted proposals retain the current DOM projection');
    assert.deepEqual(read(), initial);
    assert.equal(a.attributes.get('aria-posinset'), '1');
    assert.equal(changes.length, 1);
    assert.deepEqual(changes[0].map((item) => tree ? item.id : item), tree ? ['root', 'b', 'a'] : ['b', 'a']);
    root.emit('keydown', keyboard(a, 'End'));
    assert.deepEqual(changes[1], changes[0], 'a rejected proposal does not become the next event base');
    const accepted = reorder.syncOrder(changes[0]);
    assert.equal(accepted.ok, true);
    assert.equal(a.attributes.get('aria-posinset'), '2');
    const committed = read();
    const invalid = tree ? reorder.syncOrder([{ id: 'a', parentID: 'missing' }]) : reorder.syncOrder(['a', 'a']);
    assert.equal(invalid.ok, false);
    assert.equal(read(), committed);
    root.emit('keydown', keyboard(a, 'Home'));
    assert.deepEqual(read(), committed);
    reorder.disconnect();
  }
});

test('DOM controlled tree reorder proposes a complete batch and only projects accepted membership', () => {
  const root = new FakeElement(), changes = [];
  const nodes = [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }, { id: 'b', parentID: 'left' }];
  const reorder = createReorder({ root, nodes, controlled: true, onOrderChange: value => changes.push(value) });
  const a = new FakeElement(), b = new FakeElement(); reorder.setItemAttributes(a, 'a'); reorder.setItemAttributes(b, 'b');
  try {
    const initial = reorder.getSnapshot().state;
    const event = { type: 'move-nodes', ids: ['b','a'], parentID: 'right' };
    assert.equal(reorder.handleEvent(event), true); assert.equal(changes.length, 1);
    assert.equal(reorder.getSnapshot().state, initial);
    assert.deepEqual(changes[0].filter(node => node.parentID === 'right').map(node => node.id), ['b','a']);
    assert.equal(a.attributes.get('aria-posinset'), '1');
    assert.equal(reorder.handleEvent(event), true); assert.deepEqual(changes[1], changes[0]);
    assert.equal(reorder.syncOrder(changes[0]).ok, true);
    assert.equal(a.attributes.get('aria-posinset'), '2'); assert.equal(b.attributes.get('aria-posinset'), '1');
    const committed = reorder.getSnapshot().state;
    assert.equal(reorder.handleEvent({ type: 'move-nodes', ids: ['a','missing'], parentID: 'left' }), false);
    assert.equal(reorder.getSnapshot().state, committed); assert.equal(changes.length, 2);
  } finally { reorder.disconnect(); }
});

test('DOM Reorder registration and complete projections scale with mounted output at 1k and 4k items', () => {
  for (const size of [1_000, 4_000]) for (const tree of [false, true]) {
    const root = new FakeElement();
    const ids = Array.from({ length: size }, (_, index) => `item-${index}`);
    const nodes = ids.map((id, index) => ({ id, parentID: index % 100 === 0 ? null : ids[index - index % 100] }));
    const reorder = createReorder({ root, ...(tree ? { nodes } : { ids }) });
    let positionWrites = 0;
    const elements = ids.map(() => {
      const element = new FakeElement();
      const write = element.setAttribute.bind(element);
      element.setAttribute = (name, value) => { if (name === 'aria-posinset') positionWrites += 1; write(name, value); };
      return element;
    });
    const originals = Object.fromEntries(['indexOf', 'find', 'filter'].map((name) => [name, Array.prototype[name]]));
    let rawScans = 0;
    try {
      for (const name of Object.keys(originals)) Array.prototype[name] = function (...args) {
        const state = reorder.getSnapshot().state;
        if (this === (tree ? state.nodes : state.ids)) rawScans += this.length;
        return originals[name].apply(this, args);
      };
      elements.forEach((element, index) => reorder.setItemAttributes(element, ids[index]));
      assert.equal(positionWrites, size, 'registration projects each mounted item exactly once');
      positionWrites = 0;
      const result = tree ? reorder.syncOrder(nodes) : reorder.syncOrder(ids);
      assert.equal(result.ok, true);
      assert.equal(positionWrites, size, 'one replacement projects mounted output once');
      assert.equal(rawScans, 0, 'canonical item projection borrows indexed owners');
      assert.equal(elements[99].attributes.get('aria-posinset'), tree ? '99' : '100');
      if (tree) {
        assert.equal(elements[99].attributes.get('aria-level'), '2');
        assert.equal(elements[99].attributes.get('aria-setsize'), '99');
      }
    } finally {
      for (const name of Object.keys(originals)) Array.prototype[name] = originals[name];
      reorder.disconnect();
    }
  }
});

test('DOM Reorder routes nested items and preserves handle and native input ownership', () => {
  const root = new FakeElement();
  const a = new FakeElement();
  const b = new FakeElement(); b.parentElement = a;
  const c = new FakeElement(); c.parentElement = a;
  const leaf = new FakeElement(); leaf.parentElement = b;
  const tree = createReorder({ root, nodes: [{ id: 'a', parentID: null }, { id: 'b', parentID: 'a' }, { id: 'c', parentID: 'a' }] });
  tree.setItemAttributes(a, 'a'); tree.setItemAttributes(b, 'b'); tree.setItemAttributes(c, 'c');
  root.emit('keydown', keyboard(leaf, 'End'));
  assert.deepEqual(tree.getSnapshot().state.nodes.map(node => node.id), ['a', 'c', 'b']);
  tree.disconnect();

  const handle = new FakeElement(); handle.parentElement = a;
  handle.setAttribute('data-sectile-reorder-handle', ''); handle.interactive = true;
  const input = new FakeElement(); input.parentElement = a; input.interactive = true;
  const reorder = createReorder({ root, ids: ['a', 'b'], handleOnly: true, label: 'Ordre', roleDescription: 'triable' });
  reorder.setItemAttributes(a, 'a'); reorder.setItemAttributes(b, 'b');
  assert.equal(root.attributes.get('aria-label'), 'Ordre');
  assert.equal(root.attributes.get('aria-roledescription'), 'triable');
  root.emit('pointerdown', pointer(a, 1, 0));
  root.emit('pointerdown', pointer(input, 1, 0));
  root.emit('keydown', keyboard(input, 'End'));
  assert.equal(root.capture, null);
  assert.deepEqual(reorder.getSnapshot().state.ids, ['a', 'b']);
  root.emit('pointerdown', pointer(handle, 7, 0));
  assert.equal(root.capture, 7);
  assert.equal(handle.focused, true);
  root.emit('pointerdown', pointer(handle, 8, 0));
  root.emit('pointercancel', pointer(handle, 8, 0));
  assert.equal(root.capture, 7);
  root.capture = null;
  root.emit('lostpointercapture', pointer(handle, 7, 0));
  root.emit('pointerdown', pointer(handle, 8, 0));
  assert.equal(root.capture, 8);
  root.emit('pointercancel', pointer(handle, 8, 0));
  handle.setAttribute('disabled', '');
  root.emit('pointerdown', pointer(handle, 9, 0));
  assert.equal(root.capture, null);
  reorder.disconnect();
  const disabled = createReorder({ root, ids: ['a'], disabled: true });
  disabled.setItemAttributes(a, 'a');
  root.emit('pointerdown', pointer(a, 10, 0));
  assert.equal(root.capture, null);
  disabled.disconnect();
});

test('DOM Reorder does not acquire a gesture after focus retires its origin', () => {
  for (const retirement of ['remove', 'disconnect']) {
    const root = new FakeElement(), item = new FakeElement(), handle = new FakeElement();
    handle.parentElement = item; handle.setAttribute('data-sectile-reorder-handle', '');
    const reorder = createReorder({ root, ids: ['a'], handleOnly: true });
    reorder.setItemAttributes(item, 'a');
    handle.focus = () => { if (retirement === 'remove') reorder.removeItem(item); else reorder.disconnect(); };
    root.emit('pointerdown', pointer(handle, 1, 0));
    assert.equal(root.capture, null);
    reorder.disconnect();
    assert.equal([...root.listeners.values()].reduce((total, listeners) => total + listeners.size, 0), 0);
  }
});

test('DOM Reorder target routing is ancestor-bounded and reidentification releases the old binding', () => {
  for (const size of [1_000, 4_000]) {
    const root = new FakeElement();
    const ids = Array.from({ length: size }, (_, index) => `id-${index}`);
    const reorder = createReorder({ root, ids });
    const elements = ids.map(id => { const element = new FakeElement(); reorder.setItemAttributes(element, id); return element; });
    const leaf = new FakeElement(); leaf.parentElement = elements.at(-1);
    root.emit('keydown', keyboard(leaf, 'End'));
    assert.equal(leaf.parentReads, 2);
    assert.equal(elements.reduce((sum, element) => sum + element.containsReads, 0), 0);
    const recycled = elements[0];
    reorder.setItemAttributes(recycled, ids.at(-1));
    reorder.removeItem(elements.at(-1));
    root.emit('keydown', keyboard(recycled, 'Home'));
    assert.equal(reorder.getSnapshot().state.ids[0], ids.at(-1));
    reorder.disconnect();
    assert.equal([...root.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
  }
});

function keyboard(target, key) {
  return { target, key, altKey: true, ctrlKey: false, metaKey: false, preventDefault() {} };
}

const boardNodes = [{ id: 'todo', parentID: null }, { id: 'doing', parentID: null }, { id: 'done', parentID: null },
  { id: 'a', parentID: 'todo' }, { id: 'b', parentID: 'todo' }, { id: 'c', parentID: 'doing' }];

test('Reorder columns translates inline card/header moves, root guards and native key passthrough', async () => {
  for (const direction of ['ltr','rtl']) {
    const board = columnsFixture({ direction });
    try {
      const forward = direction === 'ltr' ? 'ArrowRight' : 'ArrowLeft';
      board.root.emit('keydown', keyboard(board.rows.get('a'), forward));
      assert.equal(board.owner.getSnapshot().state.nodes.find(node => node.id === 'a').parentID, 'doing');
      board.root.emit('keydown', keyboard(board.rows.get('todo'), forward));
      assert.deepEqual(board.owner.getSnapshot().state.nodes.filter(node => node.parentID === null).map(node => node.id), ['doing','todo','done']);
      assert.equal(board.owner.handleEvent({ type: 'move-node', id: 'a', parentID: 'c' }), false);
      assert.equal(board.owner.handleEvent({ type: 'move-node', id: 'a', parentID: null }), false);
      const before = board.owner.getSnapshot();
      for (const extra of [{ isComposing: true }, { shiftKey: true }, { ctrlKey: true }, { metaKey: true }]) {
        board.root.emit('keydown', { ...keyboard(board.rows.get('b'), forward), ...extra });
      }
      const input = new FakeElement(); input.parentElement = board.rows.get('b'); input.interactive = true;
      board.root.emit('keydown', keyboard(input, forward)); assert.equal(board.owner.getSnapshot(), before);
      await Promise.resolve(); assert.equal(board.rows.get('a').focused, false, 'latest header focus replaces the pending card focus');
      assert.equal(board.rows.get('todo').focused, true);
    } finally { board.owner.disconnect(); }
  }
});

test('Reorder availability queries accepted state without publishing controlled proposals or DOM effects', () => {
  let updates = 0, proposals = 0;
  const board = columnsFixture({ controlled: true, onUpdate: () => updates++, onOrderChange: () => proposals++, policies: { capacity: parent => parent === 'done' ? 0 : undefined } });
  try {
    const before = board.owner.getSnapshot(), reads = { parent: 0, before: 0 };
    assert.equal(board.owner.canMove('a', { parentID: 'done' }), false);
    assert.equal(board.owner.canMove('a', { get parentID() { reads.parent++; return 'doing'; }, get beforeID() { reads.before++; return 'c'; } }), true);
    assert.equal(board.owner.canMove('todo', { parentID: 'doing' }), false);
    assert.deepEqual(reads, { parent: 1, before: 1 }); assert.equal(board.owner.getSnapshot(), before);
    assert.equal(updates, 0); assert.equal(proposals, 0); assert.equal(board.rows.get('a').focused, false);
    assert.equal(board.owner.handleEvent({ type: 'move-node', id: 'a', parentID: 'doing' }), true);
    assert.equal(proposals, 1); assert.equal(board.owner.getSnapshot().state, before.state);
    assert.equal(board.owner.getSnapshot().revision, before.revision + 1);
  } finally { board.owner.disconnect(); }
});
test('Reorder availability refuses unavailable hosts and fences target or policy retirement', () => {
  const unread = { get parentID() { throw Error('unavailable target'); } };
  for (const options of [{ disabled: true }, { readOnly: true }]) {
    const board = columnsFixture(options);
    try { assert.equal(board.owner.canMove('a', unread), false); } finally { board.owner.disconnect(); }
  }
  const retired = columnsFixture(); retired.owner.disconnect(); assert.equal(retired.owner.canMove('a', unread), false);
  const fromTarget = columnsFixture();
  assert.equal(fromTarget.owner.canMove('a', { get parentID() { fromTarget.owner.disconnect(); return 'done'; }, get beforeID() { throw Error('late target'); } }), false);
  let board;
  board = columnsFixture({ policies: { canMove: () => { board.owner.disconnect(); return true; } } });
  assert.equal(board.owner.canMove('a', { parentID: 'done' }), false);
});
test('Reorder availability shares the policy reentrancy lock and releases it after application failure', () => {
  let board, fail = false; const failure = Error('availability permission');
  board = columnsFixture({ policies: { canMove: () => {
    if (fail) throw failure;
    assert.equal(board.owner.canMove('b', { parentID: 'done' }), false);
    assert.equal(board.owner.handleEvent({ type: 'move-node', id: 'b', parentID: 'done' }), false);
    assert.equal(board.owner.syncOrder(boardNodes).ok, false);
    return true;
  } } });
  try {
    const before = board.owner.getSnapshot(); fail = true;
    assert.throws(() => board.owner.canMove('a', { parentID: 'done' }), error => error === failure);
    fail = false; assert.equal(board.owner.canMove('a', { parentID: 'done' }), true); assert.equal(board.owner.getSnapshot(), before);
    assert.equal(board.owner.handleEvent({ type: 'move-node', id: 'a', parentID: 'done' }), true);
  } finally { board.owner.disconnect(); }
});

test('Reorder drag feedback caches a logical destination and rechecks admission at commit', () => {
  let queries = 0, allowed = true, writes = 0;
  const board = columnsFixture({ orientation: 'horizontal', policies: { canMove: () => { queries++; return allowed; } } });
  const source = board.rows.get('a'), target = board.rows.get('done'), set = target.setAttribute.bind(target);
  source.setAttribute('data-sectile-reorder-dragging', 'authored');
  target.setAttribute('data-sectile-reorder-drop', 'authored');
  target.setAttribute = (name, value) => { if (name.startsWith('data-sectile-reorder-drop')) writes++; set(name, value); };
  try {
    board.hit(target); const before = board.owner.getSnapshot();
    board.root.emit('pointerdown', pointer(source, 1, 0)); assert.equal(source.getAttribute('data-sectile-reorder-dragging'), '');
    board.root.emit('pointermove', pointer(board.root, 1, 100));
    assert.equal(target.getAttribute('data-sectile-reorder-drop'), 'inside');
    assert.equal(target.getAttribute('data-sectile-reorder-drop-axis'), 'horizontal');
    assert.equal(target.getAttribute('data-sectile-reorder-drop-allowed'), 'true');
    assert.equal(queries, 1); assert.equal(writes, 3);
    for (let index = 0; index < 100; index++) board.root.emit('pointermove', pointer(board.root, 1, 101 + index));
    assert.equal(queries, 1); assert.equal(writes, 3); assert.equal(board.owner.getSnapshot(), before);
    allowed = false; board.root.emit('pointerup', pointer(board.root, 1, 100));
    assert.equal(queries, 2); assert.equal(board.owner.getSnapshot().state, before.state);
    assert.equal(source.getAttribute('data-sectile-reorder-dragging'), 'authored');
    assert.equal(target.getAttribute('data-sectile-reorder-drop'), 'authored');
    assert.equal(target.getAttribute('data-sectile-reorder-drop-axis'), null); assert.equal(board.root.capture, null);
  } finally { board.owner.disconnect(); }
});
test('Reorder drag feedback distinguishes refused placement and conditionally restores switched targets', () => {
  const board = columnsFixture({ policies: { capacity: parent => parent === 'done' ? 0 : undefined } });
  const source = board.rows.get('a'), blocked = board.rows.get('done'), next = board.rows.get('c');
  try {
    board.hit(blocked); board.root.emit('pointerdown', pointer(source, 2, 0)); board.root.emit('pointermove', pointer(board.root, 2, 100));
    assert.equal(blocked.getAttribute('data-sectile-reorder-drop-allowed'), 'false');
    blocked.setAttribute('data-sectile-reorder-drop-axis', 'external');
    board.hit(next); board.root.emit('pointermove', pointer(board.root, 2, 0));
    assert.equal(blocked.getAttribute('data-sectile-reorder-drop'), null); assert.equal(blocked.getAttribute('data-sectile-reorder-drop-axis'), 'external');
    assert.equal(next.getAttribute('data-sectile-reorder-drop'), 'before'); assert.equal(next.getAttribute('data-sectile-reorder-drop-allowed'), 'true');
    board.root.emit('pointercancel', pointer(board.root, 2, 0));
    assert.equal(source.getAttribute('data-sectile-reorder-dragging'), null); assert.equal(next.getAttribute('data-sectile-reorder-drop'), null);
    assert.equal(board.root.capture, null);
  } finally { board.owner.disconnect(); }
});
test('Reorder drag feedback follows explicit virtual anchors and releases their retired host', () => {
  const board = columnsFixture(), zone = new FakeElement(); zone.parentElement = board.rows.get('doing');
  try {
    board.owner.removeItem(board.rows.get('c')); board.owner.setDropTarget(zone, { parentID: 'doing', beforeID: 'c' });
    for (const row of board.rows.values()) row.getBoundingClientRect = () => { throw Error('explicit target must not scan mounted geometry'); };
    board.hit(zone); board.root.emit('pointerdown', pointer(board.rows.get('a'), 3, 0)); board.root.emit('pointermove', pointer(board.root, 3, 0));
    assert.equal(zone.getAttribute('data-sectile-reorder-drop'), 'before'); assert.equal(zone.getAttribute('data-sectile-reorder-drop-allowed'), 'true');
    assert.equal(zone.getAttribute('data-sectile-reorder-drop-axis'), 'vertical');
    board.owner.removeDropTarget(zone); assert.equal(zone.attributes.size, 0); assert.equal(board.root.capture, null);
    assert.equal(board.rows.get('a').getAttribute('data-sectile-reorder-dragging'), null);
  } finally { board.owner.disconnect(); }
});
test('Reorder drag feedback stops retired attribute tails and drains cleanup despite a host failure', () => {
  for (const mode of ['retire', 'write-failure', 'restore-failure']) {
    const board = columnsFixture(), source = board.rows.get('a'), target = board.rows.get('done');
    const set = target.setAttribute.bind(target), remove = source.removeAttribute.bind(source);
    try {
      board.hit(target); board.root.emit('pointerdown', pointer(source, 4, 0));
      if (mode !== 'restore-failure') target.setAttribute = (name, value) => {
        set(name, value); if (name !== 'data-sectile-reorder-drop') return;
        if (mode === 'retire') board.owner.disconnect(); else throw Error('feedback write failure');
      };
      if (mode === 'write-failure') assert.throws(() => board.root.emit('pointermove', pointer(board.root, 4, 100)), /feedback write failure/);
      else board.root.emit('pointermove', pointer(board.root, 4, 100));
      if (mode === 'restore-failure') {
        source.removeAttribute = name => { remove(name); if (name === 'data-sectile-reorder-dragging') throw Error('feedback restore failure'); };
        assert.throws(() => board.owner.disconnect(), /feedback restore failure/);
      }
      assert.equal(board.root.capture, null); assert.equal(source.getAttribute('data-sectile-reorder-dragging'), null);
      assert.equal(target.getAttribute('data-sectile-reorder-drop'), null); assert.equal(target.getAttribute('data-sectile-reorder-drop-axis'), null);
      assert.equal(target.getAttribute('data-sectile-reorder-drop-allowed'), null);
    } finally { board.owner.disconnect(); }
    assert.equal([...board.root.listeners.values()].reduce((sum, values) => sum + values.size, 0), 0);
  }
});
test('Reorder drag cleanup fences reentrant capture and allows a later fresh drag', () => {
  const board = columnsFixture(), target = board.rows.get('done'), next = board.rows.get('b');
  const remove = target.removeAttribute.bind(target);
  try {
    board.hit(target); board.root.emit('pointerdown', pointer(board.rows.get('a'), 5, 0)); board.root.emit('pointermove', pointer(board.root, 5, 100));
    target.removeAttribute = name => { remove(name); board.root.emit('pointerdown', pointer(next, 6, 0)); };
    board.root.emit('lostpointercapture', pointer(board.root, 5, 0));
    assert.equal(board.root.capture, null); assert.equal(next.getAttribute('data-sectile-reorder-dragging'), null);
    target.removeAttribute = remove; board.root.emit('pointerdown', pointer(next, 7, 0));
    assert.equal(board.root.capture, 7); assert.equal(next.getAttribute('data-sectile-reorder-dragging'), '');
    board.root.emit('pointercancel', pointer(board.root, 7, 0)); assert.equal(next.getAttribute('data-sectile-reorder-dragging'), null);
  } finally { board.owner.disconnect(); }
});
test('Reorder columns uses canonical explicit positions for empty and virtualized drop targets', () => {
  for (const beforeID of [null,'c']) {
    const board = columnsFixture(), column = beforeID === null ? 'done' : 'doing';
    const zone = new FakeElement(); zone.parentElement = board.rows.get(column);
    try {
      if (beforeID !== null) board.owner.removeItem(board.rows.get('c'));
      for(const row of board.rows.values())row.getBoundingClientRect = () => {throw Error('explicit positions need no mounted geometry scan');};
      board.owner.setDropTarget(zone, { parentID: column, beforeID }); board.hit(zone);
      board.root.emit('pointerdown', pointer(board.rows.get('a'), 7, 0)); assert.equal(board.root.capture, 7);
      board.root.emit('pointermove', pointer(board.root, 7, 100));
      board.root.emit('pointerup', pointer(board.root, 7, 100)); assert.equal(board.root.capture, null);
      const nodes = board.owner.getSnapshot().state.nodes;
      assert.equal(nodes.find(node => node.id === 'a').parentID, column);
      assert.deepEqual(nodes.filter(node => node.parentID === column).map(node => node.id), beforeID === null ? ['a'] : ['a','c']);
    } finally { board.owner.disconnect(); }
  }
});

test('Reorder columns places headers by inline geometry even when a card is the physical hit', () => {
  for (const direction of ['ltr','rtl']) {
    const board = columnsFixture({ direction });
    try {
      board.rows.get('doing').getBoundingClientRect = () => ({left:200,top:0,width:100,height:300}); board.hit(board.rows.get('c'));
      board.root.emit('pointerdown',pointer(board.rows.get('todo'),5,0));
      board.root.emit('pointermove',{...pointer(board.root,5,100),clientX:direction === 'ltr' ? 280 : 220});
      board.root.emit('pointerup',pointer(board.root,5,100));
      assert.deepEqual(board.owner.getSnapshot().state.nodes.filter(node=>node.parentID === null).map(node=>node.id),['doing','todo','done']);
      assert.equal(board.owner.getSnapshot().state.nodes.find(node=>node.id === 'c').parentID,'doing');
    } finally {board.owner.disconnect();}
  }
});

test('Reorder target identity survives unchanged registration but retires replacement, release and source changes', () => {
  const board = columnsFixture(), zone = new FakeElement(); zone.parentElement = board.rows.get('done');
  const begin = pointerID => { board.owner.setDropTarget(zone, { parentID: 'done' }); board.hit(zone);
    board.root.emit('pointerdown', pointer(board.rows.get('a'), pointerID, 0)); board.root.emit('pointermove', pointer(board.root, pointerID, 0)); };
  try {
    const before = board.owner.getSnapshot(); begin(1); board.owner.setDropTarget(zone, { parentID: 'done' }); assert.equal(board.root.capture, 1);
    board.owner.setDropTarget(zone, { parentID: 'doing', beforeID: 'c' }); assert.equal(board.root.capture, null);
    board.root.emit('pointerup', pointer(board.root, 1, 0)); assert.equal(board.owner.getSnapshot(), before);
    begin(2); board.owner.removeDropTarget(zone); assert.equal(board.root.capture, null);
    begin(4); const release = board.root.releasePointerCapture.bind(board.root);
    board.root.releasePointerCapture = pointerID => {release(pointerID);board.owner.syncOrder([...boardNodes,{id:'extra',parentID:'todo'}]);};
    board.root.emit('pointerup',pointer(board.root,4,0));board.root.releasePointerCapture=release;
    assert.equal(board.owner.getSnapshot().state.nodes.find(node=>node.id==='a').parentID,'todo','source replacement during capture release invalidates the pending drop');
    begin(3); assert.equal(board.owner.syncOrder([...boardNodes, { id: 'nested', parentID: 'a' }]).ok, false); assert.equal(board.root.capture, 3);
    assert.equal(board.owner.syncOrder(boardNodes.filter(node => node.id !== 'done')).ok, true); assert.equal(board.root.capture, null);
    board.root.emit('pointerup', pointer(board.root, 3, 0)); assert.equal(board.owner.getSnapshot().state.nodes.find(node => node.id === 'a').parentID, 'todo');
  } finally { board.owner.disconnect(); }
});

test('Reorder columns keeps controlled proposals, capacity/read-only refusal and synchronous acceptance coherent', () => {
  const proposals = [], board = columnsFixture({ controlled: true, onOrderChange: nodes => proposals.push(nodes), policies: { capacity: () => 2 } });
  try {
    const before = board.owner.getSnapshot().state;
    assert.equal(board.owner.handleEvent({ type: 'move-node', id: 'a', parentID: 'doing' }), true);
    assert.equal(board.owner.getSnapshot().state, before); assert.equal(proposals.length, 1);
    assert.equal(board.owner.syncOrder(proposals[0]).ok, true);
    assert.equal(board.owner.handleEvent({ type: 'move-node', id: 'b', parentID: 'doing' }), false);
  } finally { board.owner.disconnect(); }
  let accepted;
  const sync = columnsFixture({ controlled: true, onOrderChange: nodes => { accepted = sync.owner.syncOrder(nodes); } });
  try { sync.root.emit('keydown', keyboard(sync.rows.get('a'), 'ArrowRight')); assert.equal(accepted.ok, true);
    assert.equal(sync.owner.getSnapshot().state.nodes.find(node => node.id === 'a').parentID, 'doing');
  } finally { sync.owner.disconnect(); }
  for (const flag of ['disabled','readOnly']) {
    const blocked = columnsFixture({ [flag]: true });
    try { const before = blocked.owner.getSnapshot(); blocked.root.emit('keydown', keyboard(blocked.rows.get('a'), 'ArrowRight'));
      blocked.root.emit('pointerdown', pointer(blocked.rows.get('a'), 1, 0)); assert.equal(blocked.root.capture, null);
      assert.equal(blocked.owner.handleEvent({ type: 'move-node', id: 'a', parentID: 'doing' }), false); assert.equal(blocked.owner.getSnapshot(), before);
      if(flag === 'readOnly') {assert.equal(blocked.root.attributes.get('aria-readonly'),undefined);assert.equal(blocked.root.attributes.get('data-readonly'),'true');}
    } finally { blocked.owner.disconnect(); }
  }
});

test('Reorder columns restores owned attributes and drains acquisition/disposal failure paths', async () => {
  const board = columnsFixture({}, (root,rows) => { root.setAttribute('aria-label','authored'); root.setAttribute('aria-roledescription','original'); rows.get('a').setAttribute('aria-posinset','original-position'); });
  const listener = [...board.root.listeners.get('keydown')][0];
  assert.equal(board.root.attributes.get('aria-label'), 'authored'); assert.equal([...board.root.listeners.values()].reduce((sum,set) => sum + set.size,0),7);
  assert.throws(()=>board.owner.setItemAttributes(board.root,'todo'),/own item/);
  board.root.emit('keydown', keyboard(board.rows.get('a'),'End')); board.rows.get('b').setAttribute('aria-posinset','external');
  board.root.emit('pointerdown',pointer(board.rows.get('a'),1,0));
  assert.equal(board.rows.get('a').focused,true); board.rows.get('a').focused = false;
  board.root.releasePointerCapture = () => { board.root.capture = null; throw Error('capture cleanup failure'); };
  assert.throws(() => board.owner.disconnect(), /capture cleanup failure/);
  assert.equal([...board.root.listeners.values()].reduce((sum,set) => sum + set.size,0),0);
  assert.equal(board.root.attributes.get('aria-roledescription'),'original'); assert.equal(board.rows.get('a').attributes.get('aria-posinset'),'original-position');
  assert.equal(board.rows.get('b').attributes.get('aria-posinset'),'external'); await Promise.resolve(); assert.equal(board.rows.get('a').focused,false);
  listener({ get target() { throw Error('retired event'); } }); board.owner.disconnect();
  assert.equal(board.owner.handleEvent({ get type() { throw Error('retired event'); } }),false);
  const root = new FakeElement(), add = root.addEventListener; root.ownerDocument = {};
  root.addEventListener = function(name,listener) { add.call(this,name,listener); if(name === 'pointermove')throw Error('acquisition failure'); };
  assert.throws(() => createReorder({ root, layout:'columns', nodes:boardNodes }),/acquisition failure/);
  assert.equal([...root.listeners.values()].reduce((sum,set) => sum + set.size,0),0); assert.equal(root.attributes.size,0);
});

test('Reorder column policy retirement and reentrant admission cannot publish stale moves', () => {
  let board, reentrant, synchronized;
  board = columnsFixture({ policies: { canMove: () => { reentrant = board.owner.handleEvent({ type:'move-node',id:'b',parentID:'doing' });
    synchronized = board.owner.syncOrder(boardNodes); board.owner.disconnect(); return true; } } });
  const before = board.owner.getSnapshot();
  assert.equal(board.owner.handleEvent({ type:'move-node',id:'a',parentID:'doing' }),false);
  assert.equal(reentrant,false); assert.equal(synchronized.ok,false); assert.equal(board.owner.getSnapshot(),before);
});

test('Reorder columns stops projection and hit-testing tails when a host callback retires it', () => {
  const board = columnsFixture(), row = new FakeElement(); row.parentElement = board.rows.get('todo');
  row.setAttribute = () => { board.owner.disconnect(); };
  board.owner.setItemAttributes(row,'a');
  assert.equal([...board.root.listeners.values()].reduce((sum,set)=>sum+set.size,0),0);
  board.owner.setDropTarget(row,{get parentID(){throw Error('retired registration');}});
  const hit = columnsFixture(); hit.root.ownerDocument.elementFromPoint = () => {hit.owner.disconnect();return hit.rows.get('done');};
  hit.root.emit('pointerdown',pointer(hit.rows.get('a'),9,0));
  assert.doesNotThrow(()=>hit.root.emit('pointermove',pointer(hit.root,9,0)));
  assert.equal(hit.root.capture,null);assert.equal([...hit.root.listeners.values()].reduce((sum,set)=>sum+set.size,0),0);
});

test('held retired column Reorder methods/listeners release roots and application payloads',{skip:typeof global.gc !== 'function'},async () => {
  for(const duringReplacement of [false,true]) {
    const retained = retiredColumns(duringReplacement); retained.owner.disconnect();
    for(let turn=0;turn<25;turn++){ await new Promise(resolve=>setImmediate(resolve)); global.gc(); }
    assert.equal(retained.root.deref(),undefined); assert.equal(retained.payload.deref(),undefined);
    retained.listener({ get target(){throw Error('retired listener');} });
    assert.equal(retained.owner.handleEvent({ get type(){throw Error('retired method');} }),false);
  }
});
function retiredColumns(duringReplacement) {
  const payload = { message:'application payload' }, board = columnsFixture({ onUpdate:()=>payload, onOrderChange:()=>payload,
    policies:{canMove:()=>!!payload,capacity:()=>payload.message.length} });
  const zone = new FakeElement(); zone.parentElement = board.rows.get('done'); board.owner.setDropTarget(zone,{parentID:'done'});
  board.hit(zone); board.root.emit('pointerdown', pointer(board.rows.get('a'), 8, 0)); board.root.emit('pointermove', pointer(board.root, 8, 0));
  const listener = [...board.root.listeners.get('keydown')][0];
  if(duringReplacement) {
    board.rows.get('a').removeAttribute = () => {board.owner.disconnect();};
    const replacement = new FakeElement();replacement.parentElement=board.rows.get('todo');board.owner.setItemAttributes(replacement,'a');
  }
  return { owner:board.owner,root:new WeakRef(board.root),payload:new WeakRef(payload),listener };
}
function columnsFixture(options = {}, prepare) {
  const root = new FakeElement(), rows = new Map(), nodes = options.nodes ?? boardNodes;
  let hit = null; root.ownerDocument = { elementFromPoint:()=>hit };
  for(const node of nodes) rows.set(node.id,new FakeElement());
  for(const node of nodes) { const row = rows.get(node.id); row.parentElement = node.parentID === null ? root : rows.get(node.parentID); }
  prepare?.(root,rows);
  const owner = createReorder({ ...options,root,nodes,layout:'columns' });
  for(const[id,row]of rows)owner.setItemAttributes(row,id);
  return { root,rows,owner,hit:element=>{hit=element;} };
}
function pointer(target, pointerId, clientY) {
  return { target, pointerId, clientX: 0, clientY, button: 0, preventDefault() {} };
}

test('Reorder preview composes existing keyboard moves and publishes one final proposal in every layout', () => {
  for (const layout of ['sequence', 'tree', 'columns']) for (const controlled of [false, true]) {
    const root = new FakeElement(), changes = [], lifecycle = [];
    const nodes = [{ id: 'root', parentID: null }, ...['a','b','c'].map(id => ({ id, parentID: 'root' }))];
    const owner = createReorder({ root, keyboardMode: 'preview', controlled,
      ...(layout === 'sequence' ? { ids: ['a','b','c'] } : { nodes, layout }),
      onOrderChange: value => changes.push(value), onInteractionChange: change => lifecycle.push(change) });
    const a = new FakeElement(); a.parentElement = root; owner.setItemAttributes(a, 'a');
    const key = name => root.emit('keydown', { target: a, key: name, preventDefault() {} });
    const initial = owner.getSnapshot().state;
    key(' '); key('ArrowDown'); key('ArrowDown');
    assert.equal(owner.getSnapshot().state, initial); assert.equal(changes.length, 0);
    const preview = owner.getPreviewState(); assert.equal(preview.ok, true);
    assert.equal(owner.getPreviewState(), preview, 'full preview is borrowed until the proposal changes');
    assert.deepEqual((preview.value.ids ?? preview.value.nodes.map(node => node.id)).slice(-3), ['b','c','a']);
    assert.equal(owner.getInteractionSnapshot().sourceID, 'a');
    key('Enter'); assert.equal(changes.length, 1);
    assert.equal(owner.getInteractionSnapshot().sourceID, null);
    assert.equal(lifecycle.at(-2).type, 'commit'); assert.equal(lifecycle.at(-2).accepted, !controlled); assert.equal(lifecycle.at(-1).type,'end');
    assert.equal(owner.getSnapshot().state === initial, controlled);
    key(' '); key('Home'); key('Escape'); assert.equal(changes.length, 1);
    assert.equal(lifecycle.at(-2).type, 'cancel'); assert.equal(lifecycle.at(-1).type,'end'); owner.disconnect();
  }
});

test('pointer preview admits once per destination, refreshes after external scroll and retires resources', () => {
  const doc = new FakeElement(), view = new FakeElement(); doc.defaultView = view;
  const root = new FakeElement(); root.ownerDocument = doc;
  const a = new FakeElement(), b = new FakeElement(40), changes = [];
  a.parentElement = root; b.parentElement = root;
  let admissions = 0;
  const owner = createReorder({ root, nodes: [{ id:'a',parentID:null },{ id:'b',parentID:null }],
    policies: { canMove: () => { admissions += 1; return true; } }, onOrderChange: value => changes.push(value) });
  owner.setItemAttributes(a,'a'); owner.setItemAttributes(b,'b');
  root.emit('pointerdown',pointer(a,3,0)); root.emit('pointermove',pointer(b,3,55));
  const count = admissions, preview = owner.getPreviewState();
  const afterRead = admissions;
  for(let turn=0;turn<30;turn++) root.emit('pointermove',pointer(b,3,56 + turn / 100));
  assert.equal(admissions,afterRead); assert.equal(owner.getPreviewState(),preview);
  assert.equal(count,1); assert.equal(owner.getSnapshot().revision,0); assert.equal(changes.length,0);
  doc.elementFromPoint=()=>a; owner.refreshDropTarget(); assert.equal(owner.getInteractionSnapshot().allowed,false);
  doc.elementFromPoint=()=>b; owner.refreshDropTarget(); assert.equal(owner.getInteractionSnapshot().allowed,true);
  view.emit('blur',{}); assert.equal(root.capture,null); assert.equal(owner.getInteractionSnapshot().sourceID,null);
  root.emit('pointerdown',pointer(a,4,0)); root.emit('pointermove',pointer(b,4,55));
  owner.syncOrder([{id:'b',parentID:null},{id:'a',parentID:null}]); assert.equal(root.capture,null);
  owner.disconnect();
  for(const element of [root,doc,view]) assert.equal([...element.listeners.values()].reduce((n,set)=>n+set.size,0),0);
});

test('preview callbacks can retire or reject an interaction without publishing an order', () => {
  const root = new FakeElement(), a = new FakeElement(), b = new FakeElement(40); a.parentElement=root;b.parentElement=root;
  let owner, proposals=0;
  owner=createReorder({root,ids:['a','b'],onOrderChange:()=>{proposals++;},onInteractionChange:change=>{if(change.type==='preview')owner.disconnect();}});
  owner.setItemAttributes(a,'a');owner.setItemAttributes(b,'b');
  root.emit('pointerdown',pointer(a,5,0));root.emit('pointermove',pointer(b,5,55));
  assert.equal(root.capture,null); assert.equal(proposals,0); assert.equal(owner.getPreviewState().ok,false);
});

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;
  focused = false;
  interactive = false;
  containsReads = 0;
  parentReads = 0;
  parent = null;
  get parentElement() { this.parentReads += 1; return this.parent; }
  set parentElement(parent) { this.parent = parent; }
  constructor(top = 0) { this.top = top; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  matches() { return this.interactive; }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  contains(target) {
    this.containsReads += 1;
    for (let current = target; current; current = current.parentElement) if (current === this) return true;
    return false;
  }
  getBoundingClientRect() { return { left: 0, top: this.top, width: 100, height: 20 }; }
  capture = null;
  setPointerCapture(pointerID) { this.capture = pointerID; }
  hasPointerCapture(pointerID) { return this.capture === pointerID; }
  releasePointerCapture(pointerID) {
    assert.equal(this.capture, pointerID);
    this.capture = null;
  }
  focus() { this.focused = true; }
}
