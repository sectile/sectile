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

const { createApp, h, nextTick } = await import('vue');
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
