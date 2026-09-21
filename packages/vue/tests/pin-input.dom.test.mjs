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
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  KeyboardEvent: browserWindow.KeyboardEvent,
  FocusEvent: browserWindow.FocusEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref } = await import('vue');
const { PinInputInput, PinInputRoot } = await import('../.verification-dist/pin-input.js');

test('PIN input element registration settles without recursive updates', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const errors = [];
  const app = createApp({
    render: () => h(PinInputRoot, { length: 6, defaultValue: '12' }, {
      default: () => Array.from({ length: 6 }, (_, index) => h(PinInputInput, { index })),
    }),
  });
  app.config.errorHandler = (error) => errors.push(error);

  app.mount(host);
  await nextTick();
  await nextTick();

  assert.equal(host.querySelectorAll('[data-part="input"]').length, 6);
  assert.deepEqual(errors, []);

  app.unmount();
  host.remove();
});

test('controlled PIN input preserves every character while focus advances', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('');
  const app = createApp({
    render: () => h(PinInputRoot, {
      length: 6,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, {
      default: () => Array.from({ length: 6 }, (_, index) => h(PinInputInput, { index })),
    }),
  });

  app.mount(host);
  await nextTick();
  const inputs = [...host.querySelectorAll('[data-part="input"]')];
  inputs[0].focus();

  for (const character of '123456') {
    const input = document.activeElement;
    assert.ok(input instanceof HTMLInputElement);
    input.value = character;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
  }

  assert.equal(value.value, '123456');
  assert.deepEqual(inputs.map((input) => input.value), ['1', '2', '3', '4', '5', '6']);

  app.unmount();
  host.remove();
});

test('controlled PIN input settles a rejected native proposal after the browser edit', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(PinInputRoot, {
      length: 4,
      modelValue: '',
      'onUpdate:modelValue': (next) => updates.push(next),
    }, {
      default: () => Array.from({ length: 4 }, (_, index) => h(PinInputInput, { index })),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('[data-part="input"]');
  assert.ok(input instanceof HTMLInputElement);

  input.value = '1';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert.equal(input.value, '1');
  assert.deepEqual(updates, ['1']);

  await nextTick();
  await Promise.resolve();
  assert.equal(input.value, '');

  app.unmount();
  host.remove();
});

test('PIN input keeps the active cell browser-owned until composition commits', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('');
  const app = createApp({
    render: () => h(PinInputRoot, {
      length: 4,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, {
      default: () => Array.from({ length: 4 }, (_, index) => h(PinInputInput, { index })),
    }),
  });

  app.mount(host);
  await nextTick();
  const inputs = [...host.querySelectorAll('[data-part="input"]')];
  const first = inputs[0];
  assert.ok(first instanceof HTMLInputElement);
  first.focus();
  first.dispatchEvent(new Event('compositionstart', { bubbles: true }));
  first.value = '1';
  first.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();

  assert.equal(value.value, '');
  assert.equal(first.value, '1');
  assert.equal(document.activeElement, first);

  first.dispatchEvent(new Event('compositionend', { bubbles: true }));
  await Promise.resolve();
  await nextTick();

  assert.equal(value.value, '1');
  assert.equal(inputs[0].value, '1');
  assert.equal(document.activeElement, inputs[1]);

  app.unmount();
  host.remove();
});
