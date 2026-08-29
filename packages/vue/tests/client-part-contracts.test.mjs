import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const window = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  Element: window.Element,
  Node: window.Node,
  MutationObserver: window.MutationObserver,
  Event: window.Event,
});

const { createApp, h } = await import('vue');
const rating = await import('../.verification-dist/rating.js');
const stepper = await import('../.verification-dist/stepper.js');
const checkboxGroup = await import('../.verification-dist/checkbox-group.js');
const windowSplitter = await import('../.verification-dist/window-splitter.js');

function renderClient(render) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  const html = host.innerHTML;
  app.unmount();
  host.remove();
  return html;
}

test('composed Vue controls preserve their public scope and part contract after mounting', () => {
  const rendered = {
    rating: renderClient(() => h(rating.RatingRoot, { items: ['1'] }, () =>
      h(rating.RatingItem, { value: '1' }, () => h(rating.RatingIndicator)))),
    stepper: renderClient(() => h(stepper.StepperRoot, { items: ['account'] }, () => [
      h(stepper.StepperList, null, () => h(stepper.StepperStep, { value: 'account' })),
      h(stepper.StepperContent, { value: 'account' }),
    ])),
    checkboxGroup: renderClient(() => h(checkboxGroup.CheckboxGroupRoot, { items: ['alpha'] }, () =>
      h(checkboxGroup.CheckboxGroupItem, { value: 'alpha' }, () => h(checkboxGroup.CheckboxGroupIndicator)))),
    windowSplitter: renderClient(() => h(windowSplitter.WindowSplitterRoot, null, () => [
      h(windowSplitter.WindowSplitterPane, { side: 'before' }),
      h(windowSplitter.WindowSplitterHandle),
      h(windowSplitter.WindowSplitterPane, { side: 'after' }),
    ])),
  };

  assert.match(rendered.rating, /data-scope="rating"/);
  assert.doesNotMatch(rendered.rating, /data-scope="radio-group"/);
  assert.match(rendered.stepper, /data-part="step"/);
  assert.doesNotMatch(rendered.stepper, /data-scope="tabs"|data-part="trigger"/);
  assert.match(rendered.checkboxGroup, /data-part="item"/);
  assert.doesNotMatch(rendered.checkboxGroup, /data-scope="checkbox"/);
  assert.match(rendered.windowSplitter, /data-part="handle"/);
  assert.doesNotMatch(rendered.windowSplitter, /data-scope="slider"|data-part="thumb"/);
});
