import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';
const browserWindow = createTestWindow({ url: 'http://localhost/' });
for (const name of ['window', 'document']) globalThis[name] = name === 'window' ? browserWindow : browserWindow.document;
for (const name of ['Node','Element','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLFormElement','HTMLButtonElement','SVGElement','Event','MouseEvent','KeyboardEvent','MutationObserver','FormData']) globalThis[name] = browserWindow[name];
const { createApp, createSSRApp, h, nextTick, shallowRef, KeepAlive } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { TreeSelectRoot: Root, TreeSelectInput: Input, TreeSelectContent: Content, TreeSelectItem: Item, TreeSelectGroup: Group, TreeSelectDisclosure: Disclosure } = await import('../.verification-dist/tree-select.js');
const { HostProvider } = await import('../.verification-dist/host-provider.js');
const { FormRoot, FormField, FormLabel } = await import('../.verification-dist/form.js');
const nodes = [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }];
const rows = () => [h(Item, { value: 'root' }, () => [h(Disclosure, { for: 'root', as: 'button' }, () => 'Expand'), 'Root']),
  h(Group, { for: 'root' }, () => [h(Item, { value: 'a' }, () => 'A'), h(Item, { value: 'b' }, () => 'B')])];
const parts = () => [h(Input), h(Content, null, { default: rows })];
const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
const row = (host, id) => host.querySelector(`[data-sectile-tree-select-item="${id}"]`);
const click = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
function mount(render) { const host = document.createElement('div'); document.body.append(host); const app = createApp({ render }); app.mount(host); return { host, app, close() { app.unmount(); host.remove(); } }; }

