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
  InputEvent: browserWindow.InputEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick } = await import('vue');
const { DateTimeField } = await import('../dist/date-time-field.js');

test('native date-time field mounts and commits without text selection APIs', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(DateTimeField, {
      native: true,
      defaultValue: {
        date: { year: 2026, month: 8, day: 22 },
        time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
      },
      'onUpdate:modelValue': (value) => updates.push(value),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.equal(input?.type, 'datetime-local');
  assert.equal(input?.value, '2026-08-22T09:30');

  input.value = '2026-08-23T10:45';
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  input.dispatchEvent(new Event('blur'));
  await nextTick();

  assert.deepEqual(updates.at(-1), {
    date: { year: 2026, month: 8, day: 23 },
    time: { hour: 10, minute: 45, second: 0, millisecond: 0 },
  });

  app.unmount();
  host.remove();
});
