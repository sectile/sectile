import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createDataTransferFormat, tryCreateDataTransferFormat, connectDragSource, connectDropTarget } from '@sectile/dom/drag-drop';

const options = overrides => ({ type: 'application/vnd.sectile.parcel+json', maxBytes: 32,
  encode: value => value, decode: value => ({ ok: true, value }), ...overrides });
const code = (result, expected) => { assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.data-transfer-' + expected); };
const payload = data => ({ type: 'application/vnd.sectile.parcel+json', data });

test('External format canonicalizes one concrete MIME and preserves opaque decoded values', () => {
  const value = Object.freeze({ parcel: 1 }), type = 'APPLICATION/VND.SECTILE.PARCEL+JSON';
  const format = createDataTransferFormat(options({ type, encode: item => { assert.equal(item, value); return 'parcel'; },
    decode: text => { assert.equal(text, 'parcel'); return { ok: true, value }; } }));
  assert.equal(format.type, type.toLowerCase()); assert.equal(format.maxBytes, 32);
  const outbound = format.write(value); assert.equal(outbound.ok, true);
  assert.deepEqual(outbound.value, payload('parcel')); assert.equal(Object.isFrozen(outbound.value), true);
  assert.equal(Object.isFrozen(format), true); assert.equal(format.read({ type, data: 'parcel' }).value, value);
});

test('External format requires an explicit byte ceiling and concrete restricted MIME names', () => {
  for (const type of ['', 'Text', 'URL', 'text/*', '*/plain', 'text/plain; charset=utf-8', ' text/plain', 'text/plain ',
    'text/pläin', '-text/plain', 'text/_plain', 'a'.repeat(128) + '/plain', 'text/' + 'a'.repeat(128)])
    code(tryCreateDataTransferFormat(options({ type })), 'format-invalid');
  for (const maxBytes of [undefined, -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '32'])
    code(tryCreateDataTransferFormat(options({ maxBytes })), 'format-invalid');
  for (const input of [null, undefined, [], {}, options({ encode: null }), options({ decode: null })])
    code(tryCreateDataTransferFormat(input), 'format-invalid');
  assert.equal(createDataTransferFormat(options({ type: 'a'.repeat(127) + '/' + 'b'.repeat(127) })).type.length, 255);
  assert.throws(() => createDataTransferFormat(options({ maxBytes: -1 })), { code: 'dom.data-transfer-format-invalid' });
});

test('Foreign descriptors are read in admission order without invoking option or payload accessors', () => {
  let calls = 0, descriptors = 0;
  const format = createDataTransferFormat(options({ decode: data => { calls++; return { ok: true, value: data }; } }));
  const foreign = new Proxy({ type: 'text/html', data: 'private' }, { getOwnPropertyDescriptor(target, key) {
    if (key === 'data') { descriptors++; throw Error('must not inspect rejected data'); }
    return Reflect.getOwnPropertyDescriptor(target, key);
  } });
  code(format.read(foreign), 'type-rejected'); assert.equal(descriptors, 0);
  const getter = () => { calls++; throw Error('getter invoked'); };
  const accessor = payload(''); Object.defineProperty(accessor, 'data', { get: getter });
  code(format.read(accessor), 'payload-invalid');
  const config = options(); Object.defineProperty(config, 'type', { get: getter });
  code(tryCreateDataTransferFormat(config), 'format-invalid');
  for (const invalid of [null, [], 'text', {}, Object.create(payload('inherited')), payload(1)])
    assert.equal(format.read(invalid).ok, false);
  assert.equal(calls, 0);
});

test('UTF-8 byte ceilings admit exact multibyte boundaries and reject before application decoding', () => {
  // Independently specified UTF-8 lengths: ASCII=1, é=2, 한=3, supplementary scalar=4.
  for (const [text, bytes] of [['a', 1], ['é', 2], ['한', 3], ['😀', 4], ['\uFEFF', 3], ['a\0', 2]]) {
    let decoded = 0;
    const exact = createDataTransferFormat(options({ maxBytes: bytes, decode: value => { decoded++; return { ok: true, value }; } }));
    assert.equal(exact.read(payload(text)).value, text); assert.equal(exact.write(text).value.data, text); assert.equal(decoded, 1);
    const small = createDataTransferFormat(options({ maxBytes: bytes - 1, decode: value => { decoded++; return { ok: true, value }; } }));
    code(small.read(payload(text)), 'size-exceeded'); code(small.write(text), 'size-exceeded'); assert.equal(decoded, 1);
  }
  const empty = createDataTransferFormat(options({ maxBytes: 0 }));
  assert.equal(empty.read(payload('')).value, ''); assert.equal(empty.write('').value.data, '');
  code(empty.read(payload('a')), 'size-exceeded');
});

test('Malformed UTF-16 and oversized native strings never reach the decoder', () => {
  let decoded = 0;
  const format = createDataTransferFormat(options({ decode: value => { decoded++; return { ok: true, value }; } }));
  for (const text of ['\ud800', '\udc00', 'a\ud800b']) {
    code(format.read(payload(text)), 'payload-invalid'); code(format.write(text), 'payload-invalid');
  }
  code(format.read(payload('x'.repeat(100_000))), 'size-exceeded'); assert.equal(decoded, 0);
});

test('Codec rejection and failures expose no foreign cause, private payload or application error graph', () => {
  const secret = { message: 'private application value', retained: new Uint8Array(1000) };
  const rejected = createDataTransferFormat(options({ decode: () => ({ ok: false, error: secret }) }));
  const result = rejected.read(payload('private')); code(result, 'decode-rejected');
  assert.equal(JSON.stringify(result).includes('private'), false); assert.equal('cause' in result.error, false);
  for (const decode of [() => { throw secret; }, () => undefined, () => ({}), () => ({ ok: true }), () => ({ ok: 1, value: 'x' })])
    code(createDataTransferFormat(options({ decode })).read(payload('private')), 'codec-failed');
  for (const encode of [() => { throw secret; }, () => 1, () => ({})])
    code(createDataTransferFormat(options({ encode })).write('private'), 'codec-failed');
});

test('Synchronous codec calls have no receiver and ignore unrelated construction properties', () => {
  const config = options({ encode: function(value) { assert.equal(this, undefined); return value; },
    decode: function(value) { assert.equal(this, undefined); return { ok: true, value }; } });
  Object.defineProperty(config, 'unrelated', { get() { throw Error('not part of format'); } });
  const format = createDataTransferFormat(config);
  config.type = 'text/html'; config.maxBytes = 0; config.encode = () => { throw Error('changed'); };
  assert.equal(format.read(payload('a')).value, 'a'); assert.equal(format.write('a').value.data, 'a');
});

test('Misused asynchronous codecs fail immediately without unhandled rejection', async () => {
  const format = createDataTransferFormat(options({ encode: async () => { throw Error('encode failed'); },
    decode: async () => { throw Error('decode failed'); } }));
  code(format.write('a'), 'codec-failed'); code(format.read(payload('a')), 'codec-failed');
  await new Promise(resolve => setImmediate(resolve));
});

test('Missing native UTF-8 capability rejects without running a decoder', () => {
  const original = globalThis.TextEncoder; let decoded = 0;
  const format = createDataTransferFormat(options({ decode: value => { decoded++; return { ok: true, value }; } }));
  try { globalThis.TextEncoder = undefined; code(format.read(payload('a')), 'unavailable'); code(format.write('a'), 'unavailable'); }
  finally { globalThis.TextEncoder = original; }
  assert.equal(decoded, 0);
});

// Native store-mode and event contracts, not physical browser drag/clipboard approval.
function track(target) {
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target), listeners = new Map(), saved = [];
  target.addEventListener = (type, handler, options) => {
    let handlers = listeners.get(type); if (!handlers) listeners.set(type, handlers = new Set());
    handlers.add(handler); saved.push([type, handler]); add(type, handler, options);
    if (target.failListener === type) throw Error('Partial native listener install');
  };
  target.removeEventListener = (type, handler, options) => { listeners.get(type)?.delete(handler); remove(type, handler, options); };
  return { saved, count: () => [...listeners.values()].reduce((count, handlers) => count + handlers.size, 0) };
}
function host() {
  const window = new Window(), document = window.document, element = document.createElement('div'); document.body.append(element);
  const counts = [track(element), track(document), track(window)];
  const count = () => counts.reduce((total, entry) => total + entry.count(), 0);
  return { window, document, element, counts, count };
}
function store(data = 'a', extra = {}) {
  const values = new Map([[options().type, data]]);
  return { effectAllowed: 'copyMove', dropEffect: 'copy', mode: 'readonly', reads: 0, writes: 0,
    get types() { return [...values.keys()]; },
    getData(type) { this.reads++; if (this.mode === 'protected') throw Error('Protected store data accessed'); return values.get(type) ?? ''; },
    setData(type, data) { assert.equal(this.mode, 'readwrite'); this.writes++; values.set(type, data); },
    clearData(type) { values.delete(type); }, ...extra };
}
function emit(host, type, data, target = host.element, extra = {}) {
  const event = new host.window.Event(type, { bubbles: true, cancelable: type !== 'dragend' });
  Object.assign(event, { [type === 'copy' || type === 'paste' ? 'clipboardData' : 'dataTransfer']: data, ...extra });
  target.dispatchEvent(event); return event;
}
function targetFixture(overrides = {}, input = host()) {
  const requests = [], commits = [], rejects = [], states = [];
  const result = connectDropTarget({ element: input.element, format: createDataTransferFormat(options()), operations: ['copy', 'move'], maxTypes: 8,
    onDrop: request => { requests.push(request); request.accept(value => { commits.push(value); return { ok: true, value: undefined }; }); },
    onReject: error => rejects.push(error.code), onChange: state => states.push(state), ...overrides });
  assert.equal(result.ok, true, result.error?.message);
  return { ...input, owner: result.value, requests, commits, rejects, states };
}

