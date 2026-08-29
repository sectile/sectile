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
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, createSSRApp, h, nextTick, ref } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { NumberField } = await import('../.verification-dist/number-field.js');
const { QuantityFieldRoot } = await import('../.verification-dist/quantity-field.js');
const { TextField } = await import('../.verification-dist/text.js');

const replaceInputValue = (input, value) => {
  input.value = value;
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertReplacementText',
  }));
};

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

test('controlled Vue TextField leaves consecutive Hangul composition under native input ownership', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('');
  const app = createApp({
    render: () => h(TextField, {
      modelValue: value.value,
      'onUpdate:modelValue': (nextValue) => { value.value = nextValue; },
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
  input.dispatchEvent(compositionEvent('compositionend', '한'));
  composing = false;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await Promise.resolve();
  await nextTick();

  composing = true;
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(compositionEvent('compositionstart', ''));
  valueDescriptor.set.call(input, '한ㄱ');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();
  valueDescriptor.set.call(input, '한글');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();
  input.dispatchEvent(compositionEvent('compositionend', '글'));
  composing = false;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await Promise.resolve();
  await nextTick();

  assert.deepEqual(writes.filter((write) => write.composing), []);
  assert.equal(value.value, '한글');
  assert.equal(input.value, '한글');

  app.unmount();
  host.remove();
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

test('domain-parsed value controls do not advertise text model modifiers', () => {
  assert.equal(Object.hasOwn(NumberField.props, 'modelModifiers'), false);
  assert.equal(Object.hasOwn(QuantityFieldRoot.props, 'modelModifiers'), false);
});
