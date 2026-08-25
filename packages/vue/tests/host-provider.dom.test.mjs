import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  Element: window.Element,
  Node: window.Node,
  MutationObserver: window.MutationObserver,
  Event: window.Event,
});

const { createApp, h } = await import('vue');
const { HostProvider } = await import('../dist/host-provider.js');
const { DialogContent, DialogPortal, DialogRoot } = await import('../dist/dialog.js');

test('HostProvider supplies the default portal target and local targets override it', () => {
  const host = document.createElement('div');
  const suppliedTarget = document.createElement('div');
  const localTarget = document.createElement('div');
  document.body.append(host, suppliedTarget, localTarget);

  const app = createApp({
    render: () => h(HostProvider, { portalTarget: suppliedTarget }, {
      default: () => [
        h(DialogRoot, { defaultOpen: true }, {
          default: () => h(DialogPortal, null, {
            default: () => h(DialogContent, null, { default: () => 'Supplied target' }),
          }),
        }),
        h(DialogRoot, { defaultOpen: true }, {
          default: () => h(DialogPortal, { to: localTarget }, {
            default: () => h(DialogContent, null, { default: () => 'Local target' }),
          }),
        }),
      ],
    }),
  });
  app.mount(host);

  assert.match(suppliedTarget.textContent, /Supplied target/);
  assert.doesNotMatch(suppliedTarget.textContent, /Local target/);
  assert.match(localTarget.textContent, /Local target/);

  app.unmount();
  host.remove();
  suppliedTarget.remove();
  localTarget.remove();
});
