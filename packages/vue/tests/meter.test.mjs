import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { MeterIndicator, MeterRoot, MeterTrack, MeterValueText } from '../dist/meter.js';

test('Vue Meter renders exact SSR semantics and compound parts', async () => {
  let slot;
  const app = createSSRApp({
    render: () => h(MeterRoot, {
      value: 2.5e-7,
      min: 0,
      max: 1e-6,
      label: 'Signal',
      formatValue: (value) => `${value} volts`,
      as: 'section',
    }, {
      default: (state) => {
        slot = state;
        return h(MeterTrack, null, { default: () => [h(MeterIndicator), h(MeterValueText)] });
      },
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /^<section/u);
  assert.match(html, /role="meter"/u);
  assert.match(html, /aria-label="Signal"/u);
  assert.match(html, /aria-valuenow="0.00000025"/u);
  assert.match(html, /aria-valuetext="0.00000025 volts"/u);
  assert.match(html, /data-part="track"/u);
  assert.match(html, /data-part="indicator"/u);
  assert.match(html, /data-part="value-text"[^>]*>0.00000025 volts/u);
  assert.equal(slot.percentage, 25);
  assert.equal(slot.zone, 'optimum');
});

test('Vue Meter parts require a root context', async () => {
  await assert.rejects(
    () => renderToString(createSSRApp({ render: () => h(MeterIndicator) })),
    /must be used inside MeterRoot/u,
  );
});
