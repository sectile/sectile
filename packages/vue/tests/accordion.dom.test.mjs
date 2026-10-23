import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';
const window = createTestWindow({ url: 'https://accordion.test/' });
for (const name of ['window', 'document', 'Element', 'HTMLElement', 'SVGElement', 'Node', 'Event', 'KeyboardEvent', 'MouseEvent']) {
  globalThis[name] = name === 'window' ? window : window[name];
}
const { createApp, defineComponent, h, nextTick, shallowRef } = await import('vue');
const { AccordionRoot, AccordionItem, AccordionHeader, AccordionTrigger, AccordionContent } = await import('../.verification-dist/accordion.js');
function mount(t, options = {}) {
  const host = document.createElement('div'); document.body.append(host);
  const changes = [], ids = ['a', 'b', 'c'];
  const configuration = shallowRef(options);
  const app = createApp({ render: () => h(AccordionRoot, { items: ids, modelValue: configuration.value.value ?? '',
    disabledItems: configuration.value.disabledItems, disabled: configuration.value.disabled, readonly: configuration.value.readonly,
    'onUpdate:modelValue': value => changes.push(value) }, {
    default: () => ids.map(value => h(AccordionItem, { value, key: value }, { default: () => [
      h(AccordionHeader, null, () => h(AccordionTrigger, { onKeydown: options.onKeydown, onFocus: options.onFocus }, () => value)),
      h(AccordionContent, null, () => [value + ' content', h('input', { 'data-body-input': value })]),
    ] })),
  }) });
  app.mount(host); let alive = true;
  const unmount = () => { if (alive) { alive = false; app.unmount(); } };
  t.after(() => { unmount(); host.remove(); });
  return { host, changes, unmount, configuration, buttons: [...host.querySelectorAll('button')] };
}
function key(element, value) {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }); element.dispatchEvent(event); return event;
}
test('Accordion keyboard effects follow real focus and coalesce to the latest owned recipient', async t => {
  const fixture = mount(t), [a, b, c] = fixture.buttons;
  // Cross Vue's listener-attachment timestamp before synthetic platform events.
  await new Promise(resolve => setTimeout(resolve, 2));
  b.focus(); key(b, 'ArrowDown'); await nextTick();
  assert.equal(document.activeElement === c, true);
  key(c, 'Home'); await nextTick(); assert.equal(document.activeElement === a, true);
  key(a, 'End'); await nextTick(); assert.equal(document.activeElement === c, true);
  const focused = [];
  for (const button of fixture.buttons) {
    const native = button.focus.bind(button); button.focus = options => { focused.push(button.textContent); native(options); };
  }
  key(c, 'Home'); key(c, 'ArrowDown'); key(c, 'ArrowDown'); await nextTick();
  assert.deepEqual(focused, ['c']); assert.deepEqual(fixture.changes, []);
});
test('Accordion retires scheduled keyboard focus and ignores a retained root after unmount', async t => {
  const fixture = mount(t); let focused = 0;
  for (const button of fixture.buttons) button.focus = () => { focused++; };
  await new Promise(resolve => setTimeout(resolve, 2));
  key(fixture.buttons[0], 'ArrowDown'); fixture.unmount(); await nextTick();
  assert.equal(focused, 0);
  key(fixture.buttons[0], 'End'); await nextTick(); assert.equal(focused, 0); assert.deepEqual(fixture.changes, []);
});
test('Accordion leaves body input keys and cancelled trigger keys with their owner', async t => {
  const fixture = mount(t, { value: 'a', onKeydown: event => event.preventDefault() });
  await new Promise(resolve => setTimeout(resolve, 2));
  const input = fixture.host.querySelector('[data-body-input="a"]'); input.focus();
  assert.equal(key(input, 'ArrowDown').defaultPrevented, false); await nextTick();
  assert.equal(document.activeElement === input, true);
  fixture.buttons[1].focus(); key(fixture.buttons[1], 'ArrowDown'); await nextTick();
  assert.equal(document.activeElement === fixture.buttons[1], true); assert.deepEqual(fixture.changes, []);
});
test('Accordion skips disabled IDs, preserves controlled refusal and cancels a newly disabled focus effect', async t => {
  const fixture = mount(t, { disabledItems: ['b'] });
  await new Promise(resolve => setTimeout(resolve, 2));
  fixture.buttons[0].focus(); key(fixture.buttons[0], 'ArrowDown'); await nextTick();
  assert.equal(document.activeElement === fixture.buttons[2], true);
  fixture.buttons[2].click(); await nextTick();
  assert.deepEqual(fixture.changes, ['c']); assert.equal(fixture.buttons[2].getAttribute('aria-expanded'), 'false');
  let focused = 0;
  for (const button of fixture.buttons) button.focus = () => { focused++; };
  key(fixture.buttons[2], 'Home'); fixture.configuration.value = { disabled: true }; await nextTick();
  assert.equal(focused, 0);
  const readonly = mount(t, { readonly: true });
  await new Promise(resolve => setTimeout(resolve, 2));
  readonly.buttons[0].click(); await nextTick(); assert.deepEqual(readonly.changes, []);
});
test('Accordion focus synchronization respects application focus redirection', async t => {
  let buttons;
  const fixture = mount(t, { onFocus: event => { if (event.currentTarget === buttons[1]) buttons[2].focus(); } });
  buttons = fixture.buttons;
  await new Promise(resolve => setTimeout(resolve, 2));
  buttons[1].focus(); assert.equal(document.activeElement === buttons[2], true);
  key(buttons[2], 'ArrowUp'); await nextTick();
  assert.equal(document.activeElement === buttons[2], true);
  assert.deepEqual(fixture.changes, []);
});
test('Accordion asChild preserves the adopted control disabled prop across owner changes', async t => {
  const disabled = shallowRef(true), host = document.createElement('div'); document.body.append(host);
  const Control = defineComponent({ props: { disabled: Boolean }, setup(props, { attrs }) {
    return () => h('button', { ...attrs, disabled: props.disabled }, 'Section');
  } });
  const app = createApp({ render: () => h(AccordionRoot, { items: ['a'], disabled: disabled.value }, {
    default: () => h(AccordionItem, { value: 'a' }, { default: () => h(AccordionTrigger, { asChild: true }, {
      default: state => h(Control, { disabled: state.disabled }),
    }) }),
  }) });
  app.mount(host); t.after(() => { app.unmount(); host.remove(); });
  const button = host.querySelector('button');
  assert.equal(button.disabled, true); assert.equal(button.getAttribute('aria-disabled'), 'true');
  disabled.value = false; await nextTick();
  assert.equal(button.disabled, false); assert.equal(button.getAttribute('aria-disabled'), null);
  disabled.value = true; await nextTick(); assert.equal(button.disabled, true);
});
test('Accordion root preserves live application and adopted group labels', async t => {
  const label = shallowRef(undefined), host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(AccordionRoot, { items: ['a'], asChild: true, role: 'group', 'aria-label': label.value }, {
    default: () => h('section', { 'aria-label': 'Inherited sections' }, 'Body'),
  }) });
  app.mount(host); t.after(() => { app.unmount(); host.remove(); });
  const section = host.querySelector('section');
  assert.equal(section.getAttribute('aria-label'), 'Inherited sections'); assert.equal(section.getAttribute('role'), 'group');
  label.value = 'Delivery sections'; await nextTick(); assert.equal(section.getAttribute('aria-label'), 'Delivery sections');
  label.value = 'Updated sections'; await nextTick(); assert.equal(section.getAttribute('aria-label'), 'Updated sections');
  label.value = undefined; await nextTick(); assert.equal(section.getAttribute('aria-label'), 'Inherited sections');
});