test('Native drop metadata negotiation never reads protected data or calls the provider', () => {
  const current = targetFixture(), data = store('parcel', { mode: 'protected' });
  assert.equal(current.count(), 8);
  assert.equal(emit(current, 'dragenter', data).defaultPrevented, true);
  const state = current.owner.getSnapshot(); assert.deepEqual(state, { connected: true, active: true, operation: 'copy' });
  assert.equal(emit(current, 'dragover', data).defaultPrevented, true); assert.equal(current.owner.getSnapshot(), state);
  assert.equal(data.reads, 0); assert.deepEqual(current.requests, []); assert.equal(current.states.length, 1);
  const foreign = store('html', { mode: 'protected', types: ['text/html'] });
  assert.equal(emit(current, 'dragover', foreign).defaultPrevented, false); assert.equal(current.owner.getSnapshot().active, false);
  current.owner.disconnect(); current.owner.disconnect(); assert.equal(current.count(), 0);
});

test('Native drop stages one commit until synchronous admission finishes and revokes saved requests', () => {
  let staged = false, committed = 0, saved;
  const current = targetFixture({ onDrop: request => {
    saved = request; assert.equal(Object.isFrozen(request), true); assert.equal('apply' in request, false);
    assert.deepEqual(request.getValue(), { ok: true, value: 'parcel' }); assert.equal(request.operation, 'move');
    assert.equal(request.accept(value => { assert.equal(staged, true); assert.equal(value, 'parcel'); committed++; return { ok: true, value: undefined }; }), true);
    assert.equal(request.accept(() => { throw Error('duplicate'); }), false); assert.equal(committed, 0); staged = true;
  } });
  const data = store('parcel', { dropEffect: 'move' });
  assert.equal(emit(current, 'drop', data).defaultPrevented, true); assert.equal(data.dropEffect, 'move'); assert.equal(committed, 1);
  assert.equal(saved.signal.aborted, true); assert.equal(saved.signal.reason, 'completed'); code(saved.getValue(), 'inactive');
  assert.equal(saved.accept(() => { throw Error('retired'); }), false); saved.reject();
  current.owner.disconnect(); assert.equal(current.count(), 0);
});

