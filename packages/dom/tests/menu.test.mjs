import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createMenu } from '../.verification-dist/menu.js';
import { createMenuButton } from '../.verification-dist/menu-button.js';
import { createMenubar } from '../.verification-dist/menubar.js';
import { createNavigationMenu } from '../.verification-dist/navigation-menu.js';

test('DOM menu button owns trigger, nested popup path, and invocation', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const file = new FakeElement();
  const open = new FakeElement();
  let invoked = null;
  const menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
    onInvoke: (id) => { invoked = id; },
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(open, 'open');
  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  menu.handleEvent('invoke');

  assert.equal(invoked, 'open');
  assert.equal(trigger.attributes.get('aria-expanded'), 'false');
});

test('DOM menu item registration performs constant projection work per flat item', () => {
  for (const size of [64, 512, 2_048]) {
    const root = new FakeElement();
    const items = Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, parentID: null }));
    const elements = items.map(() => new CountingElement());
    const menu = createMenu({ root, items });

    for (let index = 0; index < size; index += 1) menu.setItemAttributes(elements[index], items[index].id);

    const projectionWrites = elements.reduce((total, element) => total + element.projectionWrites, 0);
    assert.equal(projectionWrites, size * 2, `size ${size}`);
    menu.disconnect();
  }
});

test('DOM menu families register submenu surfaces with linear projection and no registry scans', () => {
  for (const create of [createMenu, createMenuButton, createMenubar, createNavigationMenu]) {
    for (const size of [16, 128, 1_024]) {
      const items = Array.from({ length: size }, (_, id) => [{ id }, { id: `child-${id}`, parentID: id }]).flat();
      const root = new CountingElement();
      const menu = create({ root, trigger: new FakeElement(), items, defaultOpen: true, position: false });
      const hosts = items.map(() => new CountingElement());
      const surfaces = Array.from({ length: size }, () => new CountingElement());
      hosts.forEach((element, index) => menu.setItemAttributes(element, items[index].id));
      hosts.forEach((element) => { element.projectionWrites = 0; });
      root.projectionWrites = 0;
      const before = menu.getSnapshot();
      const iterate = Map.prototype[Symbol.iterator];
      let entriesVisited = 0;
      Map.prototype[Symbol.iterator] = function* () {
        for (const entry of iterate.call(this)) { entriesVisited += 1; yield entry; }
      };
      try {
        surfaces.forEach((element, id) => menu.setSubmenuAttributes(element, id));
        assert.equal(entriesVisited, 0, 'registration probes ownership indexes, not existing registries');
        assert.equal(root.projectionWrites, 0, 'submenu registration does not republish root state');
        assert.equal(menu.getSnapshot(), before);
        assert.ok(hosts.reduce((sum, element) => sum + element.projectionWrites, 0) <= size * 5);
        assert.ok(surfaces.reduce((sum, element) => sum + element.projectionWrites, 0) <= size * 4);
        for (let id = 0; id < size; id += 1) {
          assert.equal(hosts[id * 2 + 1].projectionWrites, 0, 'unrelated leaf projection is untouched');
          assert.equal(hosts[id * 2].getAttribute('aria-controls'), surfaces[id].id);
          assert.equal(surfaces[id].hidden, true);
          assert.equal(surfaces[id].dataset.level, '1');
        }
        hosts.forEach((element) => { element.projectionWrites = 0; });
        surfaces.forEach((element) => { element.projectionWrites = 0; });
        surfaces.forEach((element, id) => menu.setSubmenuAttributes(element, id));
        assert.equal(hosts.reduce((sum, element) => sum + element.projectionWrites, 0), 0);
        assert.equal(surfaces.reduce((sum, element) => sum + element.projectionWrites, 0), 0);
        assert.equal(entriesVisited, 0);
      } finally {
        Map.prototype[Symbol.iterator] = iterate;
        menu.destroy();
      }
      surfaces.forEach((element) => { assert.equal(element.id, ''); assert.equal(element.hidden, false); });
      assert.ok([...root.listeners.values()].every((listeners) => listeners.size === 0));
    }
  }
});

