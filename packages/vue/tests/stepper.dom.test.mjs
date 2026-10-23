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
  KeyboardEvent: browserWindow.KeyboardEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, shallowRef } = await import('vue');
const { HostProvider } = await import('../.verification-dist/host-provider.js');
const { TabsRoot, TabsList, TabsTrigger, TabsContent } = await import('../.verification-dist/tabs.js');
function mountTabs(t, initial = {}) {
  const props = shallowRef(initial), updates = [], highlights = [], activations = [], host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(HostProvider, { direction: props.value.direction ?? 'ltr' }, { default: () => h(TabsRoot, {
    items: ['a', 'b', 'c'], defaultValue: 'a', ...props.value,
    'onUpdate:modelValue': value => updates.push(value), onHighlight: value => highlights.push(value), onActivate: value => activations.push(value),
  }, { default: () => [h(TabsList, { label: 'Sections' }, { default: () => [
    ...['a', 'b', 'c'].map(value => h(TabsTrigger, { key: value, value, onFocus: props.value.onFocus, onKeydown: props.value.onKeydown }, { default: () => value })),
    h('input', { 'data-list-input': '', 'aria-label': 'Auxiliary input' }),
  ] }), ...['a', 'b', 'c'].map(value => h(TabsContent, { value }, { default: () => value + ' body' }))] }) }) });
  app.mount(host); let active = true;
  const unmount = () => { if (active) { active = false; app.unmount(); } };
  t.after(() => { unmount(); host.remove(); });
  return { host, props, updates, highlights, activations, buttons: [...host.querySelectorAll('[role=tab]')], unmount };
}
function tabKey(target, key, options = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }); target.dispatchEvent(event); return event;
}
test('Tabs manual focus synchronizes the Native cursor before keyboard movement and controlled activation', async t => {
  const fixture = mountTabs(t, { modelValue: 'a', activationMode: 'manual' }), [a, b, c] = fixture.buttons;
  await new Promise(resolve => setTimeout(resolve, 2)); b.focus();
  tabKey(b, 'ArrowRight'); await nextTick(); assert.equal(document.activeElement === c, true);
  assert.deepEqual(fixture.updates, []); assert.equal(a.getAttribute('aria-selected'), 'true');
  tabKey(c, 'Enter'); await nextTick(); assert.deepEqual(fixture.updates, ['c']); assert.deepEqual(fixture.activations, ['c']);
  assert.equal(a.getAttribute('aria-selected'), 'true'); assert.equal(c.getAttribute('aria-selected'), 'false');
});
test('Tabs automatic focus selects eligible targets while readonly keeps its accepted value', async t => {
  const automatic = mountTabs(t), readonly = mountTabs(t, { readonly: true });
  await new Promise(resolve => setTimeout(resolve, 2)); automatic.buttons[1].focus(); await nextTick();
  assert.deepEqual(automatic.updates, ['b']); assert.equal(automatic.buttons[1].getAttribute('aria-selected'), 'true');
  readonly.buttons[1].focus(); tabKey(readonly.buttons[1], 'ArrowRight'); await nextTick();
  assert.deepEqual(readonly.updates, []); assert.equal(readonly.buttons[0].getAttribute('aria-selected'), 'true');
});
test('Tabs empty controlled focus proposes selection once and permits a fresh refused-focus interaction', async t => {
  const fixture = mountTabs(t, { modelValue: '' }), [a, b] = fixture.buttons;
  await new Promise(resolve => setTimeout(resolve, 2)); a.focus(); await nextTick(); assert.deepEqual(fixture.updates, ['a']);
  tabKey(a, 'ArrowRight'); await nextTick(); assert.equal(document.activeElement === b, true); assert.deepEqual(fixture.updates, ['a', 'b']);
  const outside = document.createElement('input'); fixture.host.append(outside); outside.focus(); b.focus(); await nextTick();
  assert.deepEqual(fixture.updates, ['a', 'b', 'b']); assert.equal(b.getAttribute('aria-selected'), 'false');
});
test('Tabs keep cancelled, composing and unrelated input keys with their actual owner', async t => {
  const cancelled = mountTabs(t, { onKeydown: event => event.preventDefault() }), composing = mountTabs(t);
  await new Promise(resolve => setTimeout(resolve, 2)); cancelled.buttons[0].focus();
  tabKey(cancelled.buttons[0], 'ArrowRight'); await nextTick(); assert.deepEqual(cancelled.updates, []);
  composing.buttons[0].focus(); tabKey(composing.buttons[0], 'ArrowRight', { isComposing: true }); await nextTick(); assert.deepEqual(composing.updates, []);
  const input = composing.host.querySelector('[data-list-input]'); input.focus();
  assert.equal(tabKey(input, 'ArrowRight').defaultPrevented, false); await nextTick(); assert.equal(document.activeElement === input, true);
  assert.deepEqual(composing.updates, []);
});
test('Tabs coalesce pending focus and invalidate queued and retained work on unmount', async t => {
  const fixture = mountTabs(t, { activationMode: 'manual' }); fixture.buttons[0].focus(); let calls = 0;
  for (const button of fixture.buttons) button.focus = () => { calls++; };
  tabKey(fixture.buttons[0], 'ArrowRight'); tabKey(fixture.buttons[0], 'ArrowRight'); tabKey(fixture.buttons[0], 'ArrowLeft');
  await nextTick(); assert.equal(calls, 1);
  calls = 0; tabKey(fixture.buttons[0], 'ArrowRight'); fixture.props.value = { ...fixture.props.value, readonly: true };
  await nextTick(); assert.equal(calls, 0);
  calls = 0; tabKey(fixture.buttons[0], 'ArrowRight'); fixture.unmount(); await nextTick(); assert.equal(calls, 0);
  await new Promise(resolve => setTimeout(resolve, 2)); fixture.buttons[0].click(); await nextTick(); assert.equal(calls, 0);
});
test('Tabs retain Native vertical/RTL navigation and disabled-ID eligibility', async t => {
  const vertical = mountTabs(t, { orientation: 'vertical', disabledItems: ['b'] }); vertical.buttons[0].focus();
  tabKey(vertical.buttons[0], 'ArrowDown'); await nextTick(); assert.equal(document.activeElement === vertical.buttons[2], true);
  const rtl = mountTabs(t, { direction: 'rtl', activationMode: 'manual' }); rtl.buttons[1].focus();
  tabKey(rtl.buttons[1], 'ArrowRight'); await nextTick(); assert.equal(document.activeElement === rtl.buttons[0], true);
});
test('Tabs respect application focus redirection without restoring a stale cursor', async t => {
  let buttons;
  const fixture = mountTabs(t, { activationMode: 'manual', onFocus: event => { if (event.currentTarget === buttons[1]) buttons[2].focus(); } });
  buttons = fixture.buttons; await new Promise(resolve => setTimeout(resolve, 2));
  buttons[1].focus(); assert.equal(document.activeElement === buttons[2], true);
  tabKey(buttons[2], 'ArrowLeft'); await nextTick(); assert.equal(document.activeElement === buttons[2], true);
  assert.deepEqual(fixture.updates, []);
});
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
  const items = shallowRef(['account', 'delivery', 'review']);
  const app = createApp({
    render: () => h(StepperRoot, {
      items: items.value,
      defaultValue: 'account',
      disabledItems: items.value.filter(value => value === 'delivery'),
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: () => [
        h(StepperList, null, {
          default: () => items.value.map((value) => h(StepperStep, { value }, { default: state => h('span', { 'data-step-position': state.position, 'data-step-count': state.count }, value) })),
        }),
        ...items.value.map((value) => h(StepperContent, { value }, { default: () => `${value} content` })),
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
  assert.deepEqual([...host.querySelectorAll('[data-step-position]')].map(node => [node.dataset.stepPosition, node.dataset.stepCount]), [['1', '3'], ['2', '3'], ['3', '3']]);

  next.click();
  await nextTick();
  await nextTick();

  const reviewStep = host.querySelector('[data-part="step"][data-tabs-id="s:review"]');
  assert.equal(updates.at(-1), 'review');
  assert.equal(reviewStep?.getAttribute('aria-selected'), 'true');
  assert.equal(document.activeElement, reviewStep);
  assert.equal(next.disabled, true);
  assert.equal(previous.dataset.targetValue, 'account');

  previous.click();
  await nextTick();
  await nextTick();

  const accountStep = host.querySelector('[data-part="step"][data-tabs-id="s:account"]');
  assert.equal(updates.at(-1), 'account');
  assert.equal(document.activeElement, accountStep);

  items.value = ['account', 'review', 'finish'];
  await nextTick(); await nextTick();
  assert.equal(host.querySelector('[data-tabs-id="s:review"] [data-step-position]').dataset.stepPosition, '2');
  assert.equal(next.dataset.targetValue, 'review'); next.click(); await nextTick(); await nextTick();
  assert.equal(next.dataset.targetValue, 'finish');

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