test('Native source and target operations negotiate only their explicit copy/move intersection', () => {
  for (const [sourceEffects, targetOperations, preferred, expected] of [
    ['copyMove', ['copy', 'move'], 'move', 'move'], ['copy', ['move', 'copy'], 'move', 'copy'],
    ['linkMove', ['copy', 'move'], 'copy', 'move'], ['all', ['move'], 'copy', 'move'],
    ['uninitialized', ['copy'], 'none', 'copy'], ['none', ['copy'], 'copy', 'none'], ['link', ['copy', 'move'], 'link', 'none'],
  ]) {
    const current = targetFixture({ operations: targetOperations }), data = store('a', { effectAllowed: sourceEffects, dropEffect: preferred });
    emit(current, 'drop', data); assert.equal(data.dropEffect, expected); assert.equal(current.commits.length, expected === 'none' ? 0 : 1);
    if (expected === 'none') assert.equal(data.reads, 0);
    current.owner.disconnect(); assert.equal(current.count(), 0);
  }
});

test('External files, oversized metadata, MIME and byte rejection never reach a drop provider', () => {
  const current = targetFixture();
  const foreign = store('html', { types: ['text/html'], dropEffect: 'move' });
  assert.equal(emit(current, 'drop', foreign).defaultPrevented, false); assert.equal(foreign.dropEffect, 'move'); assert.equal(foreign.reads, 0);
  for (const data of [store('a', { types: ['Files', options().type] }), store('a', { types: Array(9).fill(options().type) }),
    store('a', { types: ['text/html'] }), store('a'.repeat(33)), store('\ud800')]) emit(current, 'drop', data);
  assert.deepEqual(current.requests, []); assert.deepEqual(current.commits, []);
  assert.ok(current.rejects.includes('dom.data-transfer-size-exceeded')); assert.ok(current.rejects.includes('dom.data-transfer-payload-invalid'));
  current.owner.disconnect(); assert.equal(current.count(), 0);
});

