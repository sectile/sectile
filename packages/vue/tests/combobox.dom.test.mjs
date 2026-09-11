import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  CompositionEvent: browserWindow.CompositionEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref } = await import('vue');
const { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxRoot } = await import('../.verification-dist/combobox.js');

test('Vue combobox synchronizes controlled input values through the DOM connection', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const inputValue = ref('Al');
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: [{ id: 'alpha', label: 'Alpha' }],
      inputValue: inputValue.value,
    }, {
      default: () => h(ComboboxInput),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  assert.equal(input.value, 'Al');

  inputValue.value = 'Alpha';
  await nextTick();
  assert.equal(input.value, 'Alpha');

  app.unmount();
  host.remove();
});

test('Vue combobox projects filter policy into option and empty visibility', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const items = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
    { id: 'alpine', label: 'Alpine' },
  ];
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items,
      defaultInputValue: 'al',
      defaultOpen: true,
      position: false,
      policies: { matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()) },
    }, {
      default: () => [
        h(ComboboxInput),
        h(ComboboxContent, null, {
          default: () => [
            ...items.map((item) => h(ComboboxItem, { value: item.id }, { default: () => item.label })),
            h(ComboboxEmpty, null, { default: () => 'No matches' }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  const options = [...host.querySelectorAll('[data-scope="combobox"][data-part="item"]')];
  const empty = host.querySelector('[data-scope="combobox"][data-part="empty"]');
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  assert.ok(empty instanceof HTMLElement);
  assert.deepEqual(options.map((option) => [option.textContent, option.hidden]), [
    ['Alpha', false],
    ['Beta', true],
    ['Alpine', false],
  ]);
  assert.equal(empty.hidden, true);

  input.value = 'zzz';
  input.setSelectionRange(3, 3);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  await nextTick();
  assert.equal(options.every((option) => option.hidden), true);
  assert.equal(empty.hidden, false);

  app.unmount();
  host.remove();
});

test('Vue combobox clears a controlled value removed from its item domain', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const items = ref([{ id: 'alpha', label: 'Alpha' }, { id: 'beta', label: 'Beta' }]);
  const value = ref('beta');
  const updates = [];
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: items.value,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { updates.push(next); value.value = next; },
    }, { default: () => h(ComboboxInput) }),
  });

  app.mount(host);
  await nextTick();
  items.value = [{ id: 'alpha', label: 'Alpha' }];
  await nextTick();
  await nextTick();

  assert.deepEqual(updates, [null]);
  assert.equal(value.value, null);

  app.unmount();
  host.remove();
});

test('Vue combobox keeps live Hangul composition under native input ownership', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: [{ id: 'hangul', label: '한글' }],
    }, {
      default: () => h(ComboboxInput),
    }),
  });

  app.mount(host);
  await nextTick();

  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.get, 'function');
  assert.equal(typeof valueDescriptor?.set, 'function');
  let frameworkValueWrites = 0;
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => valueDescriptor.get.call(input),
    set: (value) => {
      frameworkValueWrites += 1;
      valueDescriptor.set.call(input, value);
    },
  });

  for (const segment of [
    { live: 'ㅎ', data: '한', committed: '한' },
    { live: '한ㄱ', data: '글', committed: '한글' },
  ]) {
    frameworkValueWrites = 0;
    input.dispatchEvent(compositionEvent('compositionstart', ''));
    valueDescriptor.set.call(input, segment.live);
    input.setSelectionRange(segment.live.length, segment.live.length);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
    await nextTick();

    assert.equal(input.value, segment.live);
    assert.equal(frameworkValueWrites, 0);

    valueDescriptor.set.call(input, segment.committed);
    input.setSelectionRange(segment.committed.length, segment.committed.length);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
    input.dispatchEvent(compositionEvent('compositionend', segment.data));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
    await Promise.resolve();
    await nextTick();

    assert.equal(input.value, segment.committed);
  }

  app.unmount();
  host.remove();
});

test('controlled Vue combobox preserves Hangul composition metadata through owner updates', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const inputValue = ref('');
  const updates = [];
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: [{ id: 'draft', label: '시안' }, { id: 'other', label: '기타' }],
      inputValue: inputValue.value,
      'onUpdate:inputValue': (value) => {
        updates.push(value);
        inputValue.value = value;
      },
    }, { default: () => h(ComboboxInput) }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.set, 'function');

  input.dispatchEvent(compositionEvent('compositionstart', ''));
  await nextTick();
  valueDescriptor.set.call(input, '시');
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();
  assert.equal(inputValue.value, '시');

  valueDescriptor.set.call(input, '시안');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();
  input.dispatchEvent(compositionEvent('compositionend', '시안'));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await Promise.resolve();
  await nextTick();

  assert.equal(inputValue.value, '시안');
  assert.equal(input.value, '시안');
  assert.equal(updates.at(-1), '시안');

  app.unmount();
  host.remove();
});

function compositionEvent(type, data) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'data', { value: data });
  return event;
}
