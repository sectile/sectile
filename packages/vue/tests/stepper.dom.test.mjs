import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/stepper' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick } = await import('vue');
const {
  StepperContent,
  StepperList,
  StepperNext,
  StepperPrevious,
  StepperRoot,
  StepperStep,
} = await import('../.verification-dist/stepper.js');

test('Vue Stepper actions move across enabled steps and focus the activated step', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const items = ['account', 'delivery', 'review'];
  const app = createApp({
    render: () => h(StepperRoot, {
      items,
      defaultValue: 'account',
      disabledItems: ['delivery'],
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: () => [
        h(StepperList, null, {
          default: () => items.map((value) => h(StepperStep, { value }, { default: () => value })),
        }),
        ...items.map((value) => h(StepperContent, { value }, { default: () => `${value} content` })),
        h(StepperPrevious, null, { default: () => 'Back' }),
        h(StepperNext, null, { default: () => 'Continue' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();

  const previous = host.querySelector('[data-part="previous"]');
  const next = host.querySelector('[data-part="next"]');
  assert.ok(previous instanceof HTMLButtonElement);
  assert.ok(next instanceof HTMLButtonElement);
  assert.equal(previous.disabled, true);
  assert.equal(next.dataset.targetValue, 'review');

  next.click();
  await nextTick();
  await nextTick();

  const reviewStep = host.querySelector('[data-part="step"][data-tabs-id="review"]');
  assert.equal(updates.at(-1), 'review');
  assert.equal(reviewStep?.getAttribute('aria-selected'), 'true');
  assert.equal(document.activeElement, reviewStep);
  assert.equal(next.disabled, true);
  assert.equal(previous.dataset.targetValue, 'account');

  previous.click();
  await nextTick();
  await nextTick();

  const accountStep = host.querySelector('[data-part="step"][data-tabs-id="account"]');
  assert.equal(updates.at(-1), 'account');
  assert.equal(document.activeElement, accountStep);

  app.unmount();
  host.remove();
});

test('Vue Stepper actions stay disabled when the root is readonly', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(StepperRoot, {
      items: ['account', 'review'],
      defaultValue: 'account',
      readonly: true,
    }, {
      default: () => [
        h(StepperList, null, {
          default: () => [
            h(StepperStep, { value: 'account' }),
            h(StepperStep, { value: 'review' }),
          ],
        }),
        h(StepperPrevious),
        h(StepperNext),
      ],
    }),
  });

  app.mount(host);
  await nextTick();

  assert.equal(host.querySelector('[data-part="previous"]')?.getAttribute('disabled'), '');
  assert.equal(host.querySelector('[data-part="next"]')?.getAttribute('disabled'), '');

  app.unmount();
  host.remove();
});
