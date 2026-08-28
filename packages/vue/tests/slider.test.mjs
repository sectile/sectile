import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '../.verification-dist/slider.js';

test('Vue slider projects an exact decimal value and compound parts', async () => {
  const app = createSSRApp({
    render: () => h(SliderRoot, { min: '0', max: '1', step: '0.1', defaultValue: '0.4', name: 'opacity' }, {
      default: () => h(SliderTrack, null, { default: () => [h(SliderRange), h(SliderThumb)] }),
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /data-part="track"/);
  assert.match(html, /data-part="range"/);
  assert.match(html, /role="slider"/);
  assert.match(html, /aria-valuenow="0.4"/);
  assert.match(html, /type="range"/);
  assert.match(html, /name="opacity"/);
});
