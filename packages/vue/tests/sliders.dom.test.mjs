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
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  PointerEvent: browserWindow.PointerEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  FocusEvent: browserWindow.FocusEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick } = await import('vue');
const {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} = await import('../dist/slider.js');
const {
  MultiThumbSliderRange,
  MultiThumbSliderRoot,
  MultiThumbSliderThumb,
  MultiThumbSliderTrack,
} = await import('../dist/multi-thumb-slider.js');

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