test('submenu ownership transfers restore old attributes and leave one live branch', () => {
  for (const create of [createMenu, createMenuButton, createMenubar, createNavigationMenu]) {
    const root = new FakeElement();
    const a = new FakeElement(), b = new FakeElement(), shared = new FakeElement(), replacement = new FakeElement();
    shared.hidden = true; shared.setAttribute('hidden', 'until-found');
    const menu = create({ root, trigger: new FakeElement(), defaultOpen: true, position: false,
      items: [{ id: 0 }, { id: 'leaf-a', parentID: 0 }, { id: '0' }, { id: 'leaf-b', parentID: '0' }],
    });
    try {
      menu.setItemAttributes(a, 0); menu.setItemAttributes(b, '0');
      for (let cycle = 0; cycle < 32; cycle += 1) {
        menu.setSubmenuAttributes(shared, 0);
        const firstID = shared.id;
        assert.equal(a.getAttribute('aria-controls'), firstID);
        menu.setSubmenuAttributes(shared, '0');
        assert.equal(a.getAttribute('aria-controls'), null);
        assert.notEqual(shared.id, firstID);
        assert.equal(b.getAttribute('aria-controls'), shared.id);
        menu.setSubmenuAttributes(replacement, '0');
        assert.equal(shared.id, '');
        assert.equal(shared.getAttribute('hidden'), 'until-found');
        menu.setSubmenuAttributes(undefined, '0');
        menu.setSubmenuAttributes(undefined, '0');
        assert.equal(replacement.id, '');
        assert.equal(b.getAttribute('aria-controls'), null);
      }
      menu.send({ type: 'focus', id: 0 }); menu.send('open-submenu');
      menu.setSubmenuAttributes(shared, 0);
      assert.equal(shared.hidden, false, 'late registration uses the already-open canonical branch');
      assert.equal(a.getAttribute('aria-expanded'), 'true');
      menu.setSubmenuAttributes(replacement, '0');
      assert.equal(replacement.hidden, true, 'sibling surface does not inherit another branch state');
      shared.id = 'consumer-id'; shared.setAttribute('id', 'consumer-id');
      a.setAttribute('aria-controls', 'consumer-control');
      menu.setSubmenuAttributes(undefined, 0);
      assert.equal(shared.id, 'consumer-id');
      assert.equal(a.getAttribute('aria-controls'), 'consumer-control');
    } finally { menu.destroy(); }
  }
});

test('DOM menu item replacement preserves one host owner and unregisters the previous host', () => {
  const root = new FakeElement();
  const shared = new FakeElement();
  const replacement = new FakeElement();
  const menu = createMenu({
    root,
    items: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }],
    disabledItems: ['b'],
  });

  menu.setItemAttributes(shared, 'a');
  menu.setItemAttributes(shared, 'b');
  root.emit('click', { target: shared });
  assert.equal(menu.getSnapshot().state.cursor.current, 'b');

  menu.handleEvent('first');
  menu.setItemAttributes(replacement, 'b');
  root.emit('click', { target: shared });
  assert.equal(menu.getSnapshot().state.cursor.current, 'a');
  root.emit('click', { target: replacement });
  assert.equal(menu.getSnapshot().state.cursor.current, 'b');

  menu.setItemAttributes(undefined, 'b');
  menu.handleEvent('first');
  root.emit('click', { target: replacement });
  assert.equal(menu.getSnapshot().state.cursor.current, 'a');
  menu.disconnect();
});

