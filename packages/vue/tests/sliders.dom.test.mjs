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
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  PointerEvent: browserWindow.PointerEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  FocusEvent: browserWindow.FocusEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref, shallowRef } = await import('vue');
const {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} = await import('../.verification-dist/slider.js');
const {
  MultiThumbSliderRange,
  MultiThumbSliderRoot,
  MultiThumbSliderThumb,
  MultiThumbSliderTrack,
} = await import('../.verification-dist/multi-thumb-slider.js');
const {
  WindowSplitterHandle,
  WindowSplitterPane,
  WindowSplitterRoot,
} = await import('../.verification-dist/window-splitter.js');

async function settle() {
  await nextTick();
  await nextTick();
}

function horizontalTrack(element) {
  element.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 10,
    width: 100, height: 10, toJSON: () => ({}),
  });
}

test('Vue slider responds to keyboard and track pointer input', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(SliderRoot, {
      defaultValue: 40,
      min: 0,
      max: 100,
      step: 1,
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: () => h(SliderTrack, null, {
        default: () => [h(SliderRange), h(SliderThumb)],
      }),
    }),
  });

  app.mount(host);
  await settle();
  const track = host.querySelector('[data-part="track"]');
  const thumb = host.querySelector('[data-part="thumb"]');
  assert.ok(track instanceof HTMLElement);
  assert.ok(thumb instanceof HTMLElement);
  horizontalTrack(track);

  thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  assert.equal(thumb.getAttribute('aria-valuenow'), '41');

  track.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    clientX: 75,
    clientY: 5,
    pointerId: 1,
  }));
  await settle();
  assert.equal(thumb.getAttribute('aria-valuenow'), '75');
  assert.deepEqual(updates, ['41', '75']);

  app.unmount();
  host.remove();
});

test('Vue slider reconfigures interaction when readonly and disabled change', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const readonly = ref(true);
  const disabled = ref(false);
  const updates = [];
  const app = createApp({
    render: () => h(SliderRoot, {
      defaultValue: 40,
      readonly: readonly.value,
      disabled: disabled.value,
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: () => h(SliderTrack, null, {
        default: () => [h(SliderRange), h(SliderThumb)],
      }),
    }),
  });

  app.mount(host);
  await settle();
  const thumb = host.querySelector('[data-part="thumb"]');
  assert.ok(thumb instanceof HTMLElement);

  thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  assert.equal(thumb.getAttribute('aria-valuenow'), '40');
  assert.deepEqual(updates, []);

  readonly.value = false;
  await settle();
  thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  assert.equal(thumb.getAttribute('aria-valuenow'), '41');
  assert.deepEqual(updates, ['41']);

  disabled.value = true;
  await settle();
  thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  assert.equal(thumb.getAttribute('aria-valuenow'), '41');
  assert.deepEqual(updates, ['41']);

  disabled.value = false;
  await settle();
  thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  assert.equal(thumb.getAttribute('aria-valuenow'), '42');
  assert.deepEqual(updates, ['41', '42']);

  app.unmount();
  host.remove();
});

test('Vue multi-thumb slider keeps both thumbs adjustable', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const thumbs = ['minimum', 'maximum'];
  const app = createApp({
    render: () => h(MultiThumbSliderRoot, {
      thumbs,
      defaultValue: [30, 72],
      min: 0,
      max: 100,
      step: 1,
      'onUpdate:modelValue': (value) => updates.push([...value]),
    }, {
      default: () => h(MultiThumbSliderTrack, null, {
        default: () => [
          h(MultiThumbSliderRange),
          ...thumbs.map((value) => h(MultiThumbSliderThumb, { value })),
        ],
      }),
    }),
  });

  app.mount(host);
  await settle();
  const track = host.querySelector('[data-part="track"]');
  const renderedThumbs = [...host.querySelectorAll('[data-part="thumb"]')];
  assert.ok(track instanceof HTMLElement);
  assert.equal(renderedThumbs.length, 2);
  horizontalTrack(track);

  renderedThumbs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  assert.equal(renderedThumbs[0].getAttribute('aria-valuenow'), '31');
  assert.equal(renderedThumbs[1].getAttribute('aria-valuenow'), '72');

  track.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    clientX: 80,
    clientY: 5,
    pointerId: 2,
  }));
  await settle();
  assert.equal(renderedThumbs[1].getAttribute('aria-valuenow'), '80');
  assert.deepEqual(updates, [['31', '72'], ['31', '80']]);

  app.unmount();
  host.remove();
});

