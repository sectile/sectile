import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, defineComponent, h } from 'vue';
import {
  TemporalProvider,
  useTemporalReferenceDate,
} from '../dist/temporal.js';

const ReferenceDateOutput = defineComponent({
  setup() {
    const referenceDate = useTemporalReferenceDate();
    return () => h(
      'output',
      null,
      `${referenceDate.value.year}-${referenceDate.value.month}-${referenceDate.value.day}`,
    );
  },
});

test('TemporalProvider supplies a deterministic reference date to its subtree', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(TemporalProvider, {
      referenceDate: { year: 2026, month: 8, day: 28 },
    }, {
      default: () => h(ReferenceDateOutput),
    }),
  }));

  assert.match(html, /<output>2026-8-28<\/output>/);
});