test('Cancel, disconnect, rejection, throw and async staging misuse execute no ownership commit', async () => {
  for (const action of ['cancel', 'disconnect', 'reject', 'throw', 'async']) {
    let current, saved, commits = 0;
    current = targetFixture({ onDrop: request => {
      saved = request; request.accept(() => { commits++; return { ok: true, value: undefined }; });
      if (action === 'cancel') current.owner.cancel();
      if (action === 'disconnect') current.owner.disconnect();
      if (action === 'reject') request.reject();
      if (action === 'throw') throw Error('private staging failure');
      if (action === 'async') return Promise.reject(Error('private async failure'));
    } });
    const data = store(); emit(current, 'drop', data); assert.equal(data.dropEffect, 'none'); assert.equal(commits, 0);
    assert.equal(saved.signal.aborted, true); assert.equal(saved.accept(() => ({ ok: true, value: undefined })), false);
    code(saved.getValue(), 'inactive'); current.owner.disconnect(); assert.equal(current.count(), 0);
  }
  await new Promise(resolve => setImmediate(resolve));
});

test('Unavailable native acknowledgement and reentrant native cancellation cannot enter a staged commit', () => {
  for (const fail of ['ignore', 'throw', 'cancel']) {
    const current = targetFixture(), data = store(); let effect = 'copy';
    Object.defineProperty(data, 'dropEffect', { get: () => effect, set: value => {
      if (value === 'none') { effect = value; return; }
      if (fail === 'throw') throw Error('Native acknowledgement denied');
      if (fail === 'cancel') { effect = value; current.owner.cancel(); }
    } });
    emit(current, 'drop', data); assert.deepEqual(current.commits, []); assert.equal(data.dropEffect, 'none');
    current.owner.disconnect(); assert.equal(current.count(), 0);
  }
});

test('Atomic commit failure has no success acknowledgement and cannot be replayed', async () => {
  for (const commit of [() => ({ ok: false, error: { code: 'app.rejected', message: 'private' } }),
    () => { throw Error('private'); }, () => undefined, async () => { throw Error('private'); }]) {
    let saved;
    const current = targetFixture({ onDrop: request => { saved = request; request.accept(commit); } }), data = store();
    emit(current, 'drop', data); assert.equal(data.dropEffect, 'none'); assert.equal(saved.signal.aborted, true);
    assert.equal(current.rejects.at(-1), 'dom.data-transfer-commit-failed'); assert.equal(saved.accept(commit), false);
    current.owner.disconnect(); assert.equal(current.count(), 0);
  }
  await new Promise(resolve => setImmediate(resolve));
});