test('DOM menu transitions project only changed cursor hosts at 1k, 10k, and 100k items', () => {
  for (const size of [1_000, 10_000, 100_000]) {
    const root = new FakeElement();
    const items = Array.from({ length: size }, (_, id) => ({ id }));
    const tabWrites = [];
    const elements = items.map(({ id }) => {
      const element = new CountingElement();
      let tabIndex = -1;
      Object.defineProperty(element, 'tabIndex', {
        get: () => tabIndex,
        set: (value) => { tabIndex = value; tabWrites.push([id, value]); },
      });
      return element;
    });
    const invoked = [];
    const menu = createMenu({ root, items, defaultHighlightedValue: 0, onInvoke: (id) => invoked.push(id) });
    try {
      elements.forEach((element, id) => menu.setItemAttributes(element, id));
      elements.forEach((element) => { element.projectionWrites = 0; });
      tabWrites.length = 0;
      menu.send('next');
      assert.deepEqual(tabWrites, [[0, -1], [1, 0]]);
      tabWrites.length = 0;
      menu.send('previous');
      assert.deepEqual(tabWrites, [[1, -1], [0, 0]]);
      tabWrites.length = 0;
      menu.send('first');
      assert.deepEqual(tabWrites, []);
      root.emit('click', { target: elements.at(-1), composedPath: () => [elements.at(-1), root] });
      assert.deepEqual(invoked, [size - 1]);
      assert.deepEqual(tabWrites, [[0, -1], [size - 1, 0], [size - 1, -1], [0, 0]]);
      menu.refresh(null);
      assert.equal(elements.reduce((sum, element) => sum + element.projectionWrites, 0), 0);
      assert.equal(menu.state.cursor.current, null);
    } finally { menu.destroy(); }
  }
});

test('DOM menu path deltas match full reconciliation without visiting unrelated submenus', () => {
  const items = [{ id: 'a' }, { id: 'nested', parentID: 'a' }, { id: 'leaf', parentID: 'nested' },
    { id: 'sibling', parentID: 'a' }, { id: 'b' }, { id: 'b-leaf', parentID: 'b' }];
  for (let index = 0; index < 64; index += 1) items.push({ id: `other-${index}` }, { id: `child-${index}`, parentID: `other-${index}` });
  const create = () => {
    const root = new FakeElement();
    const trigger = new FakeElement();
    const elements = new Map(items.map(({ id }) => [id, new CountingElement()]));
    const surfaces = new Map();
    const touched = new Set();
    const menu = createMenuButton({ root, trigger, items, position: false });
    for (const [id, element] of elements) menu.setItemAttributes(element, id);
    for (const id of ['a', 'nested', 'b', ...Array.from({ length: 64 }, (_, index) => `other-${index}`)]) {
      const surface = new FakeElement();
      let hidden = false;
      Object.defineProperty(surface, 'hidden', {
        get: () => { touched.add(id); return hidden; },
        set: (value) => { touched.add(id); hidden = value; },
      });
      surfaces.set(id, surface);
      menu.setSubmenuAttributes(surface, id);
    }
    return { menu, root, trigger, elements, surfaces, touched };
  };
  const actual = create();
  const reference = create();
  try {
    for (const event of ['open-popup', 'open-submenu', 'open-submenu', 'close-submenu',
      { type: 'focus', id: 'b' }, 'open-submenu', 'close-popup', 'open-popup']) {
      actual.touched.clear();
      actual.menu.send(event);
      assert.ok([...actual.touched].every((id) => !id.startsWith('other-')), 'unrelated position/visibility owners are untouched');
      reference.menu.send(event);
      reference.menu.refresh();
      assert.deepEqual(actual.menu.getSnapshot(), reference.menu.getSnapshot());
      assert.equal(actual.root.hidden, reference.root.hidden);
      assert.deepEqual(actual.trigger.attributes, reference.trigger.attributes);
      for (const [id, element] of actual.elements) {
        const expected = reference.elements.get(id);
        assert.equal(element.tabIndex, expected.tabIndex, id);
        for (const attribute of ['role', 'aria-expanded', 'aria-disabled', 'aria-haspopup']) {
          assert.equal(element.getAttribute(attribute), expected.getAttribute(attribute), `${id}: ${attribute}`);
        }
        if (actual.surfaces.has(id)) {
          assert.equal(element.getAttribute('aria-controls'), actual.surfaces.get(id).id);
          assert.equal(actual.surfaces.get(id).hidden, reference.surfaces.get(id).hidden, id);
        }
      }
    }
  } finally { actual.menu.destroy(); reference.menu.destroy(); }
});

