import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  HTMLSelectElement: browserWindow.HTMLSelectElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref, shallowRef, KeepAlive } = await import('vue');
const { HostProvider } = await import('../.verification-dist/host-provider.js');
const { CarouselRoot, CarouselPause, CarouselIndicatorGroup } = await import('../.verification-dist/carousel.js');
const { CascadeSelectContent, CascadeSelectRoot, CascadeSelectTrigger } = await import('../.verification-dist/cascade-select.js');
const { FeedRoot } = await import('../.verification-dist/feed.js');
const { GridCell, GridRoot, GridRow } = await import('../.verification-dist/grid.js');
const { ListboxItem, ListboxRoot } = await import('../.verification-dist/listbox.js');
const { MenuItem, MenuRoot, MenuSubContent, MenuButtonRoot, MenuButtonTrigger, MenuButtonContent, MenubarRoot, NavigationMenuRoot } = await import('../.verification-dist/menu.js');
const { ContextMenuRoot, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } = await import('../.verification-dist/context-menu.js');
const { PaginationRoot, PaginationItem } = await import('../.verification-dist/pagination.js');
const { SelectContent, SelectItem, SelectRoot, SelectTrigger } = await import('../.verification-dist/select.js');
const { ToolbarItem, ToolbarRoot, ToolbarSeparator } = await import('../.verification-dist/toolbar.js');
const { TreeGridRoot } = await import('../.verification-dist/tree-grid.js');
const { SequenceReorderRoot, SequenceReorderItem, SequenceReorderHandle, TreeReorderRoot, TreeReorderItem, TreeReorderHandle, TreeReorderDropTarget } = await import('../.verification-dist/reorder.js');

