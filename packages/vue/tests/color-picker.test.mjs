import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { ColorPickerAlphaSlider, ColorPickerArea, ColorPickerAreaThumb, ColorPickerChannelInput, ColorPickerControl, ColorPickerCoordinateInput, ColorPickerCoordinateSlider, ColorPickerFormatTrigger, ColorPickerHueSlider, ColorPickerLabel, ColorPickerNativeInput, ColorPickerRoot, ColorPickerSwatch, ColorPickerTextInput, ColorPickerValueText } from '../dist/color-picker.js';

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
