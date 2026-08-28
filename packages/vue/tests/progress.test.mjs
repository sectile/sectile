import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { ProgressIndicator, ProgressRoot, ProgressTrack, ProgressValueText } from '../.verification-dist/progress.js';

test('Vue Progress renders exact determinate SSR semantics and compound parts', async () => {
  let slot;
  const app = createSSRApp({
    render: () => h(ProgressRoot, {
      value: 2.5e-7,
      max: 1e-6,
      label: 'Upload',
      formatValue: (value) => `${value} bytes`,
      as: 'section',
    }, {
      default: (state) => {
        slot = state;
        return h(ProgressTrack, null, { default: () => [h(ProgressIndicator), h(ProgressValueText)] });
      },
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /^<section/u);
  assert.match(html, /role="progressbar"/u);
  assert.match(html, /aria-label="Upload"/u);
  assert.match(html, /aria-valuenow="0.00000025"/u);
  assert.match(html, /aria-valuetext="0.00000025 bytes"/u);
  assert.match(html, /data-part="track"/u);
  assert.match(html, /data-part="indicator"/u);
  assert.match(html, /data-part="value-text"[^>]*>0.00000025 bytes/u);
  assert.equal(slot.percentage, 25);
  assert.equal(slot.status, 'progressing');
});

test('Vue Progress renders indeterminate semantics without value attributes', async () => {
  let slot;
  const html = await renderToString(createSSRApp({
    render: () => h(ProgressRoot, { label: 'Loading' }, {
      default: (state) => {
        slot = state;
        return [h(ProgressIndicator), h(ProgressValueText)];
      },
    }),
  }));
  assert.doesNotMatch(html, /aria-valuenow/u);
  assert.doesNotMatch(html, /aria-valuetext/u);
  assert.doesNotMatch(html, /data-percentage/u);
  assert.equal(slot.value, null);
  assert.equal(slot.valueText, null);
  assert.equal(slot.percentage, null);
  assert.equal(slot.status, 'indeterminate');
});

test('Vue Progress parts require a root context', async () => {
  await assert.rejects(
    () => renderToString(createSSRApp({ render: () => h(ProgressIndicator) })),
    /must be used inside ProgressRoot/u,
  );
});