const boardNodes = [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }, { id: 'b', parentID: 'left' }];
function boardParts(state) {
  return state.getChildren(null).map(id => h(TreeReorderItem, { key: id, value: id }, { default: () => [id,
    h(TreeReorderDropTarget, { parentID: id, label: `${id} cards` }, { default: () => state.getChildren(id).map(value =>
      h(TreeReorderItem, { key: value, value }, { default: () => h(TreeReorderHandle, { label: `Move ${value}` }) })) }),
  ] }));
}
test('Vue column Reorder keeps accepted membership, restores stable-ID focus, and respects readonly', async () => {
  const root = shallowRef(), readonly = shallowRef(false), restrictedQueries = []; let state;
  const fixture = mount(() => h(TreeReorderRoot, { ref: root, nodes: boardNodes, layout: 'columns', readonly: readonly.value }, {
    default: current => { state = current; if (current.readonly) restrictedQueries.push(current.canMove('a', { parentID: 'left' })); return boardParts(current); },
  }));
  try {
    await settle(); const before = fixture.host.querySelector('[data-value="a"]'); before.focus();
    before.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true }));
    await settle(); const after = fixture.host.querySelector('[data-value="a"]');
    assert.notEqual(before, after); assert.equal(document.activeElement, after);
    assert.equal(state.getParent('a'), 'right'); assert.deepEqual(state.getChildren('left'), ['b']);
    assert.equal(fixture.host.querySelector('[data-part="root"]').getAttribute('role'), 'list');
    assert.equal(after.getAttribute('role'), 'listitem'); assert.equal(after.getAttribute('aria-level'), '2');
    assert.equal(after.getAttribute('aria-posinset'), '1');
    readonly.value = true; await settle();
    assert.ok(restrictedQueries.length > 0);
    assert.ok(restrictedQueries.every(value => value === false), 'logical readonly applies before the post-flush native rebind');
    assert.equal(state.canMove('a', { parentID: 'left' }), false);
    assert.equal(root.value.move('a', { parentID: 'left' }), false);
    assert.equal(after.querySelector('button').disabled, true); root.value.focus('a'); assert.equal(document.activeElement, after);
    readonly.value = false; await settle();
    assert.equal(root.value.move('a', { parentID: 'left', beforeID: 'b' }), true); await settle();
    assert.deepEqual(state.getChildren('left'), ['a', 'b']);
  } finally { unmount(fixture.app, fixture.host); }
});
test('Vue controlled column moves remain proposals and use updated policy and source anchors', async () => {
  const root = shallowRef(), input = shallowRef(boardNodes), policies = shallowRef({ capacity: parent => parent === 'right' ? 0 : undefined });
  let state; const proposals = [];
  const fixture = mount(() => h(TreeReorderRoot, { ref: root, nodes: input.value, controlled: true, layout: 'columns', policies: policies.value,
    'onUpdate:nodes': nodes => proposals.push(nodes) }, { default: current => { state = current; return boardParts(current); } }));
  try {
    await settle(); assert.equal(root.value.canMove('a', { parentID: 'right' }), false);
    assert.equal(root.value.move('a', { parentID: 'right' }), false); assert.equal(proposals.length, 0);
    policies.value = {}; await settle();
    assert.equal(state.canMove('a', { parentID: 'right' }), true); assert.equal(proposals.length, 0); assert.equal(state.getParent('a'), 'left');
    assert.equal(root.value.move('a', { parentID: 'right' }), true); await settle();
    assert.equal(state.getParent('a'), 'left'); assert.equal(proposals.length, 1);
    input.value = proposals[0]; await settle(); assert.equal(state.getParent('a'), 'right');
    input.value = [{ id: 'left', parentID: null }, { id: 'b', parentID: 'left' }]; await settle();
    assert.deepEqual(state.getChildren(null), ['left']); assert.equal(root.value.move('b', { parentID: 'right' }), false);
  } finally { unmount(fixture.app, fixture.host); }
});
test('Vue column Reorder suspends its root listeners across Host, KeepAlive and root replacement', async () => {
  const active = shallowRef(true), visible = shallowRef(true), as = shallowRef('div'), root = shallowRef();
  const listeners = new Map(), add = HTMLElement.prototype.addEventListener, remove = HTMLElement.prototype.removeEventListener;
  const count = () => [...listeners.values()].reduce((sum, types) => sum + [...types.values()].reduce((sum, set) => sum + set.size, 0), 0); let state, fixture;
  HTMLElement.prototype.addEventListener = function(type, listener, ...rest) {
    if (this.dataset.scope === 'tree-reorder' && this.dataset.part === 'root') {
      const types = listeners.get(this) ?? new Map(), set = types.get(type) ?? new Set(); set.add(listener); types.set(type, set); listeners.set(this, types);
    }
    return add.call(this, type, listener, ...rest);
  };
  HTMLElement.prototype.removeEventListener = function(type, listener, ...rest) { listeners.get(this)?.get(type)?.delete(listener); return remove.call(this, type, listener, ...rest); };
  try {
    fixture = mount(() => h(HostProvider, { active: active.value }, () => h(KeepAlive, null, { default: () => visible.value
      ? h(TreeReorderRoot, { ref: root, nodes: boardNodes, layout: 'columns', as: as.value }, { default: current => { state = current; return boardParts(current); } }) : null })));
    await settle(); assert.equal(count(), 7); assert.equal(root.value.move('a', { parentID: 'right' }), true); await settle();
    for (let cycle = 0; cycle < 3; cycle++) { active.value = false; await settle(); assert.equal(count(), 0); assert.equal(root.value.move('b', { parentID: 'right' }), false);
      assert.equal(state.canMove('b', { get parentID() { throw Error('inactive target'); } }), false);
      active.value = true; await settle(); assert.equal(count(), 7); assert.equal(state.getParent('a'), 'right'); }
    visible.value = false; await settle(); assert.equal(count(), 0); visible.value = true; await settle(); assert.equal(count(), 7);
    as.value = 'section'; await settle(); assert.equal(count(), 7); assert.equal(root.value.element.tagName, 'SECTION'); assert.equal(state.getParent('a'), 'right');
    unmount(fixture.app, fixture.host); fixture = undefined; assert.equal(count(), 0);
  } finally { if (fixture) unmount(fixture.app, fixture.host); HTMLElement.prototype.addEventListener = add; HTMLElement.prototype.removeEventListener = remove; }
});
test('Vue Reorder projects preview separately from controlled order and retires saved preview ports', async () => {
  for (const tree of [false,true]) {
    let state; const proposals=[], lifecycle=[];
    const Root=tree?TreeReorderRoot:SequenceReorderRoot, Item=tree?TreeReorderItem:SequenceReorderItem;
    const fixture=mount(()=>h(Root,{keyboardMode:'preview',controlled:true,
      ...(tree?{nodes:boardNodes,layout:'columns'}:{items:['a','b']}),
      [tree?'onUpdate:nodes':'onUpdate:items']:value=>proposals.push(value),
      'onInteraction-change':change=>lifecycle.push(change)}, {default:current=>{
        state=current;return tree?boardParts(current):current.items.map(value=>h(Item,{value,key:value},()=>value));
      }}));
    try {
      await settle();const a=fixture.host.querySelector('[data-value="a"]');a.focus();
      const key=name=>a.dispatchEvent(new window.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
      key(' ');key('ArrowDown');await settle();
      assert.equal(state.interaction.sourceID,'a');assert.equal(proposals.length,0);
      const preview=state.getPreviewState();assert.equal(preview.ok,true);
      assert.deepEqual(tree?state.getChildren('left'):state.items,['a','b']);
      key('Enter');await settle();assert.equal(proposals.length,1);
      assert.equal(state.interaction.sourceID,null);assert.equal(lifecycle.at(-2).accepted,false);assert.equal(lifecycle.at(-1).type,'end');
      const saved=state.cancelInteraction;unmount(fixture.app,fixture.host);fixture.app=undefined;
      assert.doesNotThrow(saved);
    }finally{if(fixture.app)unmount(fixture.app,fixture.host);}
  }
});
test('saved Vue column Reorder ports retire without retaining platform roots or policy closures', { skip: typeof global.gc !== 'function' }, async () => {
  const retained = heldBoardPorts(); retained.close(); await settle();
  for (let turn = 0; turn < 25; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.ok(retained.element.deref() === undefined, 'held methods release the root');
  assert.ok(retained.payload.deref() === undefined, 'held methods release caller policies');
  assert.equal(retained.move('a', { get parentID() { throw Error('retired input'); } }), false);
  assert.equal(retained.canMove('a', { get parentID() { throw Error('retired query'); } }), false);
  assert.deepEqual(retained.children(null), []); assert.equal(retained.parent('a'), null); retained.focus('a');
});
test('Vue insertion parts route pointer drops to empty columns and unmounted canonical anchors', async () => {
  const input = shallowRef([...boardNodes, { id: 'hidden', parentID: 'right' }]), before = shallowRef('hidden'); let state;
  const hitTest = document.elementFromPoint;
  const fixture = mount(() => h(TreeReorderRoot, { nodes: input.value, layout: 'columns' }, { default: current => {
    state = current; return [h(TreeReorderItem, { value: 'a' }),
      h(TreeReorderDropTarget, { parentID: 'right', beforeID: before.value, role: 'presentation' })];
  } }));
  try {
    await settle(); const root = fixture.host.querySelector('[data-part="root"]'), zone = fixture.host.querySelector('[data-part="drop-target"]');
    document.elementFromPoint = () => zone;
    const drop = () => {
      const item = fixture.host.querySelector('[data-value="a"]');
      item.dispatchEvent(new window.PointerEvent('pointerdown', { pointerId: 9, button: 0, bubbles: true, cancelable: true }));
      for (const type of ['pointermove', 'pointerup']) root.dispatchEvent(new window.PointerEvent(type, { pointerId: 9, button: 0, bubbles: true, cancelable: true }));
    };
    drop(); await settle(); assert.deepEqual(state.getChildren('right'), ['a', 'hidden']);
    input.value = boardNodes; before.value = null; await settle(); drop(); await settle();
    assert.deepEqual(state.getChildren('right'), ['a']);
  } finally { document.elementFromPoint = hitTest; unmount(fixture.app, fixture.host); }
});
function heldBoardPorts() {
  const root = shallowRef(), payload = { marker: 'board-policy' }; let state;
  const fixture = mount(() => h(TreeReorderRoot, { ref: root, nodes: boardNodes, layout: 'columns', policies: { canMove: () => !!payload.marker } }, {
    default: current => { state = current; return boardParts(current); },
  }));
  const close = boardCloser(fixture.app, fixture.host);
  return { move: root.value.move, canMove: root.value.canMove, focus: root.value.focus, children: state.getChildren, parent: state.getParent,
    element: new WeakRef(root.value.element), payload: new WeakRef(payload), close };
}
function boardCloser(app, host) {
  let resource = { app, host };
  return () => { const old = resource; resource = undefined; if (old) unmount(old.app, old.host); };
}
test('Vue column attachment failure drains acquired listeners and permits valid reconfiguration', async () => {
  const failure = Error('column item projection'), errors = [], listeners = new Map(), disabled = shallowRef(false);
  const count = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
  const add = HTMLElement.prototype.addEventListener, remove = HTMLElement.prototype.removeEventListener, set = HTMLElement.prototype.setAttribute;
  let armed = false;
  HTMLElement.prototype.addEventListener = function(type, listener, ...rest) {
    const result = add.call(this, type, listener, ...rest);
    if (this.dataset.scope === 'tree-reorder' && this.dataset.part === 'root') {
      const set = listeners.get(type) ?? new Set(); set.add(listener); listeners.set(type, set); if (count() === 7) armed = true;
    }
    return result;
  };
  HTMLElement.prototype.removeEventListener = function(type, listener, ...rest) { listeners.get(type)?.delete(listener); return remove.call(this, type, listener, ...rest); };
  HTMLElement.prototype.setAttribute = function(name, value) { if (armed && name === 'data-reorder-id') { armed = false; throw failure; } return set.call(this, name, value); };
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TreeReorderRoot, { nodes: boardNodes, layout: 'columns', disabled: disabled.value }, { default: boardParts }) });
  app.config.errorHandler = error => errors.push(error);
  try {
    app.mount(host); armed = false; assert.ok(errors.includes(failure)); assert.equal(count(), 0);
    HTMLElement.prototype.setAttribute = set; disabled.value = true; await settle(); assert.equal(count(), 7);
  } finally { armed = false; app.unmount(); host.remove(); HTMLElement.prototype.addEventListener = add; HTMLElement.prototype.removeEventListener = remove; HTMLElement.prototype.setAttribute = set; }
  assert.equal(count(), 0);
});

test('Vue menu keeps one model across label reconfiguration and replaces it with the authored tree', async () => {
  const items = shallowRef([{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }]), label = shallowRef('Actions');
  let view;
  const fixture = mount(() => h(MenuRoot, { items: items.value, label: label.value }, { default: state => {
    view = state; return items.value.map(item => h(MenuItem, { value: item.id }, { default: item => item.branch ? 'Branch' : 'Leaf' }));
  } }));
  try {
    await settle(); const first = view.model; assert.equal(first.tree.isLeaf('file'), false);
    label.value = 'File actions'; await settle(); assert.equal(view.model, first);
    items.value = [{ id: 'file', parentID: null }]; await settle(); assert.notEqual(view.model, first);
    assert.equal(view.model.tree.isLeaf('file'), true); assert.equal(fixture.host.querySelector('[data-sectile-menu-id=file]').hasAttribute('aria-haspopup'), false);
  } finally { unmount(fixture.app, fixture.host); }
  assert.equal(view.presentation, undefined);
});