test('Vue multi-thumb slider rebinds replaced tracks and live presentation without retaining old pointer targets', async () => {
  const host = document.createElement('div'); document.body.append(host); const trackKey = shallowRef(0), updates = [];
  const options = shallowRef({ orientation: 'horizontal', getThumbLabel: id => 'Before ' + id, formatValue: value => value + ' before' });
  const app = createApp({ render: () => h(MultiThumbSliderRoot, { thumbs: ['low', 'high'], defaultValue: [20, 80], ...options.value,
    'onUpdate:modelValue': values => updates.push([...values]),
  }, { default: () => [h(MultiThumbSliderTrack, { key: trackKey.value }), h(MultiThumbSliderThumb, { value: 'low' }), h(MultiThumbSliderThumb, { value: 'high' })] }) });
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  const press = (element, x, y = 5) => { element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, clientX: x, clientY: y, pointerId: 1 })); element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); };
  try {
    app.mount(host); await drain(); const retired = host.querySelector('[data-part="track"]'); horizontalTrack(retired);
    host.querySelector('[data-sectile-multi-thumb="high"]').focus();
    trackKey.value++; await drain(); const track = host.querySelector('[data-part="track"]'); horizontalTrack(track);
    const focusedHigh = host.querySelector('[data-sectile-multi-thumb="high"]');
    focusedHigh.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await drain();
    assert.equal(focusedHigh.getAttribute('aria-valuenow'), '81');
    press(track, 60); await drain(); assert.deepEqual(updates.at(-1), ['20', '60']);
    const count = updates.length; press(retired, 95); await drain(); assert.equal(updates.length, count);
    options.value = { orientation: 'vertical', getThumbLabel: id => 'After ' + id, formatValue: value => value + ' after' }; await drain();
    track.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10, height: 100, bottom: 100 });
    press(track, 5, 25); await drain(); const high = host.querySelector('[data-sectile-multi-thumb="high"]');
    assert.equal(high.getAttribute('aria-valuenow'), '75'); assert.equal(high.getAttribute('aria-label'), 'After high'); assert.equal(high.getAttribute('aria-valuetext'), '75 after');
    options.value = { ...options.value, as: 'section' }; await drain();
    assert.equal(host.querySelector('[data-part="root"]').tagName, 'SECTION');
    const replacement = host.querySelector('[data-part="track"]');
    replacement.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10, height: 100, bottom: 100 });
    press(replacement, 5, 10); await drain(); assert.deepEqual(updates.at(-1), ['20', '90']);
    const replacedCount = updates.length; press(track, 5, 50); await drain(); assert.equal(updates.length, replacedCount);
    trackKey.value++; app.unmount(); await drain(); const before = updates.length; press(track, 95); await drain(); assert.equal(updates.length, before);
  } finally { if (host.querySelector('[data-part="root"]')) app.unmount(); host.remove(); }
});

test('Vue multi-thumb slider retires removed thumb projection and registers a replacement element', async () => {
  const host = document.createElement('div'); document.body.append(host); const visible = shallowRef(true), tag = shallowRef('span');
  const app = createApp({ render: () => h(MultiThumbSliderRoot, { thumbs: ['low', 'high'], defaultValue: [20, 80] }, {
    default: () => [visible.value ? h(MultiThumbSliderThumb, { value: 'low', as: tag.value }) : null, h(MultiThumbSliderThumb, { value: 'high' })],
  }) });
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  const increment = element => { element.focus(); element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); };
  try {
    app.mount(host); await drain(); const retired = host.querySelector('[data-sectile-multi-thumb="low"]'), before = retired.getAttribute('aria-valuemax');
    visible.value = false; await drain(); increment(host.querySelector('[data-sectile-multi-thumb="high"]')); await drain();
    assert.equal(retired.getAttribute('aria-valuemax'), before);
    visible.value = true; tag.value = 'button'; await drain(); const replacement = host.querySelector('[data-sectile-multi-thumb="low"]');
    increment(replacement); await drain(); assert.equal(replacement.getAttribute('aria-valuenow'), '21');
    const value = replacement.getAttribute('aria-valuenow'); app.unmount(); increment(replacement); await drain(); assert.equal(replacement.getAttribute('aria-valuenow'), value);
  } finally { if (host.querySelector('[data-part="root"]')) app.unmount(); host.remove(); }
});

