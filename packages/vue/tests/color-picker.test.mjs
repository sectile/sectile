import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { ColorPickerAlphaSlider, ColorPickerArea, ColorPickerAreaThumb, ColorPickerAreaSurface, ColorPickerChannelInput, ColorPickerControl, ColorPickerCoordinateInput, ColorPickerCoordinateSlider, ColorPickerFormatTrigger, ColorPickerHueSlider, ColorPickerLabel, ColorPickerNativeInput, ColorPickerRoot, ColorPickerSwatch, ColorPickerTextInput, ColorPickerValueText } from '../.verification-dist/color-picker.js';

test('Vue ColorPicker SSR renders native input kinds, values and policy state before mounting', async () => {
  const parts = [ColorPickerNativeInput, ColorPickerTextInput, ColorPickerHueSlider, ColorPickerAlphaSlider];
  const html = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { defaultValue: '#33669980', defaultDraft: 'unfinished', readonly: true }, { default: () => parts.map(part => h(part)) }) }));
  const input = part => html.match(new RegExp(`<input\\b[^>]*data-part="${part}"[^>]*>`))?.[0];
  assert.match(input('native-input'), /type="color"/); assert.match(input('native-input'), /value="#336699"/);
  assert.match(input('text-input'), /type="text"/); assert.match(input('text-input'), /value="unfinished"/); assert.match(input('text-input'), /inputmode="text"/); assert.match(input('text-input'), /aria-invalid="true"/); assert.match(input('text-input'), /readonly/);
  assert.match(input('hue-slider'), /type="range"/); assert.match(input('hue-slider'), /min="0"/); assert.match(input('hue-slider'), /max="360"/); assert.match(input('hue-slider'), /value="210"/);
  assert.match(input('alpha-slider'), /type="range"/); assert.match(input('alpha-slider'), /max="100"/); assert.match(input('alpha-slider'), /value="50"/);
  const opaque = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { defaultValue: '#336699', allowAlpha: false }, { default: () => h(ColorPickerAlphaSlider) }) }));
  assert.match(opaque, /disabled/); assert.match(opaque, /value="100"/);
});

test('Vue ColorPicker SSR preserves localized caller names and labelledby', async () => {
  const parts = [ColorPickerChannelInput, ColorPickerCoordinateInput, ColorPickerArea, ColorPickerHueSlider, ColorPickerAlphaSlider, ColorPickerSwatch];
  const html = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { 'aria-label': '브랜드 색상' }, { default: () => parts.map((part, index) => h(part, {
    ...(index === 0 ? { channel: 'red' } : index === 1 ? { format: 'rgb', coordinate: 'red' } : {}), 'aria-label': `색상 부분 ${index}`, 'aria-valuetext': '사용자 설명',
  })) }) }));
  assert.match(html, /aria-label="브랜드 색상"/); for (let index = 0; index < parts.length; index++) assert.ok(html.includes(`aria-label="색상 부분 ${index}"`));
  const labelled = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, {}, { default: () => h(ColorPickerArea, { 'aria-labelledby': 'color-label' }) }) }));
  assert.match(labelled, /aria-labelledby="color-label"/); assert.doesNotMatch(labelled, /aria-label="Color saturation/);
});

test('Vue ColorPicker SSR projects the accepted color and each coordinate part own model', async () => {
  let state;
  const html = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { defaultValue: '#ff0000' }, { default: current => {
    state = current; return [h(ColorPickerSwatch), h(ColorPickerArea, {}, () => h(ColorPickerAreaSurface, {}, () => h(ColorPickerAreaThumb))),
      h(ColorPickerCoordinateInput, { format: 'hsv', coordinate: 'saturation' }), h(ColorPickerCoordinateInput, { format: 'rgb', coordinate: 'red' })];
  } }) }));
  assert.equal(state.cssColor, 'rgb(255, 0, 0)'); assert.deepEqual(state.area, { x: 1, y: 1, hue: 0, alpha: 1 });
  assert.match(html, /data-part="area-surface"/);
  assert.match(html, /--sectile-color-area-x:100%/); assert.match(html, /--sectile-color-area-y:0%/);
  assert.match(html, /min="0" max="100" step="1" value="100"/);
  assert.match(html, /min="0" max="255" step="1" value="255"/);
  await assert.rejects(renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { defaultValue: 'not a color' }) })), /color/i);
  await assert.rejects(renderToString(createSSRApp({ render: () => h(ColorPickerRoot, {}, { default: () => h(ColorPickerCoordinateInput, { format: 'unknown', coordinate: 'red' }) }) })), /format/i);
});

test('Vue color picker renders native form, channel inputs, and extended format triggers with headless parts', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { defaultValue: '#33669980', name: 'accent', label: 'Accent' }, { default: () => [h(ColorPickerLabel, null, () => 'Accent'), h(ColorPickerControl, null, () => [h(ColorPickerSwatch), h(ColorPickerNativeInput), h(ColorPickerTextInput), h(ColorPickerChannelInput, { channel: 'alpha' }), h(ColorPickerFormatTrigger, { format: 'rgb' }, () => 'RGB'), h(ColorPickerFormatTrigger, { format: 'oklch' }, () => 'OKLCH'), h(ColorPickerValueText)])] }) }));
  assert.match(html, /data-scope="color-picker"/); assert.match(html, /data-part="native-input"/); assert.match(html, /data-channel="alpha"/); assert.match(html, /type="hidden"/); assert.match(html, /name="accent"/);
  assert.match(html, />OKLCH</);
});

test('Vue color picker renders visual picker and model coordinate parts', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { defaultValue: '#ff000080', allowAlpha: true }, { default: () => [
    h(ColorPickerArea, null, () => h(ColorPickerAreaThumb)),
    h(ColorPickerHueSlider), h(ColorPickerAlphaSlider),
    h(ColorPickerCoordinateInput, { format: 'hsv', coordinate: 'saturation' }),
    h(ColorPickerCoordinateSlider, { format: 'rgb', coordinate: 'red' }),
  ] }) }));
  assert.match(html, /data-part="area"/); assert.match(html, /data-part="area-thumb"/); assert.match(html, /data-part="hue-slider"/); assert.match(html, /data-part="alpha-slider"/); assert.match(html, /data-part="coordinate-input"/); assert.match(html, /data-coordinate="saturation"/); assert.match(html, /data-part="coordinate-slider"/); assert.match(html, /type="range"/); assert.match(html, /data-format="rgb"/);
});