test('TreeSelect SSR projects initial hierarchy and selected form IDs without running search transport', async () => {
  let searched = 0;
  const html = await renderToString(createSSRApp({ render: () => h(Root, { nodes, defaultValue: ['a'], defaultQuery: 'delivery', matches: ['a'],
    defaultExpandedValues: ['root'], defaultHighlightedValue: 'a', defaultOpen: true, name: 'delivery', label: 'Deliveries', onSearch() { searched++; } }, { default: parts }) }));
  const template = document.createElement('template'); template.innerHTML = html;
  const input = template.content.querySelector('input'), popup = template.content.querySelector('[data-part="content"]'), select = template.content.querySelector('select');
  assert.equal(input.getAttribute('role'), 'combobox'); assert.equal(input.getAttribute('aria-haspopup'), 'tree'); assert.equal(input.getAttribute('name'), null);
  assert.equal(input.getAttribute('aria-controls'), popup.id); assert.equal(popup.getAttribute('role'), 'tree');
  assert.equal(input.getAttribute('aria-activedescendant'), template.content.querySelector('[data-sectile-tree-select-item="a"]').id);
  assert.equal(template.content.querySelector('[data-sectile-tree-select-item="a"]').getAttribute('aria-selected'), 'true');
  assert.equal(select.name, 'delivery'); assert.equal(select.querySelector('option[value="a"]').hasAttribute('selected'), true); assert.equal(searched, 0);
});
test('TreeSelect keeps controlled selection proposals separate from accepted rows and native submission', async () => {
  const value = shallowRef(['a']), proposed = [];
  const mounted = mount(() => h('form', null, [h(Root, { nodes, modelValue: value.value, selectionMode: 'multiple', name: 'delivery', position: false,
    defaultExpandedValues: ['root'], defaultOpen: true, 'onUpdate:modelValue': next => proposed.push(next) }, { default: parts })]));
  try {
    await drain(); click(row(mounted.host, 'b')); await drain(); assert.deepEqual(proposed, [['a','b']]);
    assert.equal(row(mounted.host, 'b').getAttribute('aria-selected'), 'false'); assert.deepEqual(new FormData(mounted.host.querySelector('form')).getAll('delivery'), ['a']);
    value.value = proposed[0]; await drain(); assert.equal(row(mounted.host, 'b').getAttribute('aria-selected'), 'true');
    assert.deepEqual([...mounted.host.querySelector('select').selectedOptions].map(option => option.value), ['a','b']);
    assert.equal(mounted.host.querySelectorAll('[name="delivery"]').length, 1);
  } finally { mounted.close(); }
});
test('TreeSelect controlled queries only search on acceptance and stale response props cannot block later control updates', async () => {
  const query = shallowRef(''), response = shallowRef(), searches = [], proposals = [], root = shallowRef();
  let state;
  const mounted = mount(() => h(Root, { ref: root, nodes, query: query.value, results: response.value, position: false, defaultOpen: true,
    defaultValue: ['a'], defaultExpandedValues: ['root'], 'onUpdate:query': next => proposals.push(next), onSearch: request => searches.push(request) }, { default: current => { state = current; return parts(); } }));
  try {
    await drain(); const input = mounted.host.querySelector('input'); input.focus(); input.value = 'delivery'; input.dispatchEvent(new Event('input', { bubbles: true })); await drain();
    assert.deepEqual(proposals, ['delivery']); assert.equal(searches.length, 0); assert.equal(input.value, '');
    query.value = 'delivery'; await drain(); assert.equal(searches.length, 1);
    response.value = { request: searches[0], results: ['b'] }; await drain(); assert.equal(row(mounted.host, 'a').hidden, true); assert.equal(row(mounted.host, 'b').hidden, false);
    assert.deepEqual(state.getChildren(null), ['root']); assert.deepEqual(state.getChildren('root'), ['b']); assert.equal(state.isBranch('root'), true);
    query.value = 'next'; await drain(); assert.equal(searches.length, 2); assert.equal(input.value, 'next');
    assert.equal(root.value.resolveSearch(searches[0], ['a']), false); assert.equal(root.value.resolveSearch(searches[1], ['b']), true); await drain();
    assert.equal(row(mounted.host, 'a').getAttribute('aria-selected'), 'true', 'filtering never discards selected IDs');
    assert.equal(document.activeElement, input, 'async results never focus a popup row');
  } finally { mounted.close(); }
});
test('TreeSelect settles native controlled query proposals with only the final accepted correction', async () => {
  for (const accept of ['accept','refuse','transform']) {
    const query=shallowRef(''), proposals=[];
    const mounted=mount(()=>h(Root,{nodes,query:query.value,position:false,'onUpdate:query':next=>{
      proposals.push(next); if(accept!=='refuse') query.value=accept==='transform'?next.toUpperCase():next;
    }},{default:parts}));
    try {
      await drain(); const input=mounted.host.querySelector('input'), writes=[];
      const property=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
      Object.defineProperty(input,'value',{get(){return property.get.call(this);},set(value){writes.push(value);property.set.call(this,value);}});
      input.value='abc';writes.length=0;input.dispatchEvent(new Event('input',{bubbles:true}));
      assert.deepEqual(writes,[]);await drain();
      assert.deepEqual(proposals,['abc']);assert.deepEqual(writes,accept==='accept'?[]:[accept==='refuse'?'':'ABC']);
      assert.equal(input.value,query.value);
    } finally {mounted.close();}
  }
});

