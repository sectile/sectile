import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
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
const {
  MeterGroupIndicator,
  MeterGroupItem,
  MeterGroupItemLabel,
  MeterGroupList,
  MeterGroupRoot,
  MeterGroupSegment,
  MeterGroupTrack,
} = await import('../.verification-dist/meter-group.js');

function content(items) {
  return {
    default: (root) => [
      h(MeterGroupTrack, null, {
        default: () => root.segments.map((segment) => h(MeterGroupSegment, {
          id: segment.id,
          key: segment.id,
        }, { default: () => h(MeterGroupIndicator) })),
      }),
      h(MeterGroupList, null, {
        default: () => items.map((item) => h(MeterGroupItem, { id: item.id, key: item.id }, {
          default: () => h(MeterGroupItemLabel),
        })),
      }),
    ],
  };
}

test('Vue MeterGroup reconciles controlled replacement and reordering by id', async () => {
  const items = ref([
    { id: 'a', value: '10', label: 'Alpha' },
    { id: 'b', value: '20', label: 'Beta' },
  ]);
  const host = document.createElement('div');
  const app = createApp({
    render: () => h(MeterGroupRoot, { items: items.value, max: '100', label: 'Capacity' }, content(items.value)),
  });
  app.mount(host);
  assert.deepEqual(
    [...host.querySelectorAll('[role="meter"]')].map((element) => element.getAttribute('data-id')),
    ['a', 'b'],
  );
  items.value = [
    { id: 'b', value: '30', label: 'Beta' },
    { id: 'a', value: '5', label: 'Alpha' },
  ];
  await nextTick();
  const segments = [...host.querySelectorAll('[role="meter"]')];
  assert.deepEqual(segments.map((element) => element.getAttribute('data-id')), ['b', 'a']);
  assert.equal(segments[0].getAttribute('aria-valuenow'), '30');
  assert.equal(segments[1].getAttribute('data-start-percentage'), '30');
  assert.deepEqual(
    [...host.querySelectorAll('[data-part="item-label"]')].map((element) => element.textContent),
    ['Beta', 'Alpha'],
  );
  app.unmount();
});

test('Vue MeterGroup hydrates stable ids and reconciles later values', async () => {
  const items = ref([
    { id: 'a', value: '0.1', label: 'Alpha' },
    { id: 'b', value: '0.2', label: 'Beta' },
  ]);
  const component = {
    render: () => h(MeterGroupRoot, { items: items.value, max: '0.6', label: 'Capacity' }, content(items.value)),
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
  assert.equal(host.querySelector('[data-id="b"]')?.getAttribute('data-start-percentage'), '16.666666666667');
  items.value = [
    { id: 'a', value: '0.2', label: 'Alpha' },
    { id: 'b', value: '0.1', label: 'Beta' },
  ];
  await nextTick();
  assert.equal(host.querySelector('[role="meter"][data-id="b"]')?.getAttribute('data-start-percentage'), '33.333333333333');
  app.unmount();
  host.remove();
});