test('Vue Reorder releases unmounted and reidentified items before root reconfiguration', async () => {
  for (const tree of [false, true]) {
    const visible = ref(true);
    const disabled = ref(false);
    const id = ref('a');
    const Root = tree ? TreeReorderRoot : SequenceReorderRoot;
    const Item = tree ? TreeReorderItem : SequenceReorderItem;
    const domain = tree
      ? { nodes: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }] }
      : { items: ['a', 'b'] };
    const { app, host } = mount(() => h(Root, { ...domain, disabled: disabled.value }, {
      default: () => visible.value ? h(Item, { value: id.value }, { default: () => id.value }) : null,
    }));
    try {
      await settle();
      const original = host.querySelector('[data-part="item"]');
      id.value = 'b';
      await settle();
      assert.equal(original.getAttribute('aria-posinset'), '2');
      visible.value = false;
      await settle();
      let writes = 0;
      const setAttribute = original.setAttribute.bind(original);
      original.setAttribute = (...args) => { writes += 1; return setAttribute(...args); };
      disabled.value = true;
      await settle();
      visible.value = true;
      await settle();
      assert.equal(writes, 0, 'reconnect only projects mounted item registrations');
      assert.notEqual(host.querySelector('[data-part="item"]'), original);
    } finally { unmount(app, host); }
  }
});

test('Vue controlled Reorder publishes accepted order and sibling-local slot positions', async () => {
  for (const tree of [false, true]) {
    const initial = tree
      ? [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }]
      : ['a', 'b'];
    const order = ref(initial);
    const proposals = [];
    const Root = tree ? TreeReorderRoot : SequenceReorderRoot;
    const Item = tree ? TreeReorderItem : SequenceReorderItem;
    const { app, host } = mount(() => h(Root, {
      controlled: true,
      ...(tree ? { nodes: order.value, 'onUpdate:nodes': (value) => proposals.push(value) }
        : { items: order.value, 'onUpdate:items': (value) => proposals.push(value) }),
    }, { default: () => ['a', 'b'].map((id) => h(Item, { key: id, value: id }, {
      default: ({ position }) => `${id}:${position}`,
    })) }));
    try {
      await settle();
      const a = host.querySelector('[data-value="a"]');
      assert.equal(a.textContent, 'a:1');
      const key = () => a.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', altKey: true, bubbles: true, cancelable: true }));
      key();
      await settle();
      assert.equal(a.textContent, 'a:1');
      assert.equal(a.getAttribute('aria-posinset'), '1');
      key();
      await settle();
      assert.deepEqual(proposals[1], proposals[0]);
      order.value = proposals[0];
      await settle();
      assert.equal(a.textContent, 'a:2');
      assert.equal(a.getAttribute('aria-posinset'), '2');
    } finally { unmount(app, host); }
  }
});

test('Vue Reorder native handles retain input behavior and committed order across reconfiguration', async () => {
  for (const tree of [false, true]) {
    const disabled = ref(false);
    const Root = tree ? TreeReorderRoot : SequenceReorderRoot;
    const Item = tree ? TreeReorderItem : SequenceReorderItem;
    const Handle = tree ? TreeReorderHandle : SequenceReorderHandle;
    const domain = tree ? { nodes: [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }] } : { items: ['a', 'b'] };
    const { app, host } = mount(() => h(Root, { ...domain, handleOnly: true, disabled: disabled.value, 'aria-label': 'Ordre', 'aria-roledescription': 'triable' }, {
      default: () => ['a', 'b'].map(id => h(Item, { key: id, value: id }, { default: () => [
        h(Handle, { label: `Move ${id}` }, { default: () => 'Handle' }), h('input'), h('textarea'), h('select'), h('button', { type: 'button' }, 'Action'), h('a', { href: '#native' }, 'Link'), h('span', { contenteditable: 'true' }, 'Edit'),
      ] })),
    }));
    try {
      await settle();
      const a = host.querySelector('[data-value="a"]');
      const root = host.querySelector('[data-part="root"]');
      const handle = a.querySelector('[data-part="handle"]');
      assert.equal(handle.tagName, 'BUTTON');
      assert.equal(handle.type, 'button');
      assert.equal(handle.getAttribute('aria-label'), 'Move a');
      assert.equal(root.getAttribute('aria-label'), 'Ordre');
      assert.equal(root.getAttribute('aria-roledescription'), 'triable');
      for (const target of a.querySelectorAll('input,textarea,select,button:not([data-sectile-reorder-handle]),a,[contenteditable]')) {
        const event = new window.KeyboardEvent('keydown', { key: 'End', altKey: true, bubbles: true, cancelable: true });
        target.dispatchEvent(event);
        assert.equal(event.defaultPrevented, false);
        assert.equal(a.getAttribute('aria-posinset'), '1');
      }
      handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', altKey: true, bubbles: true, cancelable: true }));
      await settle();
      assert.equal(a.getAttribute('aria-posinset'), '2');
      disabled.value = true;
      await settle();
      assert.equal(handle.disabled, true);
      assert.equal(a.getAttribute('aria-posinset'), '2');
      if (tree) { assert.equal(a.getAttribute('aria-level'), '2'); assert.equal(a.getAttribute('aria-setsize'), '2'); }
    } finally { unmount(app, host); }
  }
});

async function settle() {
  await nextTick();
  await nextTick();
}

test('Vue grid reconciles controlled selection and focus after rows change', async () => {
  const rows = ref([['a']]);
  const value = ref('a');
  const highlighted = ref('a');
  const { app, host } = mount(() => h(GridRoot, {
    rows: rows.value,
    modelValue: value.value,
    highlightedValue: highlighted.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
    'onUpdate:highlightedValue': (next) => { highlighted.value = next; },
  }));

  await settle();
  rows.value = [['b']];
  await settle();
  assert.equal(value.value, null);
  assert.equal(highlighted.value, 'b');
  unmount(app, host);
});

test('Vue Grid mounts linearly and projects bounded cursor and selection changes at 1k and 4k cells', async () => {
  for (const size of [1_000, 4_000]) {
    const ids = Array.from({ length: size }, (_, index) => `grid-${index}`);
    const rows = Array.from({ length: size / 1_000 }, (_, row) => ids.slice(row * 1_000, (row + 1) * 1_000));
    const originalSetAttribute = HTMLElement.prototype.setAttribute;
    const originalRemoveAttribute = HTMLElement.prototype.removeAttribute;
    let roleWrites = 0;
    let cellWrites = 0;
    HTMLElement.prototype.setAttribute = function (name, value) {
      if (name === 'role' && value === 'gridcell') roleWrites += 1;
      if (this.hasAttribute('data-sectile-grid-cell')) cellWrites += 1;
      return originalSetAttribute.call(this, name, value);
    };
    HTMLElement.prototype.removeAttribute = function (name) {
      if (this.hasAttribute('data-sectile-grid-cell')) cellWrites += 1;
      return originalRemoveAttribute.call(this, name);
    };
    let mounted;
    try {
      mounted = mount(() => h(GridRoot, { rows, defaultHighlightedValue: ids[0] }, {
        default: () => rows.map((row, index) => h(GridRow, { key: index }, {
          default: () => row.map((id) => h(GridCell, { key: id, value: id }, { default: () => id })),
        })),
      }));
      await settle();
      const root = mounted.host.querySelector('[data-part="root"]');
      const cells = [...root.querySelectorAll('[data-sectile-grid-cell]')];
      assert.equal(cells.length, size);
      assert.equal(roleWrites, size, 'each cell receives one complete registration projection');
      assert.equal(cells[0].tabIndex, 0);
      const query = root.querySelectorAll;
      let discoveries = 0;
      root.querySelectorAll = function (...args) { discoveries += 1; return query.apply(this, args); };
      const checkDelta = async (action) => {
        roleWrites = 0; cellWrites = 0;
        action();
        await settle();
        assert.equal(discoveries, 0, 'ordinary updates do not rediscover mounted cells');
        assert.equal(roleWrites, 0, 'ordinary updates retain stable registration attributes');
        assert.ok(cellWrites <= 32, `${size} cells caused ${cellWrites} writes for one semantic delta`);
      };
      await checkDelta(() => gridKey(root, 'ArrowRight'));
      assert.equal(cells[0].tabIndex, -1);
      assert.equal(cells[1].tabIndex, 0);
      assert.equal(document.activeElement, cells[1]);
      await checkDelta(() => gridKey(root, ' '));
      assert.equal(cells[1].getAttribute('aria-selected'), 'true');
      await checkDelta(() => cells.at(-1).click());
      assert.equal(cells[1].getAttribute('aria-selected'), 'false');
      assert.equal(cells.at(-1).getAttribute('aria-selected'), 'true');
      assert.equal(cells.at(-1).tabIndex, 0);
      assert.equal(document.activeElement, cells.at(-1));
    } finally {
      HTMLElement.prototype.setAttribute = originalSetAttribute;
      HTMLElement.prototype.removeAttribute = originalRemoveAttribute;
      if (mounted !== undefined) unmount(mounted.app, mounted.host);
    }
  }
});

