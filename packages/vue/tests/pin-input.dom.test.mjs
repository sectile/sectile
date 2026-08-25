import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'http://localhost/' });
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
const { PinInputInput, PinInputRoot } = await import('../dist/pin-input.js');

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
