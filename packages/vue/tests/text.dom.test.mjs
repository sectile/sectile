import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/text' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  HTMLTextAreaElement: browserWindow.HTMLTextAreaElement,
  KeyboardEvent: browserWindow.KeyboardEvent,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, createSSRApp, defineComponent, h, nextTick, ref, shallowRef, Suspense } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { NumberField } = await import('../.verification-dist/number-field.js');
const { QuantityFieldRoot } = await import('../.verification-dist/quantity-field.js');
const { TextField } = await import('../.verification-dist/text.js');

const settleClear = async () => { for (let index = 0; index < 6; index++) await nextTick(); };
function collectClearError(errors) { return error => errors.push(error); }
function clearFixture(initial, accept = false) {
  const props = shallowRef(initial), updates = [], errors = [], host = document.createElement('div'); let instance;
  document.body.append(host);
  const app = createApp({ render: () => h(TextField, { ...props.value, ref: value => { if (value) instance = value; },
    'onUpdate:modelValue': value => { updates.push(value); props.value['onUpdate:modelValue']?.(value); if (accept) props.value = { ...props.value, modelValue: value }; },
  }) });
  app.config.errorHandler = collectClearError(errors); app.mount(host);
  return { host, props, updates, errors, get instance() { return instance; }, dispose() { app.unmount(); host.remove(); } };
}
for (const multiline of [false, true]) test(`TextField clear commits through its existing native owner (${multiline})`, async () => {
  const fixture = clearFixture({ defaultValue: '배송 <주소>', multiline, name: 'query' });
  try {
    const input = fixture.host.querySelector(multiline ? 'textarea' : 'input'); input.focus(); input.setSelectionRange(1, 3, 'backward');
    const clear = fixture.instance.clear; assert.equal(fixture.instance.defaultValue, '배송 <주소>', 'Existing public instance props remain readable');
    assert.equal(clear(), true); await settleClear();
    assert.equal(fixture.host.querySelector(multiline ? 'textarea' : 'input') === input, true);
    assert.equal(input.value, ''); assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 0]);
    assert.equal(document.activeElement === input, true); assert.deepEqual(fixture.updates, ['']); assert.equal(clear(), false);
    assert.equal(input.name, 'query'); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
  assert.equal(fixture.instance.clear(), false);
});
for (const lazy of [false, true]) for (const accept of [false, true]) test(`TextField clear honors controlled acceptance and explicit lazy commits (${lazy}/${accept})`, async () => {
  const fixture = clearFixture({ modelValue: 'Address', modelModifiers: { lazy, number: true, trim: true } }, accept);
  try {
    const input = fixture.host.querySelector('input'); input.setSelectionRange(1, 4, 'backward');
    assert.equal(fixture.instance.clear(), true); assert.deepEqual(fixture.updates, ['']); await settleClear();
    assert.equal(input.value, accept ? '' : 'Address');
    assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], accept ? [0, 0, 'none'] : [1, 4, 'backward']);
    assert.equal(fixture.instance.modelValue, accept ? '' : 'Address'); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
test('TextField clear rejects flags and active or ending IME without publishing an edit', async () => {
  const fixture = clearFixture({ defaultValue: '한글', disabled: true });
  try {
    const input = fixture.host.querySelector('input'); assert.equal(fixture.instance.clear(), false);
    fixture.props.value = { defaultValue: '한글', readonly: true }; await nextTick(); assert.equal(fixture.instance.readonly, true);
    input.setSelectionRange(1, 1); assert.equal(fixture.instance.clear(), false); assert.deepEqual(fixture.updates, []);
    assert.equal(input.value, '한글'); assert.equal(input.selectionStart, 1);
    fixture.props.value = { defaultValue: '한글' }; await nextTick();
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(compositionEvent('compositionstart', ''));
    assert.equal(fixture.instance.clear(), false);
    input.value = '한글가'; input.setSelectionRange(3, 3); input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText' }));
    assert.equal(fixture.instance.clear(), false); assert.deepEqual(fixture.updates, []);
    input.dispatchEvent(compositionEvent('compositionend', '가')); assert.equal(fixture.instance.clear(), false);
    await settleClear(); assert.deepEqual(fixture.updates, ['한글가']);
    assert.equal(fixture.instance.clear(), true); await settleClear(); assert.deepEqual(fixture.updates, ['한글가', '']); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
test('TextField clear blocks synchronous reentry and retires before callback-driven unmount', async () => {
  let fixture; const nested = [];
  fixture = clearFixture({ defaultValue: 'Address', 'onUpdate:modelValue': () => { nested.push(fixture.instance.clear()); fixture.dispose(); } });
  const clear = fixture.instance.clear;
  assert.equal(clear(), true); await settleClear(); assert.deepEqual(nested, [false]);
  assert.equal(clear(), false); assert.deepEqual(fixture.updates, ['']); assert.deepEqual(fixture.errors, []);
});
async function retiredClear() {
  const payload = { name: 'Caller callback' }, fixture = clearFixture({ defaultValue: 'Address', 'onUpdate:modelValue': () => payload.name });
  const root = new WeakRef(fixture.host.querySelector('input')), borrowed = new WeakRef(payload), clear = fixture.instance.clear;
  fixture.dispose(); await settleClear(); return { root, borrowed, clear, errors: fixture.errors };
}
test('TextField held clear releases unmounted native and caller graphs', { skip: typeof global.gc !== 'function' }, async () => {
  const saved = await retiredClear();
  for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(saved.clear(), false); assert.ok(saved.root.deref() === undefined, 'Native root is released');
  assert.ok(saved.borrowed.deref() === undefined, 'Caller callbacks are released'); assert.deepEqual(saved.errors, []);
});

const replaceInputValue = (input, value) => {
  input.value = value;
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertReplacementText',
  }));
};

function replacement(snapshot, text = '배송😀') {
  return { snapshot, startCodeUnitOffset: 0, endCodeUnitOffset: snapshot.text.length, text };
}
for (const controlled of [false, true]) test(`TextField refuses unrepresentable native replacement without publishing or invalidating its frame (${controlled})`, async () => {
  const fixture = clearFixture({ ...(controlled ? { modelValue: '@Ad' } : { defaultValue: '@Ad' }), modelModifiers: { lazy: true } }, controlled);
  try {
    const input = fixture.host.querySelector('input'), snapshot = fixture.instance.getTextSnapshot(); assert.ok(snapshot);
    for (const text of ['@Ada\n', '@Ada\r', '@Ada\r\n']) {
      assert.deepEqual(await fixture.instance.replaceText(replacement(snapshot, text)), { status: 'rejected', reason: 'invalid' });
      assert.equal(input.value, '@Ad'); assert.equal(fixture.instance.getTextSnapshot(), snapshot); assert.deepEqual(fixture.updates, []);
    }
    const result = await fixture.instance.replaceText(replacement(snapshot, '@Ada'));
    assert.equal(result.status, 'accepted'); assert.equal(input.value, '@Ada'); assert.deepEqual(fixture.updates, ['@Ada']); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
test('TextField multiline replacement accepts LF and refuses native CR normalization before a proposal', async () => {
  const fixture = clearFixture({ defaultValue: '@Ad', multiline: true });
  try {
    const snapshot = fixture.instance.getTextSnapshot();
    assert.deepEqual(await fixture.instance.replaceText(replacement(snapshot, '@Ada\r\n')), { status: 'rejected', reason: 'invalid' });
    assert.deepEqual(fixture.updates, []); assert.equal(fixture.instance.getTextSnapshot(), snapshot);
    const result = await fixture.instance.replaceText(replacement(snapshot, '@Ada\n'));
    assert.equal(result.status, 'accepted'); assert.equal(result.snapshot.text, '@Ada\n'); assert.deepEqual(fixture.updates, ['@Ada\n']); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
for (const controlled of [false, true]) test(`TextField lazy replacement does not publish a text-identical caret change (${controlled})`, async () => {
  const fixture = clearFixture({ ...(controlled ? { modelValue: 'Address' } : { defaultValue: 'Address' }), modelModifiers: { lazy: true } }, controlled);
  try {
    const snapshot = fixture.instance.getTextSnapshot();
    const result = await fixture.instance.replaceText({ snapshot, startCodeUnitOffset: 0, endCodeUnitOffset: 1, text: 'A' });
    assert.equal(result.status, 'accepted'); assert.equal(result.snapshot.text, 'Address'); assert.equal(result.snapshot.selection.focusCodeUnitOffset, 1);
    assert.deepEqual(fixture.updates, []); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
test('TextField lazy replacement observes callback-driven retirement before acknowledging success', async () => {
  let fixture; fixture = clearFixture({ defaultValue: '@Ad', modelModifiers: { lazy: true }, 'onUpdate:modelValue': () => fixture.dispose() });
  const replace = fixture.instance.replaceText, snapshot = fixture.instance.getTextSnapshot();
  assert.deepEqual(await replace(replacement(snapshot, '@Ada')), { status: 'rejected', reason: 'unavailable' });
  assert.deepEqual(fixture.updates, ['@Ada']); assert.equal(fixture.instance.getTextSnapshot(), null); assert.deepEqual(fixture.errors, []);
});
for (const composing of [false, true]) test(`TextField reconnects a replaced native editor without a value proposal (${composing})`, async () => {
  const fixture = clearFixture({ defaultValue: '@Ad' });
  try {
    const first = fixture.host.querySelector('input'); first.focus(); first.setSelectionRange(1, 2, 'backward');
    first.dispatchEvent(new Event('select', { bubbles: true })); await settleClear();
    const before = fixture.instance.getTextSnapshot(); assert.ok(before);
    if (composing) {
      first.dispatchEvent(compositionEvent('compositionstart', ''));
      first.value = '@임시d'; first.setSelectionRange(3, 3);
      first.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText' }));
      assert.equal(fixture.instance.getTextSnapshot(), null);
    }
    fixture.props.value = { ...fixture.props.value, multiline: true }; await settleClear();
    if (composing) {
      assert.equal(fixture.host.querySelector('input'), first); assert.equal(document.activeElement, first);
      first.dispatchEvent(compositionEvent('compositionend', '임시'));
      await new Promise(resolve => setTimeout(resolve, 0)); await settleClear();
    }
    const current = fixture.host.querySelector('textarea'), snapshot = fixture.instance.getTextSnapshot();
    assert.ok(current); assert.ok(snapshot); assert.equal(snapshot.text, composing ? '@임시d' : '@Ad');
    assert.equal(document.activeElement, current);
    if (!composing) assert.deepEqual(snapshot.selection, before.selection);
    const accepted = composing ? ['@임시d'] : []; assert.deepEqual(fixture.updates, accepted);
    assert.equal((await fixture.instance.replaceText({ snapshot: before, startCodeUnitOffset: 0, endCodeUnitOffset: 3, text: '@Late' })).reason, 'stale');
    first.value = 'Detached'; first.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    await settleClear(); assert.deepEqual(fixture.updates, accepted);
    replaceInputValue(current, '@Ada'); await settleClear(); assert.deepEqual(fixture.updates, [...accepted, '@Ada']);
    fixture.props.value = { ...fixture.props.value, multiline: false }; await settleClear();
    assert.equal(fixture.host.querySelector('input').value, '@Ada'); assert.equal(fixture.instance.getTextSnapshot().text, '@Ada');
    assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
test('TextField retains multiline text until a single-line replacement is representable and preserves inactive focus', async () => {
  const fixture = clearFixture({ defaultValue: 'alpha\nbeta', multiline: true });
  const outside = document.createElement('button'); document.body.append(outside); outside.focus();
  try {
    const original = fixture.host.querySelector('textarea');
    fixture.props.value = { ...fixture.props.value, multiline: false }; await settleClear();
    assert.equal(fixture.host.querySelector('textarea'), original); assert.equal(original.value, 'alpha\nbeta');
    replaceInputValue(original, 'alpha beta'); await settleClear();
    assert.equal(fixture.host.querySelector('input').value, 'alpha beta'); assert.equal(document.activeElement, outside);
  } finally { fixture.dispose(); outside.remove(); }
});
test('TextField query projection binds the current range to its issued replacement snapshot', async () => {
  const fixture = clearFixture({ modelValue: 'Hi @Ad' }, true);
  const queryText = fixture.instance.getTextQuery;
  try {
    const query = queryText({ trigger: '@', maxQueryCodeUnits: 16 });
    assert.equal(query.ok, true); assert.ok(query.value);
    assert.equal(query.value.query, 'Ad'); assert.equal(query.value.startCodeUnitOffset, 3);
    assert.equal(query.value.snapshot, fixture.instance.getTextSnapshot());
    const invalid = queryText({ trigger: '@', maxQueryCodeUnits: -1 });
    assert.equal(invalid.ok, false); assert.equal(invalid.error.code, 'invalid-text-query-options');
    const result = await fixture.instance.replaceText({ snapshot: query.value.snapshot,
      startCodeUnitOffset: query.value.startCodeUnitOffset, endCodeUnitOffset: query.value.endCodeUnitOffset, text: '@Ada ' });
    assert.equal(result.status, 'accepted'); assert.equal(result.snapshot.text, 'Hi @Ada ');
    const input = fixture.host.querySelector('input'); input.setSelectionRange(0, 0); input.dispatchEvent(new Event('select', { bubbles: true })); await settleClear();
    assert.equal(queryText({ trigger: '@', maxQueryCodeUnits: 16 }).value, null);
    assert.equal((await fixture.instance.replaceText({ snapshot: query.value.snapshot, startCodeUnitOffset: 3, endCodeUnitOffset: 6, text: '@Other ' })).reason, 'stale');
    input.dispatchEvent(compositionEvent('compositionstart', ''));
    assert.equal(queryText({ trigger: '@', maxQueryCodeUnits: 16 }).value, null);
  } finally { fixture.dispose(); }
  assert.equal(queryText({ trigger: '@', maxQueryCodeUnits: 16 }).value, null);
});
test('TextField coalesces query snapshot notifications and suppresses retired delivery', async () => {
  let fixture; const queries = [];
  fixture = clearFixture({ defaultValue: '@Ada', onSnapshotChange: () => queries.push(fixture.instance.getTextQuery({ trigger: '@', maxQueryCodeUnits: 16 }).value) });
  try {
    await settleClear(); assert.equal(queries.at(-1).query, 'Ada'); queries.length = 0;
    const input = fixture.host.querySelector('input');
    for (const offset of [1, 2, 3]) { input.setSelectionRange(offset, offset); input.dispatchEvent(new Event('select', { bubbles: true })); }
    assert.equal(queries.length, 0); await settleClear();
    assert.equal(queries.length, 1); assert.equal(queries[0].query, 'Ad'); assert.deepEqual(fixture.updates, []);
    input.dispatchEvent(compositionEvent('compositionstart', '')); await settleClear();
    assert.equal(queries.at(-1), null); const count = queries.length;
    input.dispatchEvent(compositionEvent('compositionend', '')); fixture.dispose(); await settleClear();
    assert.equal(queries.length, count); assert.deepEqual(fixture.updates, []); assert.deepEqual(fixture.errors, []);
  } finally { if (fixture.host.isConnected) fixture.dispose(); }
});
for (const lazy of [false, true]) for (const accept of [false, true]) test(`TextField replacement reports actual controlled settlement (${lazy}/${accept})`, async () => {
  const fixture = clearFixture({ modelValue: 'Address', modelModifiers: { lazy } }, accept);
  try {
    const input = fixture.host.querySelector('input'); input.setSelectionRange(1, 4, 'backward');
    input.dispatchEvent(new Event('select', { bubbles: true })); await settleClear();
    const snapshot = fixture.instance.getTextSnapshot(); assert.ok(snapshot); assert.equal(fixture.instance.getTextSnapshot(), snapshot);
    const result = await fixture.instance.replaceText(replacement(snapshot));
    assert.deepEqual(fixture.updates, ['배송😀']);
    assert.equal(result.status, accept ? 'accepted' : 'rejected');
    if (accept) {
      assert.equal(result.snapshot.text, '배송😀'); assert.equal(result.snapshot.selection.focusCodeUnitOffset, 4);
      assert.equal(fixture.instance.getTextSnapshot(), result.snapshot); assert.deepEqual([input.selectionStart, input.selectionEnd], [4, 4]);
    } else {
      assert.equal(result.reason, 'refused'); assert.equal(input.value, 'Address');
      assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [1, 4, 'backward']);
    }
    assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
test('TextField replacement uses the native lazy draft and treats an unchanged edit as accepted', async () => {
  const fixture = clearFixture({ modelValue: 'Address', modelModifiers: { lazy: true } }, true);
  try {
    const input = fixture.host.querySelector('input'); replaceInputValue(input, '@ad'); await settleClear();
    const snapshot = fixture.instance.getTextSnapshot(); assert.equal(snapshot.text, '@ad');
    const result = await fixture.instance.replaceText(replacement(snapshot, '@Ada '));
    assert.equal(result.status, 'accepted'); assert.equal(input.value, '@Ada '); assert.deepEqual(fixture.updates, ['@Ada ']);
    const noop = await fixture.instance.replaceText({ snapshot: result.snapshot, startCodeUnitOffset: 5, endCodeUnitOffset: 5, text: '' });
    assert.equal(noop.status, 'accepted'); assert.deepEqual(fixture.updates, ['@Ada ']);
  } finally { fixture.dispose(); }
});
test('TextField replacement rejects foreign or stale frames and invalid UTF-16 ranges without edits', async () => {
  const fixture = clearFixture({ defaultValue: 'a😀b' }), other = clearFixture({ defaultValue: 'a😀b' });
  try {
    const input = fixture.host.querySelector('input'), snapshot = fixture.instance.getTextSnapshot();
    assert.equal((await fixture.instance.replaceText(replacement(other.instance.getTextSnapshot()))).reason, 'stale');
    assert.equal((await fixture.instance.replaceText({ snapshot, startCodeUnitOffset: 2, endCodeUnitOffset: 3, text: 'x' })).reason, 'invalid');
    assert.equal(input.value, 'a😀b'); assert.deepEqual(fixture.updates, []);
    input.setSelectionRange(1, 1); input.dispatchEvent(new Event('select', { bubbles: true })); await settleClear();
    assert.equal((await fixture.instance.replaceText(replacement(snapshot))).reason, 'stale');
    const current = fixture.instance.getTextSnapshot(); input.value = 'unobserved';
    assert.equal(fixture.instance.getTextSnapshot(), null);
    assert.equal((await fixture.instance.replaceText(replacement(current))).reason, 'stale');
    assert.equal((await fixture.instance.replaceText({ ...replacement(current), snapshot: null })).reason, 'stale');
  } finally { fixture.dispose(); other.dispose(); }
});
test('TextField replacement refuses transformed parent values and blocks a second pending edit', async () => {
  let fixture;
  fixture = clearFixture({ modelValue: 'Address', 'onUpdate:modelValue': value => { fixture.props.value = { ...fixture.props.value, modelValue: value.toUpperCase() }; } });
  try {
    const snapshot = fixture.instance.getTextSnapshot(), pending = fixture.instance.replaceText(replacement(snapshot, 'ada'));
    assert.equal((await fixture.instance.replaceText(replacement(snapshot))).reason, 'busy');
    const result = await pending; assert.equal(result.status, 'rejected'); assert.equal(result.reason, 'refused');
    assert.equal(fixture.host.querySelector('input').value, 'ADA'); assert.deepEqual(fixture.updates, ['ada']); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});
test('TextField replacement rejects flags and IME, and retires safely on callback-driven unmount', async () => {
  for (const [flag, reason] of [['disabled', 'disabled'], ['readonly', 'readonly']]) {
    const fixture = clearFixture({ defaultValue: 'Address', [flag]: true });
    try { assert.equal((await fixture.instance.replaceText(replacement(fixture.instance.getTextSnapshot()))).reason, reason); assert.deepEqual(fixture.updates, []); }
    finally { fixture.dispose(); }
  }
  const composing = clearFixture({ defaultValue: 'Address' });
  try {
    const snapshot = composing.instance.getTextSnapshot(), input = composing.host.querySelector('input');
    input.dispatchEvent(compositionEvent('compositionstart', '')); assert.equal(composing.instance.getTextSnapshot(), null);
    assert.equal((await composing.instance.replaceText(replacement(snapshot))).reason, 'composing');
  } finally { composing.dispose(); }
  let fixture; fixture = clearFixture({ defaultValue: 'Address', 'onUpdate:modelValue': () => fixture.dispose() });
  const read = fixture.instance.getTextSnapshot, replace = fixture.instance.replaceText, snapshot = read();
  assert.equal((await replace(replacement(snapshot))).reason, 'unavailable'); assert.equal(read(), null);
  assert.equal((await replace(replacement(snapshot))).reason, 'unavailable');
});
test('TextField replacement does not acknowledge superseding native input or reconnection', async () => {
  for (const reconnect of [false, true]) {
    let fixture, once = true;
    fixture = clearFixture({ defaultValue: 'Address', 'onUpdate:modelValue': () => {
      if (!once) return; once = false;
      if (reconnect) fixture.props.value = { ...fixture.props.value, readonly: true };
      else queueMicrotask(() => replaceInputValue(fixture.host.querySelector('input'), 'superseding input'));
    } });
    try {
      const result = await fixture.instance.replaceText(replacement(fixture.instance.getTextSnapshot(), 'Ada'));
      assert.equal(result.status, 'rejected'); assert.equal(result.reason, 'stale'); assert.deepEqual(fixture.errors, []);
    } finally { fixture.dispose(); }
  }
});
test('TextField snapshot reads one native value and reuses one issued frame at large text size', async () => {
  const fixture = clearFixture({ defaultValue: 'a'.repeat(100_000) });
  try {
    await settleClear(); const input = fixture.host.querySelector('input');
    // Preserve the selection while excluding Happy DOM's lazy value-reading selection getters from this counter.
    input.setSelectionRange(input.selectionStart, input.selectionEnd, input.selectionDirection);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); let reads = 0;
    Object.defineProperty(input, 'value', { configurable: true, get() { reads++; return descriptor.get.call(this); }, set(value) { descriptor.set.call(this, value); } });
    const snapshot = fixture.instance.getTextSnapshot(); assert.equal(snapshot.text.length, 100_000);
    for (let index = 0; index < 10; index++) assert.equal(fixture.instance.getTextSnapshot(), snapshot);
    assert.equal(reads, 11);
  } finally { fixture.dispose(); }
});
async function retiredReplacement() {
  const payload = { text: 'Caller graph' }, fixture = clearFixture({ defaultValue: 'Address', 'onUpdate:modelValue': () => payload.text, onSnapshotChange: () => payload.text });
  const read = fixture.instance.getTextSnapshot, query = fixture.instance.getTextQuery, replace = fixture.instance.replaceText, input = new WeakRef(fixture.host.querySelector('input')), caller = new WeakRef(payload);
  const result = await replace(replacement(read()));
  const native = fixture.host.querySelector('input'); native.setSelectionRange(0, 0); native.dispatchEvent(new Event('select', { bubbles: true }));
  fixture.dispose(); await settleClear();
  return { read, query, replace, result, input, caller };
}
test('TextField held edit methods and result release the unmounted native and caller graphs', { skip: typeof global.gc !== 'function' }, async () => {
  const held = await retiredReplacement();
  for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.result.status, 'accepted'); assert.equal(held.read(), null);
  assert.equal(held.query({ trigger: '@', maxQueryCodeUnits: 16 }).value, null);
  assert.equal(held.input.deref(), undefined); assert.equal(held.caller.deref(), undefined);
});

for (const lazy of [false, true]) test(`TextField selection retains the native draft without publishing a model value (${lazy})`, async () => {
  const fixture = clearFixture({ modelValue: 'Address', modelModifiers: { lazy }, name: 'query' });
  try {
    const input = fixture.host.querySelector('input'); input.focus();
    if (lazy) replaceInputValue(input, 'Draft address');
    input.setSelectionRange(1, 4, 'backward'); input.dispatchEvent(new Event('select', { bubbles: true }));
    await settleClear();
    assert.deepEqual(fixture.updates, []); assert.equal(fixture.instance.modelValue, 'Address');
    assert.equal(input.value, lazy ? 'Draft address' : 'Address');
    assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [1, 4, 'backward']);
    fixture.props.value = { ...fixture.props.value, readonly: true }; await settleClear();
    assert.equal(fixture.host.querySelector('input'), input); assert.equal(input.value, lazy ? 'Draft address' : 'Address');
    assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [1, 4, 'backward']);
    assert.deepEqual(fixture.updates, []); assert.deepEqual(fixture.errors, []);
  } finally { fixture.dispose(); }
});

const compositionEvent = (type, data) => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'data', { value: data });
  return event;
};

test('Vue TextField delegates trim and number modifiers to standard v-model semantics', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const value = ref('');
  const app = createApp({
    render: () => h(TextField, {
      modelValue: value.value,
      modelModifiers: { trim: true, number: true },
      'onUpdate:modelValue': (nextValue) => {
        updates.push(nextValue);
        value.value = nextValue;
      },
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);

  replaceInputValue(input, ' 42.5 ');
  await nextTick();

  assert.equal(updates.at(-1), 42.5);
  assert.equal(value.value, 42.5);
  assert.equal(input.value, '42.5');

  app.unmount();
  host.remove();
});

test('Vue TextField lazy modifier emits only after the native change boundary', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const value = ref('draft');
  const app = createApp({
    render: () => h(TextField, {
      modelValue: value.value,
      modelModifiers: { lazy: true, trim: true },
      'onUpdate:modelValue': (nextValue) => {
        updates.push(nextValue);
        value.value = nextValue;
      },
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);

  replaceInputValue(input, '  release  ');
  await nextTick();
  assert.deepEqual(updates, []);
  assert.equal(value.value, 'draft');
  assert.equal(input.value, '  release  ');

  input.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
  assert.deepEqual(updates, ['release']);
  assert.equal(value.value, 'release');
  assert.equal(input.value, 'release');

  app.unmount();
  host.remove();
});

test('controlled Vue TextField commits Hangul once when Tab ends composition', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const value = ref('');
  const app = createApp({
    render: () => h(TextField, {
      modelValue: value.value,
      'onUpdate:modelValue': (nextValue) => {
        updates.push(nextValue);
        value.value = nextValue;
      },
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.get, 'function');
  assert.equal(typeof valueDescriptor?.set, 'function');
  let composing = false;
  const writes = [];
  Object.defineProperty(input, 'value', {
    configurable: true,
    get() { return valueDescriptor.get.call(this); },
    set(nextValue) {
      writes.push({ composing, value: nextValue });
      valueDescriptor.set.call(this, nextValue);
    },
  });

  composing = true;
  input.dispatchEvent(compositionEvent('compositionstart', ''));
  valueDescriptor.set.call(input, 'ㅎ');
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();
  valueDescriptor.set.call(input, '한');
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();
  valueDescriptor.set.call(input, '한글');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();
  assert.deepEqual(updates, []);
  assert.equal(value.value, '');
  assert.equal(input.value, '한글');

  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
  input.dispatchEvent(compositionEvent('compositionend', '글'));
  composing = false;
  input.dispatchEvent(new Event('blur'));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();

  assert.deepEqual(writes.filter((write) => write.composing), []);
  assert.deepEqual(updates, ['한글']);
  assert.equal(value.value, '한글');
  assert.equal(input.value, '한글');

  app.unmount();
  host.remove();
});

test('controlled Vue TextField defers external values until composition settles', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const value = ref('초기');
  const app = createApp({
    render: () => h(TextField, {
      modelValue: value.value,
      'onUpdate:modelValue': (nextValue) => { updates.push(nextValue); },
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  input.setSelectionRange(2, 2);
  input.dispatchEvent(compositionEvent('compositionstart', ''));
  input.value = '초기한';
  input.setSelectionRange(3, 3);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();

  value.value = '외부';
  await nextTick();
  assert.deepEqual(updates, []);
  assert.equal(input.value, '초기한');

  input.dispatchEvent(compositionEvent('compositionend', '한'));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();

  assert.deepEqual(updates, ['초기한']);
  assert.equal(value.value, '외부');
  assert.equal(input.value, '외부');

  app.unmount();
  host.remove();
});

test('TextField first connection uses the latest controlled value across repeated deferred mounts', async () => {
  const value = ref('setup'), entry = shallowRef(); const updates = [], errors = [];
  const Waiting = defineComponent({ async setup() { const pending = entry.value.pending; await pending; return () => h('p', 'Ready'); } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => entry.value ? h(Suspense, { key: entry.value.key }, {
    default: () => h('form', [h(TextField, { type: 'search', name: 'query', modelValue: value.value,
      'onUpdate:modelValue': next => updates.push(next) }), h(Waiting)]), fallback: () => h('p', 'Loading'),
  }) : null });
  app.config.errorHandler = collectClearError(errors); app.mount(host);
  let release;
  try {
    for (const [key, latest] of ['or', '', 'last'].entries()) {
      value.value = 'setup';
      const pending = new Promise(resolve => { release = resolve; }); entry.value = { key, pending };
      await nextTick(); assert.equal(host.querySelector('input'), null);
      for (const next of ['first', 'second', latest]) { value.value = next; await nextTick(); }
      release(); await settleClear();
      const input = host.querySelector('input'); assert.ok(input);
      assert.equal(input.value, latest); assert.equal(new window.FormData(host.querySelector('form')).get('query'), latest);
      value.value = 'post-mount'; await nextTick(); assert.equal(input.value, 'post-mount');
      entry.value = undefined; await nextTick();
    }
    assert.deepEqual(updates, []); assert.deepEqual(errors, []);
  } finally { release?.(); app.unmount(); host.remove(); }
});

test('TextField deferred mount preserves uncontrolled defaults and never activates a cancelled branch', async () => {
  for (const cancel of [false, true]) {
    let release; const pending = new Promise(resolve => { release = resolve; });
    const defaultValue = ref('initial'), errors = [], host = document.createElement('div'); document.body.append(host);
    const Waiting = defineComponent({ async setup() { await pending; return () => h('p', 'Ready'); } });
    const app = createApp({ render: () => h(Suspense, {}, { default: () => h('div', [h(TextField, { defaultValue: defaultValue.value }), h(Waiting)]) }) });
    app.config.errorHandler = collectClearError(errors); app.mount(host);
    try {
      defaultValue.value = 'changed before mount'; await nextTick();
      if (cancel) app.unmount();
      release(); await settleClear();
      if (cancel) assert.equal(host.querySelector('input'), null);
      else assert.equal(host.querySelector('input').value, 'initial');
      assert.deepEqual(errors, []);
    } finally { release(); if (!cancel) app.unmount(); host.remove(); }
  }
});

test('controlled Vue TextField hydrates its initial value and syncs later values through the DOM connection', async () => {
  const value = ref('초기값');
  const component = {
    render: () => h(TextField, {
      modelValue: value.value,
      'onUpdate:modelValue': (nextValue) => { value.value = nextValue; },
    }),
  };
  const clientWindow = globalThis.window;
  Reflect.deleteProperty(globalThis, 'window');
  let html;
  try {
    html = await renderToString(createSSRApp(component));
  } finally {
    globalThis.window = clientWindow;
  }
  assert.match(html, /value="초기값"/);

  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const warnings = [];
  const app = createSSRApp(component);
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host);
  try {
    await nextTick();
    const input = host.querySelector('input');
    assert.ok(input instanceof HTMLInputElement);
    assert.deepEqual(warnings, []);
    assert.equal(input.value, '초기값');

    value.value = '외부 변경';
    await nextTick();
    assert.equal(input.value, '외부 변경');
    assert.equal(input.selectionStart, '외부 변경'.length);
    assert.equal(input.selectionEnd, '외부 변경'.length);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('NumberField explicit edits settle accepted values independently of preserved controlled drafts', async () => {
  for(const accept of [false,true]) {
    const model=ref('-0.2'), updates=[], host=document.createElement('div');let field;
    document.body.append(host);
    const app=createApp({render:()=>h(NumberField,{ref:value=>{field=value;},modelValue:model.value,
      'onUpdate:modelValue':value=>{updates.push(value);if(accept)model.value=value;}})}); app.mount(host);
    try {
      const input=host.querySelector('input');input.focus();replaceInputValue(input,'0.2');await settleClear();
      assert.equal(field.modelValue,'-0.2');
      const result=await field.stepBy('0.1'); assert.equal(result.status,accept?'accepted':'rejected');
      assert.equal(input.value,accept?'0.3':'-0.2');assert.equal(model.value,accept?'0.3':'-0.2');assert.deepEqual(updates,['0.3']);
      const clear=field.clear;const cleared=await clear();assert.equal(cleared.status,accept?'accepted':'rejected');
      assert.equal(input.value,accept?'':'-0.2');assert.equal(document.activeElement,input);
      input.dispatchEvent(compositionEvent('compositionstart',''));assert.equal((await field.commitValue('1')).reason,'composing');
      app.unmount();assert.equal((await clear()).reason,'unavailable');
    }finally{if(host.firstChild)app.unmount();host.remove();}
  }
});
test('NumberField explicit commands enforce flags, validation and one pending edit', async () => {
  const props=shallowRef({}), host=document.createElement('div');let field;document.body.append(host);
  const app=createApp({render:()=>h(NumberField,{...props.value,defaultValue:'1',ref:value=>{field=value;}})});app.mount(host);
  try {
    const first=field.stepBy('1');assert.equal((await field.stepBy('1')).reason,'busy');assert.equal((await first).value,'2');
    assert.equal((await field.commitValue('invalid')).reason,'invalid');assert.equal(field.getText(),'2');
    for(const [flag,reason] of [['disabled','disabled'],['readonly','readonly']]){
      props.value={[flag]:true};await nextTick();assert.equal((await field.clear()).reason,reason);assert.equal(field.getText(),'2');
    }
    props.value={required:true};await nextTick();assert.equal((await field.clear()).reason,'invalid');assert.equal(field.getText(),'2');
  }finally{app.unmount();host.remove();}
});
test('NumberField saved numeric commands release the unmounted native and caller graphs', {skip:typeof global.gc!=='function'},async()=>{
  const saved=await retiredNumberField();
  for(let turn=0;turn<25;turn++){await new Promise(resolve=>setImmediate(resolve));global.gc();}
  assert.equal(saved.root.deref(),undefined);assert.equal(saved.payload.deref(),undefined);
  assert.equal(saved.read(),null);assert.equal((await saved.clear()).reason,'unavailable');
});
async function retiredNumberField(){
  const payload={marker:'numeric owner'},host=document.createElement('div');let field;document.body.append(host);
  const app=createApp({render:()=>h(NumberField,{defaultValue:'1',ref:value=>{field=value;},'onUpdate:modelValue':()=>payload.marker})});app.mount(host);
  const result={root:new WeakRef(host.querySelector('input')),payload:new WeakRef(payload),clear:field.clear,read:field.getText};
  app.unmount();host.remove();await nextTick();return result;
}

test('domain-parsed value controls do not advertise text model modifiers', () => {
  assert.equal(Object.hasOwn(NumberField.props, 'modelModifiers'), false);
  assert.equal(Object.hasOwn(QuantityFieldRoot.props, 'modelModifiers'), false);
});