test('DOM menu controlled publication and explicit host refresh preserve ownership and callback order', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const first = new FakeElement();
  const second = new FakeElement();
  const trace = [];
  let disabled = false;
  const menu = createMenuButton({ root, trigger, open: false, position: false,
    items: [{ id: 'first' }, { id: 'second' }], policies: { disabled: (id) => disabled && id === 'second' },
    onOpenChange: (open) => { trace.push(`change:${open}`); menu.syncControlledValue(open); },
    onUpdate: () => trace.push(`update:${menu.state.cursor.current}`),
    onInvoke: (id) => { trace.push(`invoke:${id}`); assert.equal(root.hidden, true); assert.equal(second.tabIndex, -1); },
  });
  menu.setItemAttributes(first, 'first'); menu.setItemAttributes(second, 'second');
  try {
    menu.send('open-popup');
    assert.equal(first.tabIndex, 0);
    menu.send('next');
    assert.equal(first.tabIndex, -1); assert.equal(second.tabIndex, 0);
    trace.length = 0;
    menu.send('invoke');
    assert.deepEqual(trace, ['change:false', 'update:null', 'invoke:second', 'update:null']);
    disabled = true;
    second.setAttribute('role', 'presentation');
    menu.refresh();
    assert.equal(second.getAttribute('role'), 'menuitem');
    assert.equal(second.getAttribute('aria-disabled'), 'true');
  } finally { menu.destroy(); }
});

test('DOM menu click routing follows path depth at 1k, 10k, and 100k registrations', () => {
  const { window } = menuDOM(500, 300);
  for (const size of [1_000, 10_000, 100_000]) {
    const root = new FakeElement();
    const items = Array.from({ length: size }, (_, id) => ({ id, parentID: null }));
    const elements = items.map(() => new FakeElement());
    const descendant = window.document.createElement('span');
    const unmatched = window.document.createElement('span');
    let containsCalls = 0;
    let invoked;
    const menu = createMenu({ root, items, onInvoke: (id) => { invoked = id; } });
    const contains = function (target) {
      containsCalls += 1;
      return this === elements.at(-1) && target === descendant;
    };
    for (let index = 0; index < size; index += 1) {
      elements[index].contains = contains;
      menu.setItemAttributes(elements[index], index);
    }
    const click = [...root.listeners.get('click')][0];
    try {
      for (const matched of [false, true]) {
        const target = matched ? descendant : unmatched;
        // A registered host beyond the root is never eligible for this listener.
        const path = matched ? [target, elements.at(-1), root] : [target, root, elements[0]];
        let steps = 0;
        let reads = 0;
        path[Symbol.iterator] = function* () {
          for (let index = 0; index < this.length; index += 1) { steps += 1; yield this[index]; }
        };
        const before = menu.getSnapshot();
        root.emit('click', { target, composedPath() { reads += 1; return path; } });
        assert.equal(reads, 1, `size ${size}: one composed path read`);
        assert.equal(steps, 2, `size ${size}: routing stops at the item or root`);
        assert.equal(containsCalls, 0, `size ${size}: no registered-item scan`);
        if (matched) assert.equal(invoked, size - 1);
        else assert.equal(menu.getSnapshot(), before, 'unmatched routing dispatches no transition');
      }
      menu.destroy();
      const before = menu.getSnapshot();
      click({ target: elements[0], composedPath: () => [elements[0], root] });
      assert.equal(menu.getSnapshot(), before, 'stale handlers cannot use cleared registrations');
      assert.equal(root.listeners.get('click').size, 0);
    } finally { menu.destroy(); }
  }
});

test('DOM menu click routing uses exact live ownership through replacement and unregister', () => {
  const root = new FakeElement();
  const shared = new FakeElement();
  const replacement = new FakeElement();
  const text = { parentNode: shared };
  shared.parentNode = root;
  replacement.parentNode = root;
  const invoked = [];
  const menu = createMenu({ root, items: [{ id: 0 }, { id: '0' }], onInvoke: (id) => invoked.push(id) });
  const click = (target, composedPath) => {
    menu.handleEvent('open-popup');
    root.emit('click', { target, ...(composedPath === undefined ? {} : { composedPath }) });
  };
  try {
    menu.setItemAttributes(shared, 0);
    click(text);
    assert.deepEqual(invoked, [0]);
    menu.setItemAttributes(shared, '0');
    click(text, () => []);
    assert.deepEqual(invoked, [0, '0']);
    menu.setItemAttributes(replacement, '0');
    click(text);
    assert.deepEqual(invoked, [0, '0'], 'a replaced host no longer owns its old ID');
    click(replacement);
    assert.deepEqual(invoked, [0, '0', '0']);
    menu.setItemAttributes(undefined, '0');
    click(replacement);
    click(null);
    assert.deepEqual(invoked, [0, '0', '0']);
  } finally { menu.destroy(); }
});