test('Vue collection cursor deltas execute only changed item consumer slots at 1k and 4k', async () => {
  for (const size of [1_000, 4_000]) {
    const gridIDs = Array.from({ length: size }, (_, index) => `slot-grid-${index}`);
    let gridSlots = 0;
    const grid = mount(() => h(GridRoot, { rows: [gridIDs], defaultHighlightedValue: gridIDs[0] }, {
      default: () => h(GridRow, null, {
        default: () => gridIDs.map((id) => h(GridCell, { key: id, value: id }, {
          default: () => { gridSlots += 1; return id; },
        })),
      }),
    }));
    try {
      await settle();
      gridSlots = 0;
      gridKey(grid.host.querySelector('[data-part="root"]'), 'ArrowRight');
      await settle();
      assert.equal(gridSlots, 2, `${size} Grid cells should execute only the old/new cursor slots`);
    } finally { unmount(grid.app, grid.host); }

    const listboxIDs = Array.from({ length: size }, (_, index) => `slot-listbox-${index}`);
    let listboxSlots = 0;
    const listbox = mount(() => h(ListboxRoot, { items: listboxIDs }, {
      default: () => listboxIDs.map((id) => h(ListboxItem, { key: id, value: id }, {
        default: () => { listboxSlots += 1; return id; },
      })),
    }));
    try {
      await settle();
      listboxSlots = 0;
      listbox.host.querySelector('[role="listbox"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
        key: 'ArrowDown', bubbles: true, cancelable: true,
      }));
      await settle();
      assert.equal(listboxSlots, 2, `${size} Listbox items should execute only the old/new highlight slots`);
    } finally { unmount(listbox.app, listbox.host); }

    const menuItems = Array.from({ length: size }, (_, index) => ({ id: `slot-menu-${index}` }));
    let menuSlots = 0;
    const menu = mount(() => h(MenuRoot, { items: menuItems, defaultHighlightedValue: menuItems[0].id }, {
      default: () => menuItems.map(({ id }) => h(MenuItem, { key: id, value: id }, {
        default: () => { menuSlots += 1; return id; },
      })),
    }));
    try {
      await settle();
      menuSlots = 0;
      menu.host.querySelector('[role="menu"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
        key: 'ArrowDown', bubbles: true, cancelable: true,
      }));
      await settle();
      assert.equal(menuSlots, 2, `${size} Menu items should execute only the old/new highlight slots`);
    } finally { unmount(menu.app, menu.host); }
  }
});

test('Vue collection root slot projections remain reactive after item-local invalidation', async () => {
  const grid = mount(() => h(GridRoot, { rows: [['a', 'b']], defaultHighlightedValue: 'a' }, {
    default: (state) => [
      h('output', { 'data-root-state': 'grid' }, state.highlightedValue ?? ''),
      h(GridRow, null, { default: () => ['a', 'b'].map((id) => h(GridCell, { value: id }, () => id)) }),
    ],
  }));
  try {
    await settle();
    gridKey(grid.host.querySelector('[data-part="root"]'), 'ArrowRight');
    await settle();
    assert.equal(grid.host.querySelector('[data-root-state="grid"]').textContent, 'b');
  } finally { unmount(grid.app, grid.host); }

  const listbox = mount(() => h(ListboxRoot, { items: ['a', 'b'] }, {
    default: (state) => [
      h('output', { 'data-root-state': 'listbox' }, state.highlightedValue ?? ''),
      ...['a', 'b'].map((id) => h(ListboxItem, { value: id }, () => id)),
    ],
  }));
  try {
    await settle();
    listbox.host.querySelector('[role="listbox"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
      key: 'ArrowDown', bubbles: true, cancelable: true,
    }));
    await settle();
    assert.equal(listbox.host.querySelector('[data-root-state="listbox"]').textContent, 'b');
  } finally { unmount(listbox.app, listbox.host); }

  const items = [{ id: 'a' }, { id: 'b' }];
  const menu = mount(() => h(MenuRoot, { items, defaultHighlightedValue: 'a' }, {
    default: (state) => [
      h('output', { 'data-root-state': 'menu' }, state.highlightedValue ?? ''),
      ...items.map(({ id }) => h(MenuItem, { value: id }, () => id)),
    ],
  }));
  try {
    await settle();
    menu.host.querySelector('[role="menu"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
      key: 'ArrowDown', bubbles: true, cancelable: true,
    }));
    await settle();
    assert.equal(menu.host.querySelector('[data-root-state="menu"]').textContent, 'b');
  } finally { unmount(menu.app, menu.host); }
});

test('Vue collection root slot projections are readonly views over canonical owner state', async () => {
  let gridState;
  const grid = mount(() => h(GridRoot, { rows: [['a', 'b']], defaultHighlightedValue: 'a' }, {
    default: (state) => {
      gridState = state;
      return h(GridRow, null, {
        default: () => ['a', 'b'].map((id) => h(GridCell, { value: id }, () => id)),
      });
    },
  }));
  try {
    await settle();
    const cells = [...grid.host.querySelectorAll('[data-sectile-grid-cell]')];
    const originalWarn = console.warn;
    console.warn = () => {};
    try { Reflect.set(gridState, 'highlightedValue', 'b'); } finally { console.warn = originalWarn; }
    await settle();
    assert.equal(gridState.highlightedValue, 'a');
    assert.equal(cells[0].hasAttribute('data-highlighted'), true);
    assert.equal(cells[1].hasAttribute('data-highlighted'), false);
    assert.equal(cells[0].tabIndex, 0);
    assert.equal(cells[1].tabIndex, -1);
  } finally { unmount(grid.app, grid.host); }

  let listboxState;
  const listbox = mount(() => h(ListboxRoot, { items: ['a', 'b'] }, {
    default: (state) => {
      listboxState = state;
      return ['a', 'b'].map((id) => h(ListboxItem, { value: id }, () => id));
    },
  }));
  try {
    await settle();
    const root = listbox.host.querySelector('[role="listbox"]');
    const options = [...listbox.host.querySelectorAll('[role="option"]')];
    const originalWarn = console.warn;
    console.warn = () => {};
    try { Reflect.set(listboxState, 'highlightedValue', 'b'); } finally { console.warn = originalWarn; }
    await settle();
    assert.equal(listboxState.highlightedValue, 'a');
    assert.equal(root.getAttribute('aria-activedescendant'), options[0].id);
  } finally { unmount(listbox.app, listbox.host); }
});