test('Copy/paste is a native copy equivalent, and text controls, selection and consumed child targets keep their behavior', () => {
  const current = targetFixture(), input = current.document.createElement('input'); current.element.append(input);
  const clipboard = store('copied'); emit(current, 'paste', clipboard, input); assert.equal(clipboard.reads, 0);
  const editable = current.document.createElement('div'), protectedText = current.document.createElement('p');
  editable.setAttribute('contenteditable', 'true'); editable.append(protectedText); current.element.append(editable);
  emit(current, 'paste', clipboard, protectedText); assert.equal(clipboard.reads, 0);
  const consumed = event => event.preventDefault(); current.element.addEventListener('drop', consumed, { capture: true });
  emit(current, 'drop', clipboard); assert.equal(clipboard.reads, 0); current.element.removeEventListener('drop', consumed, { capture: true });
  assert.equal(emit(current, 'paste', clipboard).defaultPrevented, true); assert.deepEqual(current.commits, ['copied']); assert.equal(current.requests[0].source, 'paste');
  const paragraph = current.document.createElement('p'); current.element.append(paragraph);
  assert.equal(emit(current, 'paste', clipboard, paragraph).defaultPrevented, true);
  assert.deepEqual(current.commits, ['copied', 'copied']); assert.equal(current.requests[1].source, 'paste');
  const sourceHost = host(), data = store('', { mode: 'readwrite' }); let values = 0;
  const source = connectDragSource({ element: sourceHost.element, format: createDataTransferFormat(options()), operations: ['copy'], getValue: () => { values++; return 'export'; } }).value;
  assert.equal(emit(sourceHost, 'copy', data).defaultPrevented, true); assert.equal(data.getData(options().type), 'export');
  const child = sourceHost.document.createElement('input'); sourceHost.element.append(child);
  emit(sourceHost, 'copy', data, child); assert.equal(values, 1);
  sourceHost.element.textContent = 'selected'; const range = sourceHost.document.createRange(); range.selectNodeContents(sourceHost.element);
  sourceHost.document.getSelection().addRange(range); emit(sourceHost, 'copy', data); assert.equal(values, 1);
  source.disconnect(); current.owner.disconnect(); assert.equal(sourceHost.count(), 0); assert.equal(current.count(), 0);
});

test('Native source writes admitted data only on activation, restores attributes and never deletes source values', () => {
  const current = host(), sourceValues = ['parcel'], ended = [], states = [], rejects = [];
  current.element.setAttribute('draggable', 'false');
  const owner = connectDragSource({ element: current.element, format: createDataTransferFormat(options()), operations: ['move', 'copy'],
    getValue: () => sourceValues[0], onEnd: operation => ended.push(operation), onChange: state => states.push(state), onReject: error => rejects.push(error.code) }).value;
  assert.equal(current.count(), 3); assert.equal(current.element.getAttribute('draggable'), 'true');
  const data = store('', { mode: 'readwrite' }); assert.equal(data.writes, 0);
  assert.equal(emit(current, 'dragstart', data).defaultPrevented, false); assert.equal(data.effectAllowed, 'copyMove'); assert.equal(data.getData(options().type), 'parcel');
  data.dropEffect = 'move'; emit(current, 'dragend', data); assert.deepEqual(ended, ['move']); assert.deepEqual(sourceValues, ['parcel']);
  assert.equal(owner.getSnapshot().active, false); assert.equal(states.length, 2); assert.deepEqual(rejects, []);
  owner.disconnect(); assert.equal(current.element.getAttribute('draggable'), 'false'); assert.equal(current.count(), 0);
});

test('Source codec/callback failure or callback retirement cancels native activation without writing', () => {
  for (const action of ['oversize', 'throw', 'cancel', 'disconnect']) {
    const current = host(), data = store('', { mode: 'readwrite' }); let owner;
    owner = connectDragSource({ element: current.element, format: createDataTransferFormat(options()), operations: ['copy'], getValue: () => {
      if (action === 'throw') throw Error('private source');
      if (action === 'cancel') owner.cancel(); if (action === 'disconnect') owner.disconnect();
      return action === 'oversize' ? 'a'.repeat(33) : 'a';
    } }).value;
    assert.equal(emit(current, 'dragstart', data).defaultPrevented, true); assert.equal(data.writes, 0);
    owner.disconnect(); assert.equal(current.count(), 0);
  }
});

test('Hover cancellation, partial listener acquisition and repeated disconnect leave zero native resources', () => {
  for (let index = 0; index < 40; index++) {
    const current = targetFixture(), data = store('a', { mode: 'protected' }); emit(current, 'dragover', data);
    current.window.dispatchEvent(new current.window.Event('blur')); assert.equal(current.owner.getSnapshot().active, false);
    emit(current, 'dragover', data); current.document.dispatchEvent(new current.window.Event('dragend')); assert.equal(current.owner.getSnapshot().active, false);
    current.owner.disconnect(); current.owner.disconnect(); assert.equal(current.count(), 0);
    for (const entry of current.counts) for (const [type, handler] of entry.saved) handler(new current.window.Event(type));
    assert.deepEqual(current.owner.getSnapshot(), { connected: false, active: false, operation: null });
  }
  for (const failedType of ['dragover', 'paste', 'dragstart', 'copy']) {
    const current = host(); current.element.failListener = failedType;
    const base = { element: current.element, format: createDataTransferFormat(options()), operations: ['copy'] };
    const result = failedType === 'dragstart' || failedType === 'copy' ? connectDragSource({ ...base, getValue: () => 'a' })
      : connectDropTarget({ ...base, maxTypes: 8, onDrop: () => {} });
    code(result, 'unavailable'); assert.equal(current.count(), 0); assert.equal(current.element.hasAttribute('draggable'), false);
  }
  for (const source of [false, true]) {
    const current = host(); let calls = 0;
    const base = { element: current.element, format: createDataTransferFormat(options()), operations: ['copy'] };
    const owner = (source ? connectDragSource({ ...base, getValue: () => { calls++; return 'a'; } })
      : connectDropTarget({ ...base, maxTypes: 8, onDrop: () => { calls++; } })).value;
    const other = new Window(); other.document.body.append(other.document.adoptNode(current.element));
    emit(current, source ? 'dragstart' : 'drop', store('a', { mode: source ? 'readwrite' : 'readonly' }));
    assert.equal(calls, 0); assert.equal(owner.getSnapshot().connected, false); assert.equal(current.count(), 0);
  }
});