test('DOM menu descendant routing preserves submenu and disabled-item commands', () => {
  const { window, root, trigger, file, child, submenu } = menuDOM(500, 300);
  // Nested registered hosts must resolve to the closest host, not insertion order.
  const disabled = window.document.createElement('button');
  const disabledText = window.document.createTextNode('Disabled');
  disabled.append(disabledText);
  root.append(disabled);
  const label = window.document.createElement('span');
  file.prepend(label);
  const leafLabel = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  child.append(leafLabel);
  const invoked = [];
  const menu = createMenuButton({
    root, trigger, position: false,
    items: [{ id: 'file' }, { id: 'open', parentID: 'file' }, { id: 'disabled' }],
    disabledItems: ['disabled'], onInvoke: (id) => invoked.push(id),
  });
  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'open');
  menu.setItemAttributes(disabled, 'disabled');
  menu.setSubmenuAttributes(submenu, 'file');
  const click = (target) => target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, composed: true }));
  try {
    menu.send('open-popup');
    click(disabledText);
    assert.equal(menu.state.cursor.current, 'disabled');
    assert.deepEqual(invoked, []);
    click(label);
    assert.deepEqual(menu.state.openPath, ['file']);
    assert.equal(menu.state.cursor.current, 'open');
    click(leafLabel);
    assert.deepEqual(invoked, ['open']);
    assert.equal(menu.state.open, false);
  } finally { menu.destroy(); }
});

test('DOM menu button owns disabled, edge, typeahead, and controlled open state', () => {
  let now = 0;
  let external = false;
  let menu;
  const root = new FakeElement();
  const trigger = new FakeElement();
  const disabled = new FakeElement();
  menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'alpha', parentID: null }, { id: 'beta', parentID: null }, { id: 'build', parentID: null }],
    disabledItems: ['beta'],
    open: external,
    typeahead: { textValue: (id) => id, now: () => now },
    onOpenChange: (open) => { external = open; queueMicrotask(() => menu.syncControlledValue(external)); },
  });

  menu.setItemAttributes(disabled, 'beta');
  assert.equal(disabled.attributes.get('aria-disabled'), 'true');
  menu.handleEvent('open-popup');
  menu.syncControlledValue(true);
  menu.handleEvent('last');
  assert.equal(menu.getSnapshot().state.cursor.current, 'build');
  root.emit('keydown', { key: 'a', altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(menu.getSnapshot().state.cursor.current, 'alpha');
  now = 600;
  root.emit('keydown', { key: 'b', altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
  assert.equal(menu.getSnapshot().state.cursor.current, 'beta');
  menu.handleEvent('invoke');
  assert.equal(menu.getSnapshot().state.open, true);
});

test('DOM menu owns hidden submenu surfaces and collision-safe placement', async () => {
  const { window, root, trigger, file, child, submenu } = menuDOM(500, 300, {
    file: { left: 400, right: 480, top: 120, bottom: 160, width: 80, height: 40 },
    submenu: { left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 },
  });
  const menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }],
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'new');
  menu.setSubmenuAttributes(submenu, 'file');
  assert.equal(submenu.hidden, true);
  assert.equal(submenu.getAttribute('role'), 'menu');
  assert.equal(file.getAttribute('aria-controls'), submenu.id);

  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  await settlePosition(window);
  assert.equal(submenu.hidden, false);
  assert.equal(submenu.dataset.side, 'left');
  assert.equal(submenu.dataset.align, 'start');
  assert.equal(submenu.style.left, '252px');
  assert.equal(submenu.style.top, '120px');

  window.innerWidth = 800;
  window.dispatchEvent(new window.Event('resize'));
  await settlePosition(window);
  assert.equal(submenu.dataset.side, 'right');
  assert.equal(submenu.dataset.align, 'start');
  assert.equal(submenu.style.left, '488px');
});