test('Vue Grid cell refs preserve disabled changes, recycled identities, removal and remount', async () => {
  const rows = [['a', 'b', 'c']];
  const id = ref('b');
  const disabled = ref(true);
  const visible = ref(true);
  let snapshot;
  const { app, host } = mount(() => h(GridRoot, { rows, defaultHighlightedValue: 'a' }, {
    default: (state) => {
      snapshot = state;
      return h(GridRow, null, { default: () => [
        h(GridCell, { key: 'a', value: 'a' }),
        visible.value ? h(GridCell, { key: 'recycled', value: id.value, disabled: disabled.value }) : null,
      ] });
    },
  }));
  try {
    await settle();
    const root = host.querySelector('[data-part="root"]');
    const cell = host.querySelector('[data-sectile-grid-cell="b"]');
    assert.equal(cell.getAttribute('aria-disabled'), 'true');
    cell.click();
    await settle();
    assert.equal(snapshot.value, null);
    disabled.value = false;
    await settle();
    assert.equal(cell.hasAttribute('aria-disabled'), false);
    cell.click();
    await settle();
    assert.equal(snapshot.value, 'b');
    assert.equal(cell.tabIndex, 0);
    id.value = 'c';
    await settle();
    assert.equal(host.querySelector('[data-sectile-grid-cell="c"]'), cell);
    assert.equal(cell.getAttribute('aria-colindex'), '3');
    assert.equal(cell.tabIndex, -1);
    cell.click();
    await settle();
    assert.equal(snapshot.value, 'c');
    disabled.value = true;
    await settle();
    visible.value = false;
    await settle();
    assert.equal(cell.tabIndex, -1, 'removed host releases its roving tab stop');
    let detachedFocus = 0;
    cell.focus = () => { detachedFocus += 1; };
    gridKey(root, 'ArrowLeft');
    await settle();
    assert.equal(snapshot.highlightedValue, 'b');
    gridKey(root, 'ArrowRight');
    await settle();
    assert.equal(snapshot.highlightedValue, 'c', 'unmounted disabled host releases its local eligibility state');
    assert.equal(detachedFocus, 0);
    disabled.value = false;
    visible.value = true;
    await settle();
    const remounted = host.querySelector('[data-sectile-grid-cell="c"]');
    assert.notEqual(remounted, cell);
    assert.equal(remounted.tabIndex, 0);
    assert.equal(remounted.getAttribute('aria-selected'), 'true');
    assert.equal(remounted.hasAttribute('aria-disabled'), false);
  } finally { unmount(app, host); }
});

test('Vue Grid preserves every controlled ownership shape, edit callbacks and unmount cleanup', async () => {
  for (let mask = 0; mask < 8; mask += 1) {
    const rows = [['a', 'b']];
    const value = ref(null);
    const highlight = ref('a');
    const mode = ref('navigation');
    const readonly = ref(false);
    const disabled = ref(false);
    const edits = [];
    let snapshot;
    let acceptsSelection = true;
    const { app, host } = mount(() => h(GridRoot, {
      rows, defaultHighlightedValue: 'a', readonly: readonly.value, disabled: disabled.value,
      ...(mask & 1 ? { modelValue: value.value } : {}),
      ...(mask & 2 ? { highlightedValue: highlight.value } : {}),
      ...(mask & 4 ? { editMode: mode.value } : {}),
      'onUpdate:modelValue': (next) => { if (acceptsSelection) value.value = next; },
      'onUpdate:highlightedValue': (next) => { highlight.value = next; },
      'onUpdate:editMode': (next) => { mode.value = next; },
      onEditStart: (id) => edits.push(['start', id]),
      onEditCommit: (id) => edits.push(['commit', id]),
      onEditCancel: (id) => edits.push(['cancel', id]),
    }, { default: (state) => {
      snapshot = state;
      return h(GridRow, null, { default: () => rows[0].map((id) => h(GridCell, { key: id, value: id })) });
    } }));
    let unmounted = false;
    try {
      await settle();
      const root = host.querySelector('[data-part="root"]');
      const a = host.querySelector('[data-sectile-grid-cell="a"]');
      const b = host.querySelector('[data-sectile-grid-cell="b"]');
      gridKey(root, 'ArrowRight');
      await settle();
      assert.equal(snapshot.highlightedValue, 'b');
      assert.equal(b.tabIndex, 0);
      gridKey(root, ' ');
      await settle();
      assert.equal(snapshot.value, 'b');
      assert.equal(b.getAttribute('aria-selected'), 'true');
      for (const key of ['F2', 'Enter', 'F2', 'Escape']) {
        gridKey(root, key);
        await settle();
      }
      assert.deepEqual(edits, [['start', 'b'], ['commit', 'b'], ['start', 'b'], ['cancel', 'b']]);
      assert.equal(snapshot.editMode, 'navigation');
      acceptsSelection = false;
      a.click();
      await settle();
      assert.equal(snapshot.value, mask & 1 ? 'b' : 'a');
      assert.equal(b.getAttribute('aria-selected'), mask & 1 ? 'true' : 'false');
      readonly.value = true;
      await settle();
      const selected = snapshot.value;
      b.click(); gridKey(root, 'F2');
      await settle();
      assert.equal(snapshot.value, selected);
      assert.equal(edits.length, 4);
      gridKey(root, 'ArrowRight');
      await settle();
      assert.equal(snapshot.highlightedValue, 'b', 'read-only still permits navigation');
      disabled.value = true;
      await settle();
      gridKey(root, 'ArrowLeft');
      await settle();
      assert.equal(snapshot.highlightedValue, 'b');
      disabled.value = false;
      await settle();
      let focusCalls = 0;
      for (const cell of [a, b]) {
        const focus = cell.focus;
        cell.focus = function (...args) { focusCalls += 1; return focus.apply(this, args); };
      }
      gridKey(root, 'ArrowLeft');
      const beforeUnmount = focusCalls;
      unmount(app, host); unmounted = true;
      await settle();
      assert.equal(focusCalls, beforeUnmount, 'queued focus is inert after unmount');
      const editsBefore = edits.length;
      gridKey(root, 'F2'); b.click();
      await settle();
      assert.equal(edits.length, editsBefore, 'detached root has no live edit listeners');
    } finally { if (!unmounted) unmount(app, host); }
  }
});

