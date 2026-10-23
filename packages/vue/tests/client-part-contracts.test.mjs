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

const { createApp, h, nextTick, ref, shallowRef } = await import('vue');
const rating = await import('../.verification-dist/rating.js');
const stepper = await import('../.verification-dist/stepper.js');
const checkboxGroup = await import('../.verification-dist/checkbox-group.js');
const windowSplitter = await import('../.verification-dist/window-splitter.js');
const popover = await import('../.verification-dist/overlay/popover.js');

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

for (const [arrow, trigger, controlled] of [[false, true, true], [true, true, true], [true, true, false], [true, false, false]]) test(`external popup anchors retarget existing geometry without changing open state or focused content (${arrow}/${trigger}/${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const reads = { first: 0, second: 0, compound: 0, trigger: 0 };
  const rect = (key, left) => () => { reads[key]++; return { x: left, y: 100, left, top: 100, right: left + 20, bottom: 120, width: 20, height: 20 }; };
  const first = document.createElement('span'), second = document.createElement('span');
  first.getBoundingClientRect = rect('first', 100); second.getBoundingClientRect = rect('second', 200);
  document.body.append(first, second);
  first.tabIndex = 0; first.focus();
  const anchor = shallowRef(first), compound = shallowRef(true), restoreFocusTarget = shallowRef(undefined), opens = [], errors = [];
  let root;
  const app = createApp({ render: () => h(popover.PopoverRoot, {
    ref: value => { root = value; }, ...(controlled ? { open: true } : { defaultOpen: true }), anchor: anchor.value, restoreFocusTarget: restoreFocusTarget.value,
    strategy: 'fixed', side: 'bottom', align: 'start', sideOffset: 0, avoidCollisions: false,
    'onUpdate:open': value => opens.push(value),
  }, { default: () => [
    compound.value ? h(popover.PopoverAnchor, { ref: value => { if (value?.$el instanceof HTMLElement) value.$el.getBoundingClientRect = rect('compound', 30); } }, { default: () => 'Rendered fallback' }) : null,
    trigger ? h(popover.PopoverTrigger, { ref: value => { if (value?.$el instanceof HTMLElement) value.$el.getBoundingClientRect = rect('trigger', 10); } }, { default: () => 'Trigger fallback' }) : null,
    h(popover.PopoverContent, null, { default: () => [arrow ? h(popover.PopoverArrow) : null, h('input', { 'aria-label': 'First focus candidate' }), h('input', { 'aria-label': 'Retained focus' })] }),
  ] }) });
  app.config.errorHandler = error => errors.push(error);
  const settle = async () => { for (let turn = 0; turn < 4; turn++) await nextTick(); await new Promise(resolve => setTimeout(resolve, 20)); };
  try {
    app.mount(host); await settle();
    assert.deepEqual(errors, []);
    const content = host.querySelector('[data-part="content"]'), input = host.querySelector('[aria-label="Retained focus"]');
    assert.ok(content instanceof HTMLElement);
    const assertReference = (element, key, left) => {
      if (content.dataset.positionRoute === 'css-anchor') {
        const name = element.style.getPropertyValue('anchor-name'); assert.ok(name);
        assert.equal(content.style.getPropertyValue('position-anchor'), name);
      } else {
        assert.ok(reads[key] > 0, JSON.stringify({ anchorBound: root?.$props.anchor === element, reads, hidden: content.hidden, style: content.style.cssText }));
        assert.equal(content.style.left, `${left}px`);
      }
    };
    assertReference(first, 'first', 100);
    assert.equal(reads.compound, 0);
    input.focus(); assert.ok(document.activeElement === input, 'input receives explicit focus');
    restoreFocusTarget.value = second; await settle(); assert.ok(document.activeElement === input, 'return-target replacement preserves focused content');
    restoreFocusTarget.value = trigger ? null : first; await settle(); assert.ok(document.activeElement === input, 'return-target clear or retarget is not a new opening');
    compound.value = false; await settle(); assert.ok(document.activeElement === input, 'shadowed anchor removal preserves focus');
    compound.value = true; await settle(); assert.ok(document.activeElement === input, 'shadowed anchor addition preserves focus'); assert.equal(reads.compound, 0);
    anchor.value = second; await settle();
    assertReference(second, 'second', 200); assert.ok(document.activeElement === input, 'external retarget preserves focused content'); assert.deepEqual(opens, []);
    const oldReads = reads.first;
    window.dispatchEvent(new window.Event('scroll')); await settle(); assert.equal(reads.first, oldReads);
    anchor.value = undefined; await settle(); assertReference(host.querySelector('[data-part="anchor"]'), 'compound', 30);
    assert.ok(document.activeElement === input, 'rendered anchor fallback preserves focused content'); assert.deepEqual(opens, []);
    if (trigger) { compound.value = false; await settle(); assertReference(host.querySelector('[data-part="trigger"]'), 'trigger', 10); }
    if (!controlled) {
      root.requestClose();
      await settle();
      assert.equal(content.hidden, true); assert.deepEqual(opens, [false]);
      if (trigger) assert.ok(document.activeElement === host.querySelector('[data-part="trigger"]'), 'anchor retargeting preserves the original trigger focus-return owner');
      else assert.ok(document.activeElement === first, 'triggerless accepted close uses the explicit initiating target, not the geometry reference');
    }
    assert.deepEqual(errors, []);
    app.unmount(); await settle(); const retiredReads = { ...reads };
    window.dispatchEvent(new window.Event('scroll')); await settle(); assert.deepEqual(reads, retiredReads);
  } finally { if (host.__vue_app__) app.unmount(); host.remove(); first.remove(); second.remove(); }
});

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

test('position prop updates project the latest popup placement', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const side = ref('bottom');
  const align = ref('center');
  const sideOffset = ref(3);
  const app = createApp({
    render: () => h(popover.PopoverRoot, {
      defaultOpen: true,
      side: side.value,
      align: align.value,
      sideOffset: sideOffset.value,
      avoidCollisions: false,
    }, () => [
      h(popover.PopoverTrigger, null, () => 'Anchor'),
      h(popover.PopoverContent, null, () => [
        h(popover.PopoverArrow, { style: { position: 'relative' } }),
        'Content',
      ]),
    ]),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const arrow = host.querySelector('[data-part="arrow"]');
    const content = host.querySelector('[data-part="content"]');
    assert.ok(arrow instanceof HTMLElement);
    assert.ok(content instanceof HTMLElement);
    assert.equal(arrow.style.position, 'absolute');
    assert.equal(content.dataset.side, 'bottom');
    assert.equal(content.dataset.align, 'center');

    side.value = 'top';
    align.value = 'end';
    sideOffset.value = 4;
    await nextTick();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(content.dataset.side, 'top');
    assert.equal(content.dataset.align, 'end');
    assert.equal(arrow.style.position, 'absolute');
  } finally {
    app.unmount();
    host.remove();
  }
});