test('Vue multi-thumb slider accepts simultaneous controlled range and values against the new owner', async () => {
  const host = document.createElement('div'); document.body.append(host); const options = shallowRef({ thumbs: ['low', 'high'], max: 100, modelValue: [20, 80] });
  const app = createApp({ render: () => h(MultiThumbSliderRoot, options.value, {
    default: () => options.value.thumbs.map(value => h(MultiThumbSliderThumb, { value })),
  }) });
  try {
    app.mount(host); await settle(); options.value = { thumbs: ['start', 'end'], max: 200, modelValue: [40, 160] };
    for (let turn = 0; turn < 5; turn++) await nextTick();
    assert.equal(host.querySelector('[data-sectile-multi-thumb="end"]').getAttribute('aria-valuenow'), '160');
  } finally { app.unmount(); host.remove(); }
});

test('Vue window splitter updates its constrained surface with live range and orientation', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = shallowRef({ min: 20, max: 80, orientation: 'horizontal' });
  const updates = [];
  const app = createApp({ render: () => h(WindowSplitterRoot, {
    ...options.value, defaultValue: 50, 'onUpdate:modelValue': value => updates.push(value),
  }, { default: () => [h(WindowSplitterPane, { side: 'before' }), h(WindowSplitterHandle), h(WindowSplitterPane, { side: 'after' })] }) });
  try {
    app.mount(host); await settle();
    options.value = { min: 30, max: 70, orientation: 'vertical' };
    await settle();
    const track = host.querySelector('[data-constraint-track]'), handle = host.querySelector('[data-part="handle"]');
    assert.equal(track.style.insetBlockStart, '30%');
    assert.equal(track.style.insetBlockEnd, '30%');
    assert.equal(track.style.insetInlineStart, '');
    assert.equal(handle.getAttribute('aria-orientation'), 'vertical');
    track.getBoundingClientRect = () => ({ x: 0, y: 30, left: 0, top: 30, right: 10, bottom: 70,
      width: 10, height: 40, toJSON: () => ({}) });
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 60, pointerId: 9 }));
    await settle();
    assert.equal(handle.getAttribute('aria-valuenow'), '60');
    assert.deepEqual(updates, ['60']);
  } finally { app.unmount(); host.remove(); }
});

test('Vue window splitter drags against the complete pane surface', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(WindowSplitterRoot, {
      defaultValue: 35,
      min: 0,
      max: 100,
      step: 1,
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: () => [
        h(WindowSplitterPane, { side: 'before' }),
        h(WindowSplitterHandle),
        h(WindowSplitterPane, { side: 'after' }),
      ],
    }),
  });

  app.mount(host);
  await settle();
  const root = host.querySelector('[data-part="root"]');
  const track = host.querySelector('[data-constraint-track]');
  const handle = host.querySelector('[data-part="handle"]');
  assert.ok(root instanceof HTMLElement);
  assert.ok(track instanceof HTMLElement);
  assert.ok(handle instanceof HTMLElement);
  horizontalTrack(track);

  root.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    clientX: 60,
    clientY: 5,
    pointerId: 3,
  }));
  await settle();
  assert.equal(handle.getAttribute('aria-valuenow'), '35');

  handle.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    clientX: 72,
    clientY: 5,
    pointerId: 4,
  }));
  await settle();
  assert.equal(handle.getAttribute('aria-valuenow'), '72');
  assert.deepEqual(updates, ['72']);

  app.unmount();
  host.remove();
});

test('Vue window splitter keeps the visual separator inside min and max pane percentages', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(WindowSplitterRoot, {
      defaultValue: 34,
      min: 22,
      max: 72,
      step: 1,
    }, {
      default: () => [
        h(WindowSplitterPane, { side: 'before' }),
        h(WindowSplitterHandle),
        h(WindowSplitterPane, { side: 'after' }),
      ],
    }),
  });

  app.mount(host);
  await settle();
  const root = host.querySelector('[data-part="root"]');
  const track = host.querySelector('[data-constraint-track]');
  const handle = host.querySelector('[data-part="handle"]');
  assert.ok(root instanceof HTMLElement);
  assert.ok(track instanceof HTMLElement);
  assert.ok(handle instanceof HTMLElement);
  track.getBoundingClientRect = () => ({
    x: 22, y: 0, left: 22, top: 0, right: 72, bottom: 10,
    width: 50, height: 10, toJSON: () => ({}),
  });

  handle.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, clientX: 0, clientY: 5, pointerId: 5,
  }));
  await settle();
  assert.equal(handle.getAttribute('aria-valuenow'), '22');
  assert.match(root.getAttribute('style') ?? '', /--sectile-window-splitter-percentage:\s*22%/);

  handle.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, clientX: 100, clientY: 5, pointerId: 6,
  }));
  await settle();
  assert.equal(handle.getAttribute('aria-valuenow'), '72');
  assert.match(root.getAttribute('style') ?? '', /--sectile-window-splitter-percentage:\s*72%/);

  app.unmount();
  host.remove();
});