function gridKey(root, key) {
  root.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

test('Vue tree grid drops stale expansion and reconciles cell state', async () => {
  const rows = ref([
    { id: 'root', parentID: null, cells: ['a'] },
    { id: 'leaf', parentID: 'root', cells: ['b'] },
  ]);
  const value = ref('b');
  const expanded = ref(['root']);
  const highlighted = ref('b');
  const { app, host } = mount(() => h(TreeGridRoot, {
    rows: rows.value,
    getCellValue: () => '',
    setCellValue: () => undefined,
    modelValue: value.value,
    expandedValue: expanded.value,
    highlightedValue: highlighted.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
    'onUpdate:expandedValue': (next) => { expanded.value = next; },
    'onUpdate:highlightedValue': (next) => { highlighted.value = next; },
  }));

  await settle();
  rows.value = [{ id: 'other', parentID: null, cells: ['c'] }];
  await settle();
  assert.equal(value.value, null);
  assert.deepEqual(expanded.value, []);
  assert.equal(highlighted.value, 'c');
  unmount(app, host);
});

test('Vue carousel proposes the next valid slide after removal', async () => {
  const slides = ref(['a', 'b']);
  const value = ref('b');
  const { app, host } = mount(() => h(CarouselRoot, {
    slides: slides.value,
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }));

  await settle();
  slides.value = ['a'];
  await settle();
  assert.equal(value.value, 'a');
  unmount(app, host);
});

test('Vue toolbar reconciles controlled focus after items change', async () => {
  const items = ref(['a', 'b']);
  const value = ref('b');
  const orientation = shallowRef('horizontal');
  const { app, host } = mount(() => h(ToolbarRoot, {
    items: items.value,
    modelValue: value.value,
    orientation: orientation.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }, { default: () => h(ToolbarSeparator) }));

  await settle();
  assert.equal(host.querySelector('[role=separator]').getAttribute('aria-orientation'), 'vertical');
  orientation.value = 'vertical';
  items.value = ['a'];
  await settle();
  assert.equal(value.value, 'a');
  assert.equal(host.querySelector('[role=separator]').getAttribute('aria-orientation'), 'horizontal');
  unmount(app, host);
});

test('Vue carousel forwards reactive group and pause labels without competing attribute owners', async () => {
  const korean = ref(true);
  const koPause = paused => paused ? '자동 재생' : '일시 정지';
  const enPause = paused => paused ? 'Resume' : 'Pause';
  const { app, host } = mount(() => h(CarouselRoot, { slides: ['a', 'b'],
    indicatorGroupLabel: korean.value ? '슬라이드 선택' : 'Choose', getPauseLabel: korean.value ? koPause : enPause,
  }, { default: () => [h(CarouselPause), h(CarouselIndicatorGroup)] }));
  await settle();
  const pause = host.querySelector('[data-part="pause"]'), group = host.querySelector('[data-part="indicator-group"]');
  assert.equal(group.getAttribute('aria-label'), '슬라이드 선택');
  assert.equal(pause.getAttribute('aria-label'), '일시 정지');
  pause.click(); await settle();
  assert.equal(pause.getAttribute('aria-label'), '자동 재생');
  korean.value = false; await settle();
  assert.equal(group.getAttribute('aria-label'), 'Choose');
  assert.equal(pause.getAttribute('aria-label'), 'Resume');
  unmount(app, host);
  pause.click(); await settle();
  assert.equal(pause.getAttribute('aria-label'), 'Resume');
});

test('ISSUE-127: Vue toolbar keeps controlled null semantic state while DOM owns one entry', async () => {
  const value = ref(null);
  const updates = [];
  const { app, host } = mount(() => h(ToolbarRoot, {
    items: ['a', 'b'],
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { updates.push(next); value.value = next; },
  }, {
    default: () => [h(ToolbarItem, { value: 'a' }), h(ToolbarItem, { value: 'b' })],
  }));

  await settle();
  const items = () => [...host.querySelectorAll('[data-part="item"]')];
  assert.deepEqual(items().map((element) => element.tabIndex), [0, -1]);
  assert.equal(value.value, null);
  assert.deepEqual(updates, []);

  value.value = 'b';
  await settle();
  assert.deepEqual(items().map((element) => element.tabIndex), [-1, 0]);
  assert.deepEqual(updates, []);

  value.value = null;
  await settle();
  assert.deepEqual(items().map((element) => element.tabIndex), [0, -1]);
  assert.equal(value.value, null);
  assert.deepEqual(updates, []);
  unmount(app, host);
});

test('Vue pagination clamps a controlled page when total shrinks', async () => {
  const total = ref(100);
  const page = ref(10);
  const { app, host } = mount(() => h(PaginationRoot, {
    total: total.value,
    modelValue: page.value,
    itemsPerPage: 10,
    'onUpdate:modelValue': (next) => { page.value = next; },
  }, { default: ({ items }) => items.map(item => h(PaginationItem, { item: item.type === 'page' ? { ...item, selected: false } : item })) }));

  await settle();
  assert.equal(host.querySelector('[aria-current=page]').dataset.paginationPage, '10');
  total.value = 15;
  await settle();
  assert.equal(page.value, 2);
  assert.equal(host.querySelector('[aria-current=page]').dataset.paginationPage, '2');
  assert.equal(host.querySelectorAll('[aria-current=page]').length, 1);
  unmount(app, host);
});

test('Vue Select fulfills pending keyboard focus when a windowed option mounts', async () => {
  const visible = shallowRef(['a']), items = ['a', 'b']; let state;
  const fixture = mount(() => h(SelectRoot, { items, renderedItems: visible.value, defaultValue: 'a', defaultOpen: true, position: false, label: 'Choose' }, {
    default: value => { state = value; return [h(SelectTrigger, null, () => 'Choose'), h(SelectContent, null, {
      default: () => visible.value.map(id => h(SelectItem, { value: id, key: id }, () => id)),
    })]; },
  }));
  try {
    await settle(); const a = fixture.host.querySelector('[role=option]'); a.focus();
    a.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })); await settle();
    assert.equal(state.highlightedValue, 'b'); assert.equal(state.value, 'a');
    assert.equal(fixture.host.querySelector('[role=listbox]').hasAttribute('aria-activedescendant'), false);
    visible.value = ['b']; await settle();
    const b = fixture.host.querySelector('[role=option]'); assert.equal(document.activeElement, b);
    assert.equal(b.tabIndex, 0); assert.equal(state.value, 'a');
    assert.equal(fixture.host.querySelector('[role=listbox]').getAttribute('aria-activedescendant'), b.id);
    visible.value = []; await settle();
    assert.equal(fixture.host.querySelector('[role=listbox]').hasAttribute('aria-activedescendant'), false);
    assert.equal(state.highlightedValue, 'b'); assert.equal(state.value, 'a');
  } finally { unmount(fixture.app, fixture.host); }
});

test('Vue Select selected Form projection does not rescan source on cursor-only publication', async () => {
  let reads = 0, state;
  const items = Array.from({ length: 5000 }, (_, index) => 'row-' + index);
  for (let index = 0; index < items.length; index++) {
    const value = items[index]; Object.defineProperty(items, index, { get() { reads++; return value; }, configurable: true });
  }
  const fixture = mount(() => h(SelectRoot, { items, defaultValue: 'row-4999', defaultOpen: true, position: false, name: 'service', formOptions: 'selected' }, {
    default: current => { state = current; return [h(SelectTrigger), h(SelectContent, null, { default: () => h(SelectItem, { value: 'row-4999' }, () => 'Last row') })]; },
  }));
  try {
    await settle(); reads = 0;
    const item = fixture.host.querySelector('[role=option]'); item.focus();
    item.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })); await settle();
    assert.equal(state.highlightedValue, 'row-4998');
    assert.equal(reads, 0); assert.equal(fixture.host.querySelectorAll('select option').length, 2);
  } finally { unmount(fixture.app, fixture.host); }
});

test('Vue select clears a controlled value removed from its items', async () => {
  const items = ref(['a', 'b']);
  const value = ref('b');
  const { app, host } = mount(() => h(SelectRoot, {
    items: items.value,
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }, { default: () => [h(SelectTrigger), h(SelectContent)] }));

  await settle();
  items.value = ['a'];
  await settle();
  assert.equal(value.value, null);
  unmount(app, host);
});

test('Vue cascade select clears a controlled leaf removed from its tree', async () => {
  const nodes = ref([{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }]);
  const value = ref('leaf');
  const { app, host } = mount(() => h(CascadeSelectRoot, {
    nodes: nodes.value,
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }, { default: () => [h(CascadeSelectTrigger), h(CascadeSelectContent)] }));

  await settle();
  nodes.value = [{ id: 'other', parentID: null }];
  await settle();
  assert.equal(value.value, null);
  unmount(app, host);
});

test('Vue menu families mount many submenu surfaces with linear branch projection', async () => {
  for (const Root of [MenuRoot, MenuButtonRoot, MenubarRoot, NavigationMenuRoot]) {
    for (const size of [16, 64, 128]) {
      const branches = Array.from({ length: size }, (_, index) => `branch-${index}`);
      const items = branches.flatMap((id) => [{ id }, { id: `${id}-leaf`, parentID: id }]);
      const setAttribute = HTMLElement.prototype.setAttribute;
      let branchWrites = 0;
      HTMLElement.prototype.setAttribute = function (name, value) {
        if (name === 'aria-haspopup' && value === 'menu') branchWrites += 1;
        return setAttribute.call(this, name, value);
      };
      let mounted;
      let surfaces = [];
      let surfaceIDs = [];
      try {
        const content = () => branches.flatMap((id) => [
          h(MenuItem, { key: id, value: id }),
          h(MenuSubContent, { key: `${id}-surface`, for: id }, {
            default: () => h(MenuItem, { value: `${id}-leaf` }),
          }),
        ]);
        mounted = mount(() => h(Root, {
          items, ...(Root === MenuButtonRoot ? { defaultOpen: true, position: false } : {}),
        }, { default: () => Root === MenuButtonRoot
          ? [h(MenuButtonTrigger), h(MenuButtonContent, null, { default: content })] : content(),
        }));
        await settle();
        surfaces = [...mounted.host.querySelectorAll('[data-sectile-submenu-for]')];
        surfaceIDs = surfaces.map(surface => surface.id);
        assert.equal(surfaces.length, size);
        assert.ok(branchWrites <= 4 * size + 2, `${Root.name}: ${size} branches caused ${branchWrites} projections`);
        for (const surface of surfaces) {
          const id = surface.dataset.sectileSubmenuFor;
          const anchor = mounted.host.querySelector(`[data-sectile-menu-id="${id}"]`);
          assert.equal(anchor.getAttribute('aria-controls'), surface.id);
          assert.notEqual(surface.id, '');
        }
      } finally {
        HTMLElement.prototype.setAttribute = setAttribute;
        if (mounted !== undefined) unmount(mounted.app, mounted.host);
      }
      await settle();
      for (const [index, surface] of surfaces.entries()) assert.equal(surface.id, surfaceIDs[index], 'Native part identity survives detached-node retention');
    }
  }
});

