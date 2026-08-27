import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import {
  MeterGroupIndicator,
  MeterGroupItem,
  MeterGroupItemIndicator,
  MeterGroupItemLabel,
  MeterGroupItemValue,
  MeterGroupList,
  MeterGroupRoot,
  MeterGroupSegment,
  MeterGroupTrack,
  MeterGroupValueText,
} from '../dist/meter-group.js';

test('Vue MeterGroup renders exact SSR semantics, keyed segments, and a presentational legend', async () => {
  let rootSlot;
  let segmentSlot;
  let itemSlot;
  const items = [
    { id: 'storage', value: '0.1', label: 'Storage' },
    { id: 'logs', value: '0.2', label: 'Logs' },
  ];
  const app = createSSRApp({
    render: () => h(MeterGroupRoot, {
      items,
      max: '0.6',
      label: 'Capacity',
      formatValue: (value, entry) => `${entry.label}: ${value} GB`,
      formatTotal: (total, max) => `${total} of ${max} GB`,
      as: 'section',
    }, {
      default: (root) => {
        rootSlot = root;
        return [
          h(MeterGroupValueText),
          h(MeterGroupTrack, null, {
            default: () => root.segments.map((segment) => h(MeterGroupSegment, {
              id: segment.id,
              key: segment.id,
            }, {
              default: (current) => {
                if (current.id === 'storage') segmentSlot = current;
                return h(MeterGroupIndicator);
              },
            })),
          }),
          h(MeterGroupList, null, {
            default: () => root.segments.map((segment) => h(MeterGroupItem, {
              id: segment.id,
              key: segment.id,
            }, {
              default: (current) => {
                if (current.id === 'logs') itemSlot = current;
                return [h(MeterGroupItemIndicator), h(MeterGroupItemLabel), h(MeterGroupItemValue)];
              },
            })),
          }),
        ];
      },
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /^<section/u);
  assert.match(html, /role="group"/u);
  assert.match(html, /aria-label="Capacity"/u);
  assert.equal((html.match(/role="meter"/gu) ?? []).length, 2);
  assert.match(html, /aria-label="Storage"/u);
  assert.match(html, /aria-valuetext="Storage: 0.1 GB"/u);
  assert.match(html, /--sectile-meter-group-start-percentage:16.666666666667%/u);
  assert.match(html, /data-part="value-text"[^>]*>0.3 of 0.6 GB/u);
  assert.match(html, /<ul[^>]*aria-hidden="true"[^>]*data-part="list"/u);
  assert.match(html, /data-part="item-label"[^>]*>Logs/u);
  assert.equal(rootSlot.total, '0.3');
  assert.equal(rootSlot.remaining, '0.3');
  assert.equal(rootSlot.percentage, 50);
  assert.equal(segmentSlot.start, '0');
  assert.equal(segmentSlot.endPercentage, 16.666666666667);
  assert.deepEqual(itemSlot, rootSlot.segments[1]);
});

test('Vue MeterGroup keyed parts reject missing context and unavailable ids', async () => {
  await assert.rejects(
    () => renderToString(createSSRApp({ render: () => h(MeterGroupIndicator) })),
    /must be used inside MeterGroupSegment or MeterGroupItem/u,
  );
  await assert.rejects(
    () => renderToString(createSSRApp({
      render: () => h(MeterGroupRoot, {
        items: [{ id: 'a', value: '1', label: 'A' }],
      }, { default: () => h(MeterGroupSegment, { id: 'missing' }) }),
    })),
    /id missing is unavailable/u,
  );
});
