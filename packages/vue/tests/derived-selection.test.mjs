import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { RatingClear, RatingIndicator, RatingItem, RatingRoot } from '../.verification-dist/rating.js';
import {
  StepperContent,
  StepperList,
  StepperNext,
  StepperPrevious,
  StepperRoot,
  StepperStep,
} from '../.verification-dist/stepper.js';

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
  assert.equal((html.match(/data-scope="rating"/g) ?? []).length, 8);
  assert.doesNotMatch(html, /data-scope="radio-group"/);
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
        h(StepperPrevious, null, { default: ({ targetValue }) => targetValue ?? 'Start' }),
        h(StepperNext, null, { default: ({ targetValue }) => targetValue ?? 'Complete' }),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /aria-roledescription="stepper"/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tabpanel"/);
  assert.equal((html.match(/data-scope="stepper"/g) ?? []).length, 8);
  assert.equal((html.match(/data-part="step"/g) ?? []).length, 2);
  assert.match(html, /<button[^>]*disabled[^>]*data-part="previous"/);
  assert.match(html, /data-part="next"[^>]*data-target-value="confirm"/);
  assert.doesNotMatch(html, /data-scope="tabs"|data-part="trigger"/);
});