test('DOM menu button positions its popup without occupying trigger layout', async () => {
  const { window, root, trigger } = menuDOM(500, 300, {
    root: { left: 0, right: 180, top: 0, bottom: 120, width: 180, height: 120 },
    trigger: { left: 100, right: 180, top: 60, bottom: 100, width: 80, height: 40 },
  });
  const menu = createMenuButton({
    root,
    trigger,
    items: [{ id: 'new', parentID: null }],
  });

  assert.equal(root.hidden, true);
  menu.handleEvent('open-popup');
  await settlePosition(window);

  assert.equal(root.hidden, false);
  assert.equal(root.dataset.side, 'bottom');
  assert.equal(root.dataset.align, 'center');
  assert.equal(root.style.position, 'absolute');
  assert.equal(root.style.left, '50px');
  assert.equal(root.style.top, '108px');
});

test('DOM menubar opens its top-level submenu below the horizontal item', async () => {
  const { window, root, file, child, submenu } = menuDOM(500, 300, {
    file: { left: 100, right: 180, top: 60, bottom: 100, width: 80, height: 40 },
    submenu: { left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 },
  });
  const menubar = createMenubar({
    root,
    items: [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }],
    defaultHighlightedValue: 'file',
  });

  menubar.setItemAttributes(file, 'file');
  menubar.setItemAttributes(child, 'new');
  menubar.setSubmenuAttributes(submenu, 'file');
  assert.equal(file.dataset.level, '0');
  assert.equal(child.dataset.level, '1');
  assert.equal(submenu.dataset.level, '1');
  menubar.handleEvent('open-submenu');
  await settlePosition(window);

  assert.equal(submenu.hidden, false);
  assert.equal(submenu.dataset.side, 'bottom');
  assert.equal(submenu.dataset.align, 'start');
  assert.equal(submenu.style.left, '100px');
  assert.equal(submenu.style.top, '108px');
});

test('DOM menus reverse horizontal navigation and submenu placement in RTL', async () => {
  const { window, root, file, child, submenu } = menuDOM(800, 300, {
    file: { left: 400, right: 480, top: 60, bottom: 100, width: 80, height: 40 },
    submenu: { left: 0, right: 140, top: 0, bottom: 120, width: 140, height: 120 },
  });
  const menu = createMenubar({
    root,
    direction: 'rtl',
    items: [{ id: 'file', parentID: null }, { id: 'edit', parentID: null }, { id: 'new', parentID: 'file' }],
    defaultHighlightedValue: 'edit',
  });
  file.style.direction = 'rtl';

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'new');
  menu.setSubmenuAttributes(submenu, 'file');
  root.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(menu.getSnapshot().state.cursor.current, 'file');
  menu.handleEvent('open-submenu');
  await settlePosition(window);
  assert.equal(submenu.dataset.align, 'end');
  assert.equal(submenu.style.left, '340px');
  assert.equal(root.getAttribute('dir'), 'rtl');
});

test('DOM navigation menu preserves native navigation roles and toggles panels', () => {
  const root = new FakeElement();
  const products = new FakeElement();
  const overview = new FakeElement();
  const panel = new FakeElement();
  const navigation = createNavigationMenu({
    root,
    items: [{ id: 'products', parentID: null }, { id: 'overview', parentID: 'products' }],
    defaultHighlightedValue: 'products',
    label: 'Primary',
  });

  navigation.setItemAttributes(products, 'products');
  navigation.setItemAttributes(overview, 'overview');
  navigation.setSubmenuAttributes(panel, 'products');
  assert.equal(root.attributes.get('role'), 'navigation');
  assert.equal(products.attributes.has('role'), false);
  assert.equal(panel.hidden, true);

  navigation.handleEvent('open-submenu');
  assert.equal(panel.hidden, false);
  assert.equal(panel.attributes.has('role'), false);
  navigation.handleEvent('escape');
  assert.equal(panel.hidden, true);
});