test('TreeSelect keeps a live IME composition through unrelated Vue updates and emits one committed query', async () => {
  const title = shallowRef('first'), searches = [];
  const mounted = mount(() => h(Root, { nodes, title: title.value, position: false, onSearch: request => searches.push(request) }, { default: parts }));
  try {
    await drain(); const input = mounted.host.querySelector('input'); input.dispatchEvent(new Event('compositionstart', { bubbles: true })); input.value = '가';
    input.dispatchEvent(new Event('input', { bubbles: true })); title.value = 'second'; await drain(); assert.equal(input.value, '가'); assert.equal(searches.length, 0);
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); input.dispatchEvent(new Event('input', { bubbles: true })); await drain();
    assert.equal(searches.length, 1); assert.equal(searches[0].query, '가');
  } finally { mounted.close(); }
});
test('TreeSelect defers source replacement until native composition commits on the same input', async () => {
  const domain=shallowRef(nodes), query=shallowRef(''), proposals=[];
  const mounted=mount(()=>h(Root,{nodes:domain.value,query:query.value,position:false,'onUpdate:query':next=>{proposals.push(next);query.value=next;}},{default:parts}));
  const errors=[];mounted.app.config.errorHandler=error=>errors.push(error);
  try {
    await drain();const input=mounted.host.querySelector('input'),writes=[];
    const property=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
    Object.defineProperty(input,'value',{get(){return property.get.call(this);},set(value){writes.push(value);property.set.call(this,value);}});
    input.focus();input.dispatchEvent(new Event('compositionstart',{bubbles:true}));input.value='한글';writes.length=0;
    input.dispatchEvent(new Event('input',{bubbles:true}));domain.value=[...nodes,{id:'extra',parentID:null}];await drain();
    assert.equal(mounted.host.querySelector('input'),input);assert.equal(input.value,'한글');assert.deepEqual(writes,[]);assert.deepEqual(proposals,[]);
    input.dispatchEvent(new Event('compositionend',{bubbles:true}));input.dispatchEvent(new Event('input',{bubbles:true}));
    await drain();await new Promise(resolve=>setTimeout(resolve,0));await drain();
    assert.equal(mounted.host.querySelector('input'),input);assert.equal(document.activeElement,input);assert.equal(query.value,'한글');assert.deepEqual(proposals,['한글']);assert.deepEqual(writes,[]);
    input.dispatchEvent(new Event('compositionstart',{bubbles:true}));input.value='한글다';writes.length=0;
    input.dispatchEvent(new Event('input',{bubbles:true}));domain.value=[{id:'orphan',parentID:'missing'}];await drain();assert.deepEqual(errors,[]);
    input.dispatchEvent(new Event('compositionend',{bubbles:true}));await drain();await new Promise(resolve=>setTimeout(resolve,0));await drain();
    assert.equal(errors.length,1);assert.equal(input.value,'한글다');assert.equal(query.value,'한글다');assert.deepEqual(writes,[]);
    domain.value=nodes;await drain();assert.equal(mounted.host.querySelector('input'),input);assert.equal(input.value,'한글다');
    input.dispatchEvent(new Event('compositionstart',{bubbles:true}));domain.value=[...nodes];await drain();
    const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,timers=new Set();
    globalThis.setTimeout=(...args)=>{const timer=originalSet(...args);timers.add(timer);return timer;};
    globalThis.clearTimeout=timer=>{timers.delete(timer);originalClear(timer);};
    try {
      input.dispatchEvent(new Event('compositionend',{bubbles:true}));assert.equal(timers.size,1);
      mounted.app.unmount();assert.equal(timers.size,0);await Promise.resolve();assert.deepEqual(writes,[]);
    } finally {globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
  } finally {if(mounted.host.hasChildNodes())mounted.app.unmount();mounted.host.remove();}
});
test('TreeSelect source replacement invalidates old requests without rebuilding on query results or Host suspension', async () => {
  const domain = shallowRef(nodes), active = shallowRef(true), contentKey = shallowRef(0), root = shallowRef(), requests = [];
  const mounted = mount(() => h(HostProvider, { active: active.value }, () => h(Root, { ref: root, nodes: domain.value, defaultQuery: 'delivery', position: false,
    onSearch: request => requests.push(request) }, { default: () => [h(Input), h(Content, { key: contentKey.value }, { default: () => domain.value.map(node => h(Item, { value: node.id, key: node.id }, () => node.id)) })] })));
  try {
    await drain(); assert.equal(requests.length, 1); assert.equal(root.value.resolveSearch(requests[0], ['a']), true); await drain();
    active.value = false; await drain(); active.value = true; await drain(); contentKey.value++; await drain(); assert.equal(requests.length, 1);
    domain.value = [{ id: 'other', parentID: null }]; await drain(); assert.equal(requests.length, 2);
    assert.equal(root.value.resolveSearch(requests[0], ['a']), false); assert.equal(root.value.resolveSearch(requests[1], ['other']), true);
  } finally { mounted.close(); }
});
test('controlled expansion repairs an uncontrolled descendant highlight without host-side cursor rules', async () => {
  const expansion = shallowRef(['root']); let state;
  const mounted = mount(() => h(Root, { nodes, expandedValues: expansion.value, defaultHighlightedValue: 'a', defaultOpen: true, position: false }, {
    default: current => { state = current; return parts(); },
  }));
  try { await drain(); expansion.value = []; await drain(); assert.equal(state.highlightedValue, 'root'); assert.equal(row(mounted.host, 'root').getAttribute('aria-expanded'), 'false'); }
  finally { mounted.close(); }
});
test('TreeSelect KeepAlive and Host release Native work without restarting its accepted request', async () => {
  const active = shallowRef(true), visible = shallowRef(true), requests = [];
  const listeners = new Map(), add = HTMLElement.prototype.addEventListener, remove = HTMLElement.prototype.removeEventListener;
  HTMLElement.prototype.addEventListener = function(type, listener, ...rest) {
    if (this.dataset.scope === 'tree-select' && ['input','content'].includes(this.dataset.part) && ['keydown','input','compositionstart','compositionend','click','pointerdown'].includes(type)) {
      const owned = listeners.get(this) ?? new Set(); owned.add(listener); listeners.set(this, owned);
    }
    return add.call(this, type, listener, ...rest);
  };
  HTMLElement.prototype.removeEventListener = function(type, listener, ...rest) { listeners.get(this)?.delete(listener); return remove.call(this, type, listener, ...rest); };
  const count = () => [...listeners.values()].reduce((sum, owned) => sum + owned.size, 0);
  let mounted;
  try {
    mounted = mount(() => h(HostProvider, { active: active.value }, () => h(KeepAlive, null, { default: () => visible.value ? h(Root, { nodes, defaultQuery: 'delivery', position: false,
      onSearch: request => requests.push(request) }, { default: parts }) : null })));
    await drain(); assert.equal(count(), 7); assert.equal(requests.length, 1);
    active.value = false; await drain(); assert.equal(count(), 0);
    active.value = true; await drain(); assert.equal(count(), 7); assert.equal(requests.length, 1);
    visible.value = false; await drain(); assert.equal(count(), 0);
    visible.value = true; await drain(); assert.equal(count(), 7); assert.equal(requests.length, 1);
    mounted.close(); mounted = undefined; assert.equal(count(), 0);
  } finally { mounted?.close(); HTMLElement.prototype.addEventListener = add; HTMLElement.prototype.removeEventListener = remove; }
});
test('TreeSelect participates once in Form labels, selected ID submission, defaults and reset', async () => {
  let state;
  const mounted = mount(() => h(FormRoot, null, { default: () => h(FormField, { name: 'delivery', required: true }, { default: () => [h(FormLabel, null, () => 'Delivery'),
    h(Root, { nodes, selectionMode: 'multiple', defaultValue: ['a'], defaultOpen: true, defaultExpandedValues: ['root'], position: false }, {
      default: current => { state = current; return parts(); },
    })] }) }));
  try {
    await drain(); const form = mounted.host.querySelector('form'), input = mounted.host.querySelector('input'), select = mounted.host.querySelector('select');
    assert.equal(mounted.host.querySelector('label').htmlFor, input.id); assert.equal(select.name, 'delivery'); assert.equal(select.required, true);
    assert.deepEqual(new FormData(form).getAll('delivery'), ['a']);
    click(row(mounted.host, 'b')); await drain(); assert.deepEqual(state.value, ['a','b']); assert.deepEqual([...select.selectedOptions].map(option => option.value), ['a','b']);
    form.reset(); await drain(); assert.deepEqual(state.value, ['a']); assert.deepEqual(new FormData(form).getAll('delivery'), ['a']);
    assert.equal(input.name, ''); assert.equal(mounted.host.querySelectorAll('[name="delivery"]').length, 1);
  } finally { mounted.close(); }
});
