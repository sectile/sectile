import assert from 'node:assert/strict';
import test from 'node:test';
import { createTree } from '@sectile/core/tree';
import { createTreeSelect, tryCreateTreeSelect, connectTreeSelect, createTreeSelectController, toTreeSelectEvent } from '../.verification-dist/tree-select.js';
const tree = () => createTree([{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }, { id: 'locked', parentID: null }]);
function controller(options = {}) { const result = createTreeSelectController({ tree: tree(), ...options }); assert.equal(result.ok, true, result.error?.message); return result.value; }
test('Native TreeSelect delegates controlled proposals and suppresses refused query effects', () => {
  const values = [], queries = [], searches = [], effects = [];
  const owner = controller({ value: ['a'], query: '', defaultOpen: true, defaultExpandedValues: ['root'], disabledItems: ['locked'],
    onValueChange: value => values.push(value), onQueryChange: query => queries.push(query), onSearch: request => searches.push(request), onEffect: effect => effects.push(effect) });
  const selected = owner.handleEvent({ type: 'select', id: 'b' }); assert.equal(selected.ok, true);
  assert.deepEqual(values, [['b']]); assert.deepEqual(owner.getSnapshot().state.selection.selected, ['a']); assert.equal(owner.getSnapshot().state.open, false);
  owner.handleEvent('open'); const result = owner.handleEvent({ type: 'query', query: 'delivery' });
  assert.equal(result.ok, true); assert.deepEqual(queries, ['delivery']); assert.equal(owner.getSnapshot().state.request.query, '');
  assert.deepEqual(result.commands, []); assert.deepEqual(searches, []); assert.equal(owner.isDisabled('locked'), true); assert.equal(owner.isDisabled('missing'), null);
  assert.equal(owner.syncControlledValues({ query: '' }).error.code, 'controlled-value-required'); owner.dispose();
});
test('synchronous parent query acceptance publishes only the accepted request and can resolve it immediately', () => {
  const requests = [], effects = []; let owner;
  owner = controller({ query: '', defaultOpen: true, onQueryChange(query) { assert.equal(owner.syncControlledValues({ query }).ok, true); },
    onSearch(request) { requests.push(request); assert.equal(owner.resolveSearch(request, ['b']).ok, true); }, onEffect: effect => effects.push(effect) });
  const result = owner.handleEvent({ type: 'query', query: 'delivery' }); assert.equal(result.ok, true);
  assert.equal(requests.length, 1); assert.equal(owner.getSnapshot().state.request, requests[0]); assert.equal(owner.getSnapshot().state.pending, false);
  assert.deepEqual(owner.getSnapshot().state.results.matches, ['b']); assert.deepEqual(result.commands, [], 'superseded outer proposal has no executable effects');
  assert.equal(effects.filter(effect => effect.type === 'focus-element').length, 1); owner.dispose();
});
test('request and revision rejection precede raw result payload access', () => {
  const owner = controller(), first = owner.handleEvent({ type: 'query', query: 'first' }).snapshot.state.request;
  const matches = Array(1); Object.defineProperty(matches, 0, { get() { throw Error('stale payload read'); } });
  assert.equal(owner.resolveSearch(first, matches, 0).ok, false);
  owner.handleEvent({ type: 'query', query: 'second' });
  assert.equal(owner.resolveSearch(first, matches).error.code, 'tree-select-stale-results');
  assert.equal(owner.getSnapshot().state.request.query, 'second'); owner.dispose();
});
test('controlled expansion repairs only uncontrolled hidden highlights', () => {
  const owner = controller({ expandedValues: ['root'], defaultHighlightedValue: 'a', defaultOpen: true });
  const result = owner.syncControlledValues({ expandedValues: [] }); assert.equal(result.ok, true); assert.equal(result.value.state.view.cursor.current, 'root'); owner.dispose();
  const controlled = controller({ expandedValues: ['root'], highlightedValue: 'a' });
  assert.equal(controlled.syncControlledValues({ expandedValues: [], highlightedValue: 'a' }).error.code, 'tree-view-cursor-hidden'); controlled.dispose();
  const disabled = controller({ expandedValues: ['root'], defaultHighlightedValue: 'a', disabledItems: ['root'] });
  const fallback = disabled.syncControlledValues({ expandedValues: [] }); assert.equal(fallback.ok, true); assert.equal(fallback.value.state.view.cursor.current, 'locked'); disabled.dispose();
});
test('complete controlled frames atomically coordinate filtered results, values and highlighted IDs', () => {
  const owner = controller({ value: ['a'], open: true, query: 'delivery', expandedValues: ['root'], highlightedValue: 'a', matches: ['a'] });
  const request = owner.getSnapshot().state.request;
  const synced = owner.syncControlledValues({ value: ['b'], open: true, query: 'delivery', expandedValues: ['root'], highlightedValue: 'b', results: { request, results: ['b'] } });
  assert.equal(synced.ok, true); assert.equal(synced.value.state.request, request); assert.deepEqual(synced.value.state.selection.selected, ['b']); assert.equal(synced.value.state.view.cursor.current, 'b');
  const before = owner.getSnapshot();
  const failed = owner.syncControlledValues({ value: ['a', 'b'], open: true, query: 'new', expandedValues: ['root'], highlightedValue: 'b' });
  assert.equal(failed.ok, false); assert.equal(owner.getSnapshot(), before); owner.dispose();
});
test('admission refuses predicate/getter reentrancy and publication permits synchronous controlled acceptance', () => {
  let owner, nested, policy = false;
  owner = controller({ value: ['a'], defaultOpen: true, defaultExpandedValues: ['root'], policies: { eligible() {
    if (policy) nested = owner.handleEvent('clear'); return true;
  } } });
  policy = true; assert.equal(owner.handleEvent({ type: 'focus', id: 'a' }).ok, true); assert.equal(nested.error.code, 'invalid-boundary');
  policy = false;
  const synced = owner.syncControlledValues({ get value() { nested = owner.handleEvent('clear'); return ['b']; } });
  assert.equal(synced.ok, true); assert.equal(nested.error.code, 'invalid-boundary'); assert.deepEqual(owner.getSnapshot().state.selection.selected, ['b']); owner.dispose();
});
test('Native keyboard, interaction and completion failure preserve accepted state and cleanup', () => {
  assert.equal(toTreeSelectEvent({ key: 'Home' }), 'first'); assert.equal(toTreeSelectEvent({ key: 'End' }), 'last');
  assert.equal(toTreeSelectEvent({ key: 'Enter' }), 'select'); assert.equal(toTreeSelectEvent({ isComposing: true, get key() { throw Error('IME key read'); } }), null);
  const readonly = controller({ readOnly: true }); assert.equal(readonly.handleEvent('open').ok, true); assert.equal(readonly.handleEvent({ type: 'query', query: 'x' }).error.code, 'interaction-read-only');
  readonly.syncInteraction({ disabled: true }); assert.equal(readonly.handleKeyboardInput({ key: 'ArrowDown' }).error.code, 'interaction-disabled');
  assert.equal(readonly.handleEvent('close').ok, true); readonly.dispose();
  const first = Error('notification failed'), second = Error('search failed'); let searched = 0, updated = 0;
  const owner = controller({ onQueryChange() { throw first; }, onSearch() { searched++; throw second; }, onUpdate() { updated++; } });
  assert.throws(() => owner.handleEvent({ type: 'query', query: 'x' }), error => error === first);
  assert.equal(owner.getSnapshot().state.request.query, 'x'); assert.equal(searched, 1); assert.equal(updated, 1); owner.dispose();
});
test('disposal retires saved input handles before decoding and clears hooks even if final update throws', () => {
  const error = Error('final update'); const owner = controller({ onUpdate() { throw error; } });
  assert.throws(() => owner.dispose(), value => value === error); owner.dispose(); assert.equal(owner.getActive(), false);
  assert.equal(owner.handleKeyboardInput({ get key() { throw Error('retired key'); } }).error.code, 'interaction-disabled');
  assert.equal(owner.handleEvent({ get type() { throw Error('retired event'); } }).error.code, 'interaction-disabled');
  assert.equal(owner.syncControlledValues({ get value() { throw Error('retired props'); } }).error.code, 'interaction-disabled');
  assert.equal(owner.isDisabled('a'), true);
});
test('held retired TreeSelect controllers release callback and policy payloads', { skip: typeof global.gc !== 'function' }, async () => {
  const retained = retiredController(); retained.owner.dispose();
  for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(retained.payload.deref(), undefined); assert.equal(retained.key({ get key() { throw Error('saved retired key'); } }).ok, false);
  assert.equal(retained.owner.getSnapshot().state.selection.size, 0);
});
test('Native navigation and raw result delivery retain selected owners without tuple normalization', () => {
  for (const size of [32, 512, 4096]) {
    const leaves = Array.from({ length: size }, (_, index) => 'leaf' + index);
    const source = createTree([{ id: 'root', parentID: null }, ...leaves.map(id => ({ id, parentID: 'root' }))]);
    const owner = controller({ tree: source, selectionMode: 'multiple', defaultValue: leaves.filter((_, index) => index % 2 === 0), defaultExpandedValues: ['root'] });
    const selected = owner.getSnapshot().state.selection, sort = Array.prototype.sort; let sorts = 0;
    Array.prototype.sort = function(compare) { if (this.length && Array.isArray(this[0])) sorts++; return sort.call(this, compare); };
    try {
      owner.handleEvent('open'); owner.handleKeyboardInput({ key: 'End' }); owner.handleKeyboardInput({ key: 'Home' });
      const queried = owner.handleEvent({ type: 'query', query: 'delivery' }); assert.equal(queried.ok, true);
      assert.equal(owner.resolveSearch(owner.getSnapshot().state.request, [leaves[0], leaves.at(-1)]).ok, true);
      assert.equal(owner.syncControlledValues({}).ok, true); assert.equal(owner.getSnapshot().state.selection, selected); assert.equal(sorts, 0);
    } finally { Array.prototype.sort = sort; owner.dispose(); }
  }
});
function retiredController() {
  const payload = { calls: 0 }, owner = controller({ onSearch() { payload.calls++; }, onValueChange() { payload.calls++; }, onUpdate() { payload.calls++; },
    policies: { eligible() { return payload.calls >= 0; } } });
  return { owner, key: owner.handleKeyboardInput.bind(owner), payload: new WeakRef(payload) };
}
test('initial pending searches activate once across reconnect and synchronous response delivery', () => {
  const searches = []; let owner;
  owner = controller({ defaultQuery: 'delivery', onSearch(request) { searches.push(request); assert.equal(owner.activateSearch(), false); owner.resolveSearch(request, ['a']); } });
  assert.equal(searches.length, 0, 'SSR construction never executes transport');
  assert.equal(owner.activateSearch(), true); assert.equal(searches.length, 1); assert.equal(owner.activateSearch(), false);
  owner.handleEvent({ type: 'query', query: 'next' }); assert.equal(searches.length, 2); assert.equal(owner.activateSearch(), false);
  owner.dispose(); assert.equal(owner.activateSearch(), false);
});
test('TreeSelect DOM facade projects a hierarchical editable popup and accepts source leaves', () => {
  const input = new Element(), popup = new Element(); popup.id = 'deliveries';
  const connection = createTreeSelect({ nodes: [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }], input, popup,
    position: false, defaultExpandedValues: ['root'], defaultOpen: true });
  const root = new Element(), a = new Element(); root.parentElement = popup; a.parentElement = popup;
  connection.setInputAttributes('Delivery'); connection.setPopupAttributes('Deliveries');
  connection.setItemAttributes(root, { id: 'root' }); connection.setItemAttributes(a, { id: 'a' });
  assert.equal(input.getAttribute('role'), 'combobox'); assert.equal(input.getAttribute('aria-haspopup'), 'tree');
  assert.equal(input.getAttribute('aria-controls'), popup.id); assert.equal(popup.getAttribute('role'), 'tree');
  assert.equal(a.getAttribute('aria-level'), '2'); assert.equal(root.getAttribute('aria-expanded'), 'true');
  assert.equal(connection.handleEvent({ type: 'select', id: 'root' }), false, 'a source branch is not a selectable leaf');
  assert.equal(connection.handleEvent({ type: 'focus', id: 'a' }), true);
  assert.equal(input.getAttribute('aria-activedescendant'), a.id); assert.equal(a.focuses, 0, 'results do not move DOM focus');
  assert.equal(connection.handleKeyboardEvent({ key: 'Home', target: input }), false, 'native caret keys remain native');
  assert.equal(connection.handleKeyboardEvent({ key: 'Enter', target: input }), true);
  assert.deepEqual(connection.state.selection.selected, ['a']); assert.equal(a.getAttribute('aria-selected'), 'true');
  assert.equal(input.getAttribute('aria-activedescendant'), null); assert.equal(popup.hidden, true);
  connection.disconnect(); assert.equal(input.count(), 0); assert.equal(popup.count(), 0); assert.equal(popup.hidden, false);
  assert.equal(connection.getActive(), false); connection.disconnect();
  assert.equal(tryCreateTreeSelect({ nodes: [{ id: 'a', parentID: 'missing' }], input, popup }).ok, false);
});
test('TreeSelect input commits IME queries once and stale responses cannot change active descendants', () => {
  const input = new Element(), popup = new Element(), searches = []; popup.id = 'search';
  const connection = createTreeSelect({ nodes: [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }], input, popup,
    position: false, onSearch: request => searches.push(request) });
  const a = new Element(); connection.setItemAttributes(a, { id: 'a' });
  input.emit('compositionstart'); input.value = '가'; input.emit('input'); assert.equal(searches.length, 0);
  input.emit('compositionend'); input.emit('input'); assert.equal(searches.length, 1);
  assert.equal(popup.getAttribute('aria-busy'), 'true'); assert.equal(input.getAttribute('aria-activedescendant'), null);
  input.value = '나'; input.emit('input'); assert.equal(searches.length, 2);
  assert.equal(connection.resolveSearch(searches[0], ['a']), false); assert.equal(input.getAttribute('aria-activedescendant'), null);
  assert.equal(connection.resolveSearch(searches[1], ['a']), true); assert.equal(popup.getAttribute('aria-busy'), 'false');
  assert.equal(connection.handleEvent({ type: 'focus', id: 'a' }), true); assert.equal(input.getAttribute('aria-activedescendant'), a.id);
  connection.releaseItem(a, 'a'); assert.equal(input.getAttribute('aria-activedescendant'), null);
  const listener = [...input.listeners.get('input')][0]; connection.disconnect(); listener(); assert.equal(searches.length, 2);
});
test('borrowed TreeSelect detach and suspension release native work without retiring the owner', () => {
  const searches = [], owner = controller({ defaultQuery: 'delivery', onSearch: request => searches.push(request) });
  const input = new Element(), popup = new Element(); popup.id = 'borrowed';
  let connection = connectTreeSelect({ controller: owner, input, popup, position: false });
  assert.equal(searches.length, 1); connection.suspend(); assert.equal(input.count(), 0); assert.equal(popup.count(), 0);
  connection.resume(); assert.equal(input.count(), 4); assert.equal(popup.count(), 3); assert.equal(searches.length, 1);
  connection.disconnect(); assert.equal(owner.getActive(), true); assert.equal(input.count(), 0);
  connection = connectTreeSelect({ controller: owner, input, popup, position: false }); assert.equal(searches.length, 1);
  owner.syncInteraction({ disabled: true, readOnly: true }); connection.render();
  assert.equal(input.getAttribute('aria-disabled'), 'true'); assert.equal(input.getAttribute('aria-readonly'), 'true');
  assert.equal(Object.isFrozen(owner.getInteraction()), true);
  connection.disconnect(); owner.dispose();
});
test('initial search failure unwinds standalone listeners and visibility', () => {
  const input = new Element(), popup = new Element(), failure = Error('transport failed');
  assert.throws(() => createTreeSelect({ nodes: [{ id: 'a', parentID: null }], input, popup, position: false, defaultQuery: 'a',
    onSearch() { throw failure; } }), error => error === failure);
  assert.equal(input.count(), 0); assert.equal(popup.count(), 0); assert.equal(popup.hidden, false);
});
test('held destroyed facades and detached borrowed connections release their platform and callback scopes', { skip: typeof global.gc !== 'function' }, async () => {
  for (const factory of [detachedDOM, detachedBorrowedDOM]) {
    const retained = factory(); retained.retire();
    for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
    assert.equal(retained.input.deref(), undefined); assert.equal(retained.popup.deref(), undefined); assert.equal(retained.payload.deref(), undefined);
    retained.listener(); retained.render(); assert.equal(retained.connection.getSnapshot().state.selection.size, 0);
  }
});
function detachedDOM() {
  const input = new Element(), popup = new Element(), payload = { updates: 0 };
  const connection = createTreeSelect({ nodes: [{ id: 'a', parentID: null }], input, popup, position: false, onUpdate() { payload.updates++; } });
  return { connection, retire: connection.destroy, input: new WeakRef(input), popup: new WeakRef(popup), payload: new WeakRef(payload), listener: [...input.listeners.get('input')][0], render: connection.render };
}
function detachedBorrowedDOM() {
  const input = new Element(), popup = new Element(), payload = { updates: 0 };
  const connection = connectTreeSelect({ controller: controller(), input, popup, position: false, onUpdate() { payload.updates++; } });
  return { connection, retire: connection.disconnect.bind(connection), input: new WeakRef(input), popup: new WeakRef(popup), payload: new WeakRef(payload), listener: [...input.listeners.get('input')][0], render: connection.render.bind(connection) };
}
class Element {
  attributes = new Map(); dataset = {}; listeners = new Map(); id = ''; hidden = false; value = ''; focuses = 0;
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener({ target: this, preventDefault() {}, ...event }); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.focuses++; }
  count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0); }
}