test('standalone menu roots preserve consumer-authored hidden state', () => {
  const root = new FakeElement();
  root.setAttribute('hidden', 'until-found');
  root.hidden = true;
  const menu = createMenu({ root, items: [{ id: 'file', parentID: null }] });

  assert.equal(root.getAttribute('hidden'), 'until-found');
  assert.equal(root.hidden, true);
  menu.disconnect();
  assert.equal(root.getAttribute('hidden'), 'until-found');
});

test('menu button restores its exact hidden baseline without overwriting a later consumer change', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  root.setAttribute('hidden', 'until-found');
  root.hidden = true;
  const menu = createMenuButton({ root, trigger, items: [{ id: 'file', parentID: null }] });

  assert.equal(root.getAttribute('hidden'), '');
  menu.handleEvent('open-popup');
  assert.equal(root.getAttribute('hidden'), null);
  menu.disconnect();
  assert.equal(root.getAttribute('hidden'), 'until-found');

  const consumerRoot = new FakeElement();
  const consumerMenu = createMenuButton({ root: consumerRoot, trigger: new FakeElement(), items: [{ id: 'file', parentID: null }] });
  assert.equal(consumerRoot.getAttribute('hidden'), '');
  consumerRoot.setAttribute('hidden', 'until-found');
  consumerRoot.hidden = true;
  consumerMenu.disconnect();
  assert.equal(consumerRoot.getAttribute('hidden'), 'until-found');
});

test('menu visibility management can be delegated to the renderer', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const file = new FakeElement();
  const child = new FakeElement();
  const submenu = new FakeElement();
  root.setAttribute('hidden', 'until-found'); root.hidden = true;
  submenu.setAttribute('hidden', 'until-found'); submenu.hidden = true;
  const menu = createMenuButton({
    root, trigger, manageVisibility: false,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'open');
  menu.setSubmenuAttributes(submenu, 'file');
  menu.handleEvent('open-popup');
  menu.handleEvent('open-submenu');
  assert.equal(root.getAttribute('hidden'), 'until-found');
  assert.equal(submenu.getAttribute('hidden'), 'until-found');
  menu.handleEvent('close-popup');
  menu.refresh();
  assert.equal(root.getAttribute('hidden'), 'until-found');
  assert.equal(submenu.getAttribute('hidden'), 'until-found');
  menu.disconnect();
});

test('renderer-owned menu visibility defers focus until the surface is visible', async () => {
  const { window, root, trigger, file, child, submenu } = menuDOM(500, 300);
  root.hidden = true;
  submenu.hidden = true;
  const menu = createMenuButton({
    root, trigger, manageVisibility: false, position: false,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
  });
  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'open');
  menu.setSubmenuAttributes(submenu, 'file');
  trigger.focus();

  menu.handleEvent('open-popup');
  assert.equal(document.activeElement, trigger);
  root.hidden = false;
  menu.refresh();
  assert.equal(document.activeElement, file);

  menu.handleEvent('open-submenu');
  assert.equal(document.activeElement, file);
  submenu.hidden = false;
  menu.refresh();
  assert.equal(document.activeElement, file);
  await settlePosition(window);
  assert.equal(document.activeElement, child);
  menu.disconnect();
});

test('controlled menu focus waits for owner acceptance and survives renderer refreshes', () => {
  const { root, trigger, file } = menuDOM(500, 300);
  const menu = createMenuButton({
    root, trigger, open: false, manageVisibility: false, position: false,
    items: [{ id: 'file', parentID: null }],
  });
  menu.setItemAttributes(file, 'file');
  trigger.focus();
  assert.equal(menu.send('open-popup'), true);
  menu.refresh();
  assert.equal(menu.state.open, false);
  assert.equal(menu.state.cursor.current, null);
  assert.equal(document.activeElement, trigger);

  root.inert = true;
  assert.equal(menu.syncControlledValue(true).ok, true);
  assert.equal(menu.state.cursor.current, 'file');
  assert.equal(document.activeElement, trigger);
  root.inert = false;
  menu.refresh();
  assert.equal(document.activeElement, file);
  assert.equal(file.tabIndex, 0);
  menu.destroy();
});