test('Vue menu bulk mount keeps item registration projection work linear', async () => {
  const size = 256;
  const items = Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, parentID: null }));
  const originalSetAttribute = HTMLElement.prototype.setAttribute;
  let menuItemRoleWrites = 0;
  HTMLElement.prototype.setAttribute = function setAttribute(name, value) {
    if (name === 'role' && value === 'menuitem') menuItemRoleWrites += 1;
    return originalSetAttribute.call(this, name, value);
  };
  let mounted;
  try {
    mounted = mount(() => h(MenuRoot, { items, defaultHighlightedValue: 'item-0' }, {
      default: () => items.map(({ id }) => h(MenuItem, { value: id }, { default: () => id })),
    }));
    await settle();
    const elements = [...mounted.host.querySelectorAll('[data-sectile-menu-id]')];
    assert.equal(elements.length, size);
    assert.equal(elements[0].tabIndex, 0);
    assert.equal(elements[size - 1].tabIndex, -1);
    assert.ok(menuItemRoleWrites <= size * 4, `menuitem role writes ${menuItemRoleWrites} exceeded linear bound`);
  } finally {
    HTMLElement.prototype.setAttribute = originalSetAttribute;
    if (mounted !== undefined) unmount(mounted.app, mounted.host);
  }
});

for (const Root of [MenuRoot, MenuButtonRoot, MenubarRoot, NavigationMenuRoot]) {
  test(`Vue ${Root.name} routes adopted item descendants without scanning unrelated hosts`, async () => {
    const items = Array.from({ length: 256 }, (_, index) => ({ id: `route-${index}`, parentID: null }));
    const invoked = [];
    const content = () => [
      h('span', { 'data-unmatched': '' }, 'Separator'),
      ...items.map(({ id }) => h(MenuItem, { value: id, asChild: true }, {
        default: () => h('button', null, [h('span', { 'data-target': id }, id)]),
      })),
    ];
    const { app, host } = mount(() => h(Root, {
      items, onInvoke: (id) => invoked.push(id),
      ...(Root === MenuButtonRoot ? { defaultOpen: true, position: false } : {}),
    }, { default: () => Root === MenuButtonRoot
      ? [h(MenuButtonTrigger), h(MenuButtonContent, null, { default: content })]
      : content(),
    }));
    try {
      await settle();
      let containsCalls = 0;
      for (const item of host.querySelectorAll('[data-sectile-menu-id]')) {
        const contains = item.contains;
        item.contains = function (target) { containsCalls += 1; return contains.call(this, target); };
      }
      host.querySelector('[data-unmatched]').dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
      await settle();
      assert.deepEqual(invoked, []);
      assert.equal(containsCalls, 0);
      host.querySelector('[data-target="route-255"]').dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
      await settle();
      assert.deepEqual(invoked, ['route-255']);
      assert.equal(containsCalls, 0);
    } finally { unmount(app, host); }
  });
}

for (const Root of [MenuRoot, MenuButtonRoot, MenubarRoot, NavigationMenuRoot]) {
  test(`Vue ${Root.name} projects cursor deltas without rediscovering registered parts`, async () => {
    const items = Array.from({ length: 1_024 }, (_, index) => ({ id: `delta-${index}` }));
    const content = () => items.map(({ id }) => h(MenuItem, { key: id, value: id }, { default: () => id }));
    const invoked = [];
    const { app, host } = mount(() => h(Root, {
      items, defaultHighlightedValue: 'delta-0', onInvoke: (id) => invoked.push(id),
      ...(Root === MenuButtonRoot ? { defaultOpen: true, position: false } : {}),
    }, { default: () => Root === MenuButtonRoot
      ? [h(MenuButtonTrigger), h(MenuButtonContent, null, { default: content })] : content(),
    }));
    try {
      await settle();
      const elements = [...host.querySelectorAll('[data-sectile-menu-id]')];
      const root = elements[0].parentElement;
      const query = root.querySelectorAll;
      let discoveries = 0;
      let attributeWrites = 0;
      root.querySelectorAll = function (...args) { discoveries += 1; return query.apply(this, args); };
      for (const element of elements) {
        const setAttribute = element.setAttribute;
        element.setAttribute = function (name, value) {
          if (name === 'role' || name === 'aria-disabled') attributeWrites += 1;
          return setAttribute.call(this, name, value);
        };
      }
      const key = Root === MenubarRoot || Root === NavigationMenuRoot ? 'ArrowRight' : 'ArrowDown';
      elements[0].dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await settle();
      assert.equal(elements[0].tabIndex, -1);
      assert.equal(elements[1].tabIndex, 0);
      assert.equal(elements[1].hasAttribute('data-highlighted'), true);
      assert.equal(discoveries, 0);
      assert.equal(attributeWrites, 0);
      elements.at(-1).click();
      await settle();
      assert.deepEqual(invoked, ['delta-1023']);
      assert.equal(elements[1].tabIndex, -1);
      const inlineSurface = Root !== MenuButtonRoot;
      assert.equal(elements.at(-1).tabIndex, inlineSurface ? 0 : -1);
      if (inlineSurface) assert.equal(browserWindow.document.activeElement === elements.at(-1), true);
      assert.equal(discoveries, 0, 'click publication and presence completion do not scan parts');
      assert.equal(attributeWrites, 0);
    } finally { unmount(app, host); }
  });
}

test('Vue menu registers a later-mounted item without a semantic refresh scan', async () => {
  const show = ref(false);
  const invoked = [];
  const { app, host } = mount(() => h(MenuRoot, {
    items: [{ id: 'first' }, { id: 'later' }], onInvoke: (id) => invoked.push(id),
  }, { default: () => [h(MenuItem, { value: 'first' }), show.value ? h(MenuItem, { value: 'later' }) : null] }));
  try {
    await settle();
    show.value = true;
    await settle();
    host.querySelector('[data-sectile-menu-id="later"]').click();
    await settle();
    assert.deepEqual(invoked, ['later']);
  } finally { unmount(app, host); }
});

test('Vue menu unregisters a conditionally removed submenu from DOM ownership', async () => {
  const showSubmenu = ref(true);
  const items = [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }];
  const { app, host } = mount(() => h(MenuRoot, { items, defaultHighlightedValue: 'file' }, {
    default: () => [
      h(MenuItem, { value: 'file' }, { default: () => 'File' }),
      showSubmenu.value
        ? h(MenuSubContent, { for: 'file' }, { default: () => h(MenuItem, { value: 'open' }, { default: () => 'Open' }) })
        : null,
    ],
  }));

  await settle();
  const file = host.querySelector('[data-sectile-menu-id="file"]');
  const submenu = host.querySelector('[data-sectile-submenu-for="file"]');
  assert.ok(file instanceof HTMLElement);
  assert.ok(submenu instanceof HTMLElement);
  file.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
  await settle();
  assert.notEqual(file.getAttribute('aria-controls'), null);

  showSubmenu.value = false;
  await settle();
  assert.equal(host.querySelector('[data-sectile-submenu-for="file"]'), null);
  assert.equal(file.getAttribute('aria-controls'), null);
  assert.equal(submenu.style.position, '');
  showSubmenu.value = true;
  await settle();
  const replacement = host.querySelector('[data-sectile-submenu-for="file"]');
  assert.equal(replacement.id, submenu.id); assert.equal(file.getAttribute('aria-controls'), replacement.id);
  unmount(app, host);
});

