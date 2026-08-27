import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  SVGElement: browserWindow.SVGElement,
});

const { createApp, createSSRApp, h, nextTick, ref } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { ProgressIndicator, ProgressRoot, ProgressValueText } = await import('../dist/progress.js');

test('Vue Progress reconciles determinate and indeterminate controlled props', async () => {
  const value = ref('10');
  const host = document.createElement('div');
  const app = createApp({
    render: () => h(ProgressRoot, { value: value.value, label: 'Upload' }, {
      default: () => [h(ProgressIndicator), h(ProgressValueText)],
    }),
  });
  app.mount(host);
  assert.equal(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), '10');
  value.value = null;
  await nextTick();
  assert.equal(host.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow'), false);
  assert.equal(host.querySelector('[data-part="indicator"]')?.getAttribute('data-status'), 'indeterminate');
  assert.equal(host.querySelector('[data-part="value-text"]')?.textContent, '');
  app.unmount();
});

test('Vue Progress hydrates exact semantics and reconciles later values', async () => {
  const value = ref('0.1');
  const component = {
    render: () => h(ProgressRoot, { value: value.value, max: '0.3', label: 'Upload' }, {
      default: () => [h(ProgressIndicator), h(ProgressValueText)],
    }),
  };
  const host = document.createElement('div');
  host.innerHTML = await renderToString(createSSRApp(component));
  document.body.append(host);
  const warnings = [];
  const app = createSSRApp(component);
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host);
  await nextTick();
  assert.deepEqual(warnings, []);
  assert.equal(host.querySelector('[role="progressbar"]')?.getAttribute('data-percentage'), '33.333333333333');
  value.value = '0.3';
  await nextTick();
  assert.equal(host.querySelector('[role="progressbar"]')?.getAttribute('data-status'), 'complete');
  app.unmount();
  host.remove();
});
