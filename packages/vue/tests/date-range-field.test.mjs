import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } from '../.verification-dist/date-range-field.js';

test('Vue date range field renders two native, timezone-free inputs', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(DateRangeFieldRoot, {
      defaultValue: {
        start: { year: 2026, month: 8, day: 22 },
        end: { year: 2026, month: 8, day: 28 },
      },
      readonly: true,
    }, {
      default: () => [
        h(DateRangeFieldStartInput, { name: 'start' }),
        h(DateRangeFieldEndInput, { name: 'end' }),
      ],
    }),
  }));
  assert.match(html, /data-part="start-input"/);
  assert.match(html, /value="2026-08-22"/);
  assert.match(html, /data-part="end-input"/);
  assert.match(html, /value="2026-08-28"/);
  assert.equal((html.match(/readonly/g) ?? []).length >= 2, true);
  assert.match(html, /name="start"/);
  assert.match(html, /name="end"/);
});