test('controlled menu rejection clears the pending host focus request', () => {
  const { root, trigger, file } = menuDOM(500, 300);
  const menu = createMenuButton({
    root, trigger, open: false, position: false,
    items: [{ id: 'file', parentID: null }],
  });
  menu.setItemAttributes(file, 'file');
  trigger.focus();
  menu.send('open-popup');
  menu.syncControlledValue(false);
  menu.syncControlledValue(true);
  menu.refresh();
  assert.equal(menu.state.cursor.current, null);
  assert.equal(document.activeElement, trigger);
  menu.destroy();
});

test('positioned menu disposal cancels a pending focus handoff', async () => {
  const { window, root, trigger, file } = menuDOM(500, 300);
  const menu = createMenuButton({ root, trigger, items: [{ id: 'file', parentID: null }] });
  menu.setItemAttributes(file, 'file');
  trigger.focus();
  menu.send('open-popup');
  assert.equal(document.activeElement, trigger);
  menu.destroy();
  await settlePosition(window);
  assert.equal(document.activeElement, trigger);
});

test('menu unregister restores submenu visibility and generated ID ownership', () => {
  const root = new FakeElement();
  const trigger = new FakeElement();
  const file = new FakeElement();
  const child = new FakeElement();
  const submenu = new FakeElement();
  submenu.setAttribute('hidden', 'until-found');
  submenu.hidden = true;
  const menu = createMenuButton({
    root, trigger,
    items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
  });

  menu.setItemAttributes(file, 'file');
  menu.setItemAttributes(child, 'open');
  menu.setSubmenuAttributes(submenu, 'file');
  const generated = submenu.id;
  assert.notEqual(generated, '');
  assert.equal(file.getAttribute('aria-controls'), generated);
  assert.equal(submenu.getAttribute('hidden'), '');

  menu.setSubmenuAttributes(undefined, 'file');
  assert.equal(file.getAttribute('aria-controls'), null);
  assert.equal(submenu.getAttribute('hidden'), 'until-found');
  assert.equal(submenu.id, '');
  menu.setItemAttributes(undefined, 'file');
  menu.disconnect();
});

class FakeView {
  listeners = new Map();
  constructor(innerWidth, innerHeight) { this.innerWidth = innerWidth; this.innerHeight = innerHeight; }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type) { for (const listener of this.listeners.get(type) ?? []) listener(); }
}

function menuDOM(width, height, rects = {}) {
  const window = new Window({ url: 'https://sectile.dev/' });
  window.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  window.cancelAnimationFrame = (handle) => clearTimeout(handle);
  window.innerWidth = width;
  window.innerHeight = height;
  Object.defineProperties(window.document.documentElement, {
    clientWidth: { configurable: true, get: () => window.innerWidth },
    clientHeight: { configurable: true, get: () => window.innerHeight },
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    ResizeObserver: window.ResizeObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
  });
  const make = (name) => {
    const element = window.document.createElement(name === 'trigger' || name === 'file' || name === 'child' ? 'button' : 'div');
    const rect = rects[name] ?? { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    element.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, toJSON() {} });
    Object.defineProperties(element, {
      offsetWidth: { configurable: true, value: rect.width },
      offsetHeight: { configurable: true, value: rect.height },
    });
    return element;
  };
  const root = make('root'); const trigger = make('trigger'); const file = make('file'); const child = make('child'); const submenu = make('submenu');
  file.append(child, submenu);
  root.append(file);
  window.document.body.append(trigger, root);
  return { window, root, trigger, file, child, submenu };
}

async function settlePosition(window) {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  hidden = false;
  id = '';
  listeners = new Map();
  style = {};
  tabIndex = -1;
  constructor(rect = undefined, view = null) {
    this.rect = rect ?? { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    this.ownerDocument = view === null ? undefined : { defaultView: view };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  contains(target) { return target === this; }
  focus() {}
  getBoundingClientRect() { return this.rect; }
}

class CountingElement extends FakeElement {
  projectionWrites = 0;
  setAttribute(name, value) { this.projectionWrites += 1; super.setAttribute(name, value); }
  removeAttribute(name) { this.projectionWrites += 1; super.removeAttribute(name); }
}
