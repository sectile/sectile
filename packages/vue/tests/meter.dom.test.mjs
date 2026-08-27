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
const { MeterIndicator, MeterRoot, MeterValueText } = await import('../dist/meter.js');

test('Vue Meter reconciles controlled props without owning value changes', async () => {
  const value = ref('10');
  const host = document.createElement('div');
  const app = createApp({
    render: () => h(MeterRoot, { value: value.value, label: 'Quota' }, {
      default: () => [h(MeterIndicator), h(MeterValueText)],
    }),
  });
  app.mount(host);
  assert.equal(host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow'), '10');
  value.value = '75';
  await nextTick();
  assert.equal(host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow'), '75');
  assert.equal(host.querySelector('[data-part="value-text"]')?.textContent, '75');
  app.unmount();
});

test('Vue Meter hydrates exact semantics and reconciles later controlled values', async () => {
  const value = ref('0.1');
  const component = {
    render: () => h(MeterRoot, {
      value: value.value,
      min: '0',
      max: '0.3',
      label: 'Signal',
    }, { default: () => [h(MeterIndicator), h(MeterValueText)] }),
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
  assert.equal(host.querySelector('[role="meter"]')?.getAttribute('data-percentage'), '33.333333333333');
  value.value = '0.2';
  await nextTick();
  assert.equal(host.querySelector('[role="meter"]')?.getAttribute('aria-valuenow'), '0.2');
  app.unmount();
  host.remove();
});