test('Native factories require canonical formats and bounded explicit operation/type policies', () => {
  const current = host(), base = { element: current.element, format: createDataTransferFormat(options()), operations: ['copy'], maxTypes: 8, onDrop: () => {} };
  for (const overrides of [{ format: { ...base.format } }, { operations: [] }, { operations: ['copy', 'copy'] }, { operations: ['link'] },
    { operations: ['copy', 'move', 'copy'] }, { maxTypes: 0 }, { maxTypes: Infinity }, { maxTypes: 0.5 }, { onDrop: null }])
    code(connectDropTarget({ ...base, ...overrides }), 'native-invalid');
  assert.equal(current.count(), 0);
});

class ResourceTarget extends EventTarget {
  saved = []; attributes = new Map(); isConnected = true; closed = false; parentElement = null;
  constructor(nodeType) { super(); this.nodeType = nodeType; this.namespaceURI = 'http://www.w3.org/1999/xhtml'; }
  addEventListener(type, handler, options) { this.saved.push([type, handler]); super.addEventListener(type, handler, options); }
  matches() { return false; }
  contains(node) { return node === this; }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  getSelection() { return null; }
}
function resourceEvent(element, type, data) {
  const event = new Event(type, { cancelable: true }); event.dataTransfer = data; event.composedPath = () => [element];
  element.dispatchEvent(event);
}
function retiredTransfer(cancelled) {
  const document = new ResourceTarget(9), view = new ResourceTarget(0), source = new ResourceTarget(1), target = new ResourceTarget(1);
  document.defaultView = view; source.ownerDocument = target.ownerDocument = document;
  const payload = { retained: new Uint8Array(1024 * 1024) };
  const decode = () => ({ ok: true, value: payload }), getValue = () => payload;
  const format = createDataTransferFormat(options({ decode, encode: () => 'a' }));
  let saved;
  const sourceOwner = connectDragSource({ element: source, format, operations: ['copy'], getValue }).value;
  const targetOwner = connectDropTarget({ element: target, format, operations: ['copy'], maxTypes: 8, onDrop: request => {
    saved = request; request.accept(() => { void payload.retained; return { ok: true, value: undefined }; });
    if (cancelled) request.reject();
  } }).value;
  resourceEvent(source, 'dragstart', store('', { mode: 'readwrite' })); resourceEvent(target, 'drop', store());
  sourceOwner.disconnect(); targetOwner.disconnect();
  return { sourceOwner, targetOwner, request: saved, callbacks: [...source.saved, ...target.saved, ...document.saved, ...view.saved],
    refs: [payload, decode, getValue, format, source, target, document, view].map(value => new WeakRef(value)) };
}

test('Retired native connections, saved handlers and request views release caller values and DOM graphs', { skip: typeof globalThis.gc !== 'function' }, async () => {
  const held = [retiredTransfer(false), retiredTransfer(true)];
  for (let index = 0; index < 20; index++) { await new Promise(resolve => setImmediate(resolve)); globalThis.gc(); }
  for (const record of held) {
    assert.deepEqual(record.refs.map(reference => reference.deref() === undefined), Array(8).fill(true));
    assert.equal(record.request.signal.aborted, true); code(record.request.getValue(), 'inactive');
    for (const [type, callback] of record.callbacks) callback(new Event(type));
    assert.equal(record.sourceOwner.getSnapshot().connected, false); assert.equal(record.targetOwner.getSnapshot().connected, false);
  }
});