test('Vue menu and feed reconcile internal focus after their domains change', async () => {
  const menuItems = ref([{ id: 'a' }, { id: 'b' }]);
  const feedItems = ref(['a', 'b']);
  let menuHighlight = null;
  let feedHighlight = null;
  const { app, host } = mount(() => h('div', [
    h(MenuRoot, { items: menuItems.value, defaultHighlightedValue: 'b' }, {
      default: (state) => { menuHighlight = state.highlightedValue; return []; },
    }),
    h(FeedRoot, {
      items: feedItems.value,
      defaultHighlightedValue: 'b',
      onHighlight: (next) => { feedHighlight = next; },
    }),
  ]));

  await settle();
  menuItems.value = [{ id: 'a' }];
  feedItems.value = ['a'];
  await settle();
  assert.equal(menuHighlight, 'a');
  assert.equal(feedHighlight, 'a');
  unmount(app, host);
});

test('Vue ContextMenu delegates pointer and keyboard invocation and preserves point across provider and part reconnects', async () => {
  const f = contextFixture();
  try {
    await f.drain(); f.trigger.focus();
    assert.equal(f.pointer(200, 180).defaultPrevented, true); await f.drain();
    assert.equal(f.content.hidden, false); assert.equal(f.content.style.left, '200px'); assert.equal(f.content.style.top, '180px');
    assert.ok(document.activeElement === f.first); assert.equal(f.view.highlightedValue, 'first');
    const model = f.view.model;
    f.options.value = { ...f.options.value, label: 'Parcel actions' }; await f.drain();
    assert.ok(f.view.model === model); assert.equal(f.content.style.left, '200px');
    const previous = f.content; f.tag.value = 'section'; await f.drain();
    assert.ok(f.content !== previous); assert.equal(f.content.localName, 'section');
    assert.equal(f.content.style.left, '200px'); assert.equal(f.content.style.top, '180px');
    f.direction.value = 'rtl'; await f.drain(); assert.equal(f.content.style.left, '160px');
    f.key(f.trigger, 'F10', { shiftKey: true }); await f.drain();
    assert.equal(f.content.style.left, '110px'); assert.equal(f.content.style.top, '70px');
    assert.ok(document.activeElement === f.first);
    f.key(f.first, 'Escape'); await f.drain(); assert.equal(f.view.open, false);
    assert.ok(document.activeElement === f.trigger);
  } finally { f.close(); }
});

test('Vue ContextMenu keeps controlled opening proposals and manual-point continuity without event replay', async () => {
  const f = contextFixture({ open: false, position: false });
  try {
    await f.drain(); f.trigger.focus(); f.pointer(220, 190); await f.drain();
    assert.deepEqual(f.proposals, [true]); assert.equal(f.view.open, false);
    assert.ok(document.activeElement === f.trigger);
    f.options.value = { ...f.options.value, open: true }; await f.drain();
    assert.equal(f.content.hidden, false); assert.ok(document.activeElement === f.first);
    f.options.value = { ...f.options.value, position: true }; await f.drain();
    assert.equal(f.content.style.left, '220px'); assert.equal(f.content.style.top, '190px');
    assert.deepEqual(f.proposals, [true], 'reconnects do not replay opening proposals');
  } finally { f.close(); }
});

test('Vue ContextMenu releases inactive/unmounted work and makes retained native events and observer callbacks inert', async () => {
  const f = contextFixture();
  try {
    await f.drain(); f.pointer(200, 180); await f.drain();
    const accepted = f.proposals.length;
    for (let cycle = 0; cycle < 4; cycle++) {
      f.active.value = false; await f.drain();
      assert.equal(f.frames.size, 0); assert.ok(f.observers.every(observer => observer.targets.size === 0));
      assert.equal(f.pointer(300, 300).defaultPrevented, false);
      f.active.value = true; await f.drain(); assert.equal(f.content.style.left, '200px');
    }
    assert.equal(f.proposals.length, accepted);
    const trigger = f.trigger; f.unmount(); await f.drain();
    for (const observer of f.observers) observer.callback();
    const event = new browserWindow.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: 300, clientY: 300 });
    trigger.dispatchEvent(event); await f.drain();
    assert.equal(event.defaultPrevented, false); assert.equal(f.proposals.length, accepted);
    assert.equal(f.frames.size, 0); assert.ok(f.observers.every(observer => observer.targets.size === 0));
    assert.equal(f.view.presentation, undefined);
  } finally { f.close(); }
});

function contextFixture(initial = {}) {
  const options = shallowRef({ label: 'Actions', ...initial }), tag = shallowRef('div'), active = shallowRef(true), direction = shallowRef('ltr');
  const items = [{ id: 'first', parentID: null }, { id: 'second', parentID: null }], proposals = [], frames = new Map(), observers = [];
  const original = { request: browserWindow.requestAnimationFrame, cancel: browserWindow.cancelAnimationFrame, resize: browserWindow.ResizeObserver, intersection: browserWindow.IntersectionObserver };
  let sequence = 0, view, retired = false;
  browserWindow.requestAnimationFrame = callback => { const id = ++sequence; frames.set(id, callback); return id; };
  browserWindow.cancelAnimationFrame = id => frames.delete(id);
  browserWindow.ResizeObserver = browserWindow.IntersectionObserver = class {
    targets = new Set();
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.targets.clear(); }
  };
  const setRect = (element, x, y, width, height) => { if (element) element.getBoundingClientRect = () => ({ x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON() { return this; } }); };
  const boundary = document.createElement('div'); document.body.append(boundary); setRect(boundary, 0, 0, 800, 600);
  const fixture = mount(() => h(HostProvider, { active: active.value, direction: direction.value }, {
    default: () => h(ContextMenuRoot, { ...options.value, items, collisionBoundary: boundary, collisionPadding: 0,
      'onUpdate:open': value => proposals.push(value) }, {
      default: state => { view = state; return [h(ContextMenuTrigger, null, { default: () => 'Context actions' }),
        h(ContextMenuContent, { as: tag.value }, { default: () => items.map(item => h(ContextMenuItem, { value: item.id, as: 'button' }, { default: () => item.id })) })]; },
    }),
  }));
  const trigger = () => fixture.host.querySelector('[data-scope=context-menu][data-part=trigger]');
  const content = () => fixture.host.querySelector('[data-scope=context-menu][data-part=content]');
  const drain = async () => { for (let turn = 0; turn < 4; turn++) {
    await settle(); setRect(trigger(), 50, 40, 100, 30); setRect(content(), 0, 0, 40, 20);
    const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(0);
  } await settle(); };
  const pointer = (clientX, clientY) => { const event = new browserWindow.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX, clientY }); trigger().dispatchEvent(event); return event; };
  const key = (target, key, init = {}) => { const event = new browserWindow.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }); target.dispatchEvent(event); return event; };
  const retire = () => { if (!retired) { retired = true; unmount(fixture.app, fixture.host); } };
  const close = () => { try { retire(); } finally {
    boundary.remove(); browserWindow.requestAnimationFrame = original.request; browserWindow.cancelAnimationFrame = original.cancel;
    browserWindow.ResizeObserver = original.resize; browserWindow.IntersectionObserver = original.intersection;
  } };
  return { options, tag, active, direction, frames, observers, proposals, drain, pointer, key, unmount: retire, close,
    get view() { return view; }, get trigger() { return trigger(); }, get content() { return content(); },
    get first() { return fixture.host.querySelector('[data-sectile-menu-id=first]'); } };
}

function mount(render) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  return { app, host };
}

function unmount(app, host) {
  app.unmount();
  host.remove();
}
