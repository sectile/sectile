import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { RatingClear, RatingIndicator, RatingItem, RatingRoot } from '../dist/rating.js';
import { StepperContent, StepperList, StepperRoot, StepperStep } from '../dist/stepper.js';

test('Vue rating specializes radio semantics and exposes an optional clear control', async () => {
  const app = createSSRApp({
    render: () => h(RatingRoot, { items: ['1', '2', '3'], defaultValue: '2', clearable: true }, {
      default: () => [
        ...['1', '2', '3'].map((value) => h(RatingItem, { value }, {
          default: () => [value, h(RatingIndicator, null, { default: () => 'selected' })],
        })),
        h(RatingClear, null, { default: () => 'Clear' }),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /aria-roledescription="rating"/);
  assert.match(html, /aria-label="2 rating"/);
  assert.match(html, /data-part="clear"/);
});

test('Vue stepper reuses linked tab semantics with manual activation', async () => {
  const app = createSSRApp({
    render: () => h(StepperRoot, { items: ['account', 'confirm'], defaultValue: 'account' }, {
      default: () => [
        h(StepperList, null, {
          default: () => [
            h(StepperStep, { value: 'account' }, { default: () => 'Account' }),
            h(StepperStep, { value: 'confirm' }, { default: () => 'Confirm' }),
          ],
        }),
        h(StepperContent, { value: 'account' }, { default: () => 'Account form' }),
        h(StepperContent, { value: 'confirm' }, { default: () => 'Confirmation' }),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /aria-roledescription="stepper"/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tabpanel"/);
});
