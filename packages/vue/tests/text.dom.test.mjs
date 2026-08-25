import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/text' });
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

const { createApp, h, nextTick, ref } = await import('vue');
const { NumberField } = await import('../dist/number-field.js');
const { QuantityFieldRoot } = await import('../dist/quantity-field.js');
const { TextField } = await import('../dist/text.js');

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

test('controlled Vue TextField preserves Hangul composition metadata between model updates', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('Mina Kim');
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
  assert.equal(typeof valueDescriptor?.set, 'function');

  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(compositionEvent('compositionstart', ''));

  valueDescriptor.set.call(input, 'Mina Kimㅎ');
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(compositionEvent('compositionupdate', '한'));

  valueDescriptor.set.call(input, 'Mina Kim한');
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(compositionEvent('compositionend', '한'));
  valueDescriptor.set.call(input, 'Mina Kim한한');
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();

  assert.equal(value.value, 'Mina Kim한');
  assert.equal(input.value, 'Mina Kim한');

  app.unmount();
  host.remove();
});

test('domain-parsed value controls do not advertise text model modifiers', () => {
  assert.equal(Object.hasOwn(NumberField.props, 'modelModifiers'), false);
  assert.equal(Object.hasOwn(QuantityFieldRoot.props, 'modelModifiers'), false);
});
