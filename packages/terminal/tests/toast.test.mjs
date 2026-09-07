import test from 'node:test'; import assert from 'node:assert/strict'; import { createToast } from '../.verification-dist/toast.js';
test('terminal toast exposes deterministic ticking and Escape dismissal', () => { const toast = createToast({ defaultDurationMs: 1_000 }); toast.push({ id: 'saved', title: 'Saved' }); toast.tick(500); assert.equal(toast.state.items[0].remainingMs, 500); toast.handleKeyboardInput({ key: 'escape' }); assert.equal(toast.state.items.length, 0); });

test('terminal toast completes committed publication and preserves the first thrown value', () => {
  for (const boundary of ['announce', 'items', 'observer', 'update']) {
    for (const firstError of [new Error('first callback'), undefined, null]) {
      const trace = [];
      const call = (name) => { trace.push(name); if (name === boundary) throw firstError; };
      const toast = createToast({
        onAnnounce: () => call('announce'), onItemsChange: () => call('items'),
        onUpdate: () => { call('update'); if (boundary !== 'update') throw new Error('later update'); },
      });
      toast.subscribe(() => call('observer'));
      assert.throws(() => toast.push({ id: 'saved', title: 'Saved' }), (error) => Object.is(error, firstError));
      assert.equal(toast.getSnapshot().revision, 1);
      assert.equal(toast.state.items.length, 1);
      assert.deepEqual(trace, ['announce', 'items', 'observer', 'update']);
      const committed = toast.getSnapshot();
      toast.destroy();
      toast.push({ id: 'late', title: 'Late' });
      assert.equal(toast.send({ type: 'push', toast: { id: 'late', title: 'Late' } }), false);
      assert.equal(toast.getSnapshot(), committed);
      assert.equal(trace.length, 4);
    }
  }
});

test('terminal toast drains overflow, timeout and manual dismiss commands before rethrowing', () => {
  for (const operation of ['overflow', 'timeout', 'dismiss-all', 'dismiss']) {
    const trace = [];
    const firstError = new Error('first dismiss');
    const toast = createToast({
      initialToasts: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
      defaultDurationMs: 1, maxVisible: 2,
      onDismiss: (id, reason) => { trace.push(`${id}:${reason}`); throw id === 'a' ? firstError : new Error('later dismiss'); },
      onAnnounce: (item) => trace.push(`announce:${item.id}`),
      onItemsChange: () => trace.push('items'), onUpdate: () => trace.push('update'),
    });
    toast.subscribe((snapshot) => trace.push(`observer:${snapshot.revision}`));
    const act = () => operation === 'overflow' ? toast.push({ id: 'c', title: 'C' })
      : operation === 'timeout' ? toast.tick(1)
      : operation === 'dismiss-all' ? toast.dismissAll() : toast.dismiss('a');
    assert.throws(act, (error) => error === firstError);
    const commands = operation === 'overflow' ? ['a:overflow', 'announce:c']
      : operation === 'timeout' ? ['a:timeout', 'b:timeout']
      : operation === 'dismiss-all' ? ['a:manual', 'b:manual'] : ['a:manual'];
    assert.deepEqual(trace, [...commands, 'items', 'observer:1', 'update']);
    assert.deepEqual(toast.state.items.map((item) => item.id), operation === 'overflow' ? ['b', 'c'] : operation === 'dismiss' ? ['b'] : []);
    toast.destroy();
  }
});

test('terminal toast rejected transitions produce no callback publication', () => {
  const trace = [];
  const toast = createToast({
    initialToasts: [{ id: 'a', title: 'A' }],
    onItemsChange: () => trace.push('items'), onAnnounce: () => trace.push('announce'),
    onDismiss: () => trace.push('dismiss'), onUpdate: () => trace.push('update'),
  });
  toast.subscribe(() => trace.push('observer'));
  assert.equal(toast.dismiss('missing'), false);
  assert.equal(toast.updateToast('missing', { title: 'Missing' }), false);
  assert.equal(toast.push({ id: 'a', title: 'Duplicate' }), false);
  assert.equal(toast.push({ id: 'b', title: ' ' }), false);
  assert.equal(toast.tick(-1), false);
  assert.equal(toast.getSnapshot().revision, 0);
  assert.deepEqual(trace, []);
  toast.destroy();
});

test('terminal toast nested callbacks publish the latest items and revision once', () => {
  for (const boundary of ['announce', 'items']) {
    const revisions = []; const itemLists = []; let nested = false; let toast;
    const dispatch = () => {
      if (!nested) { nested = true; assert.equal(toast.push({ id: 'nested', title: 'Nested' }), true); }
    };
    let updates = 0;
    toast = createToast({
      onAnnounce: () => { if (boundary === 'announce') dispatch(); },
      onItemsChange: (items) => { itemLists.push(items.map((item) => item.id)); if (boundary === 'items') dispatch(); },
      onUpdate: () => { updates += 1; },
    });
    toast.subscribe((snapshot) => revisions.push(snapshot.revision));
    assert.equal(toast.push({ id: 'outer', title: 'Outer' }), true);
    assert.deepEqual(revisions, [2]);
    assert.equal(updates, 1);
    assert.deepEqual(itemLists.at(-1), ['outer', 'nested']);
    if (boundary === 'announce') assert.deepEqual(itemLists, [['outer', 'nested']]);
    toast.destroy();
  }
});

test('terminal toast announcement belongs to its committed snapshot under same-ID reentrancy', () => {
  const announcements = []; const itemLists = []; const revisions = [];
  let toast;
  toast = createToast({
    initialToasts: [{ id: 'old', title: 'Old' }], maxVisible: 1,
    onDismiss: () => { assert.equal(toast.updateToast('new', { title: 'Replacement' }), true); },
    onAnnounce: (item) => announcements.push(item.title),
    onItemsChange: (items) => itemLists.push(items.map((item) => item.title)),
  });
  toast.subscribe((snapshot) => revisions.push(snapshot.revision));
  assert.equal(toast.push({ id: 'new', title: 'Original' }), true);
  assert.deepEqual(announcements, ['Original']);
  assert.deepEqual(itemLists, [['Replacement']]);
  assert.deepEqual(revisions, [2]);
  assert.equal(toast.state.items[0].title, 'Replacement');
  toast.destroy();
});
