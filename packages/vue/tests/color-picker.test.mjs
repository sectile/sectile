import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { ColorPickerChannelInput, ColorPickerControl, ColorPickerFormatTrigger, ColorPickerLabel, ColorPickerNativeInput, ColorPickerRoot, ColorPickerSwatch, ColorPickerTextInput, ColorPickerValueText } from '../dist/color-picker.js';

test('Vue color picker renders native form and channel inputs with headless parts', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(ColorPickerRoot, { defaultValue: '#33669980', name: 'accent', label: 'Accent' }, { default: () => [h(ColorPickerLabel, null, () => 'Accent'), h(ColorPickerControl, null, () => [h(ColorPickerSwatch), h(ColorPickerNativeInput), h(ColorPickerTextInput), h(ColorPickerChannelInput, { channel: 'alpha' }), h(ColorPickerFormatTrigger, { format: 'rgb' }, () => 'RGB'), h(ColorPickerValueText)])] }) }));
  assert.match(html, /data-scope="color-picker"/); assert.match(html, /data-part="native-input"/); assert.match(html, /data-channel="alpha"/); assert.match(html, /type="hidden"/); assert.match(html, /name="accent"/);
});
