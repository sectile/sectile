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
  HTMLTextAreaElement: browserWindow.HTMLTextAreaElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  CompositionEvent: browserWindow.CompositionEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { KeepAlive, Teleport, createApp, defineComponent, h, nextTick, ref, shallowRef } = await import('vue');
const { ComboboxContent, ComboboxEditor, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxRoot } = await import('../.verification-dist/combobox.js');
const { TextField } = await import('../.verification-dist/text.js');
const { FormRoot, FormField } = await import('../.verification-dist/form.js');
const { PopoverContent, PopoverPortal, PopoverRoot } = await import('../.verification-dist/overlay/popover.js');
const { createPopover } = await import('@sectile/dom/popover');
const { DialogRoot, DialogContent } = await import('../.verification-dist/overlay/dialog.js');

for (const [multiline, accept] of [[false, true], [true, true], [false, false]]) test(`ComboboxEditor inserts a candidate through its one TextField owner (${multiline}/${accept})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const value = shallowRef('Hi @Ad'), mode = shallowRef(multiline), query = shallowRef(null), changes = [], accepted = [], errors = []; let field, pending;
  const options = [{ id: 'ada', label: 'Ada' }, { id: 'adam', label: 'Adam' }];
  const refresh = () => { const result = field?.getTextQuery({ trigger: '@', maxQueryCodeUnits: 16 }); query.value = result?.ok ? result.value : null; };
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'message' }, { default: () => h(ComboboxRoot, {
    items: options, inputValue: query.value?.query ?? '', open: query.value !== null, position: false, label: 'Message',
    onAccept: id => {
      accepted.push(id); const frame = query.value; if (!frame) return;
      pending = field.replaceText({ snapshot: frame.snapshot, startCodeUnitOffset: frame.startCodeUnitOffset,
        endCodeUnitOffset: frame.endCodeUnitOffset, text: '@' + options.find(item => item.id === id).label + ' ' });
    },
  }, { default: () => [h(ComboboxEditor, {}, { default: () => h(TextField, {
    modelValue: value.value, multiline: mode.value, ref: current => { if (current) field = current; }, onSnapshotChange: refresh,
    'onUpdate:modelValue': next => { changes.push(next); if (accept) value.value = next; },
  }) }), h(ComboboxContent, { id: 'text-suggestions' }, { default: () => options.map(item => h(ComboboxItem, { value: item.id }, () => item.label)) })] }) }) }) });
  app.config.errorHandler = error => errors.push(error);
  const drain = async () => { for (let turn = 0; turn < 12; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); assert.ok(query.value); assert.equal(query.value.query, 'Ad');
    const native = host.querySelector(multiline ? 'textarea' : 'input'), form = host.querySelector('form');
    assert.equal(host.querySelectorAll('input,textarea').length, 1); assert.equal(native.value, 'Hi @Ad');
    assert.equal(native.getAttribute('aria-controls'), 'text-suggestions');
    assert.deepEqual(new browserWindow.FormData(form).getAll('message'), ['Hi @Ad']);
    native.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await drain(); assert.ok(native.getAttribute('aria-activedescendant')); assert.equal(native.value, 'Hi @Ad');
    native.dispatchEvent(new browserWindow.CompositionEvent('compositionstart', { bubbles: true }));
    const imeEnter = new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    native.dispatchEvent(imeEnter); assert.equal(imeEnter.defaultPrevented, false); assert.deepEqual(accepted, []);
    native.dispatchEvent(new browserWindow.CompositionEvent('compositionend', { bubbles: true })); await drain();
    // Native IME completion is TextField's own commit; measure candidate insertion separately.
    assert.ok(changes.every(text => text === 'Hi @Ad')); changes.length = 0;
    native.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    native.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.ok(pending); const result = await pending; await drain();
    assert.equal(accepted.length, 1); assert.equal(result.status, accept ? 'accepted' : 'rejected');
    if (!accept) assert.equal(result.reason, 'refused');
    assert.equal(changes.length, 1); assert.ok(/^Hi @Ada(?:m)? $/u.test(changes[0]));
    assert.equal(native.value, accept ? changes[0] : 'Hi @Ad'); assert.equal(host.querySelector(multiline ? 'textarea' : 'input'), native);
    assert.deepEqual(new browserWindow.FormData(form).getAll('message'), [native.value]); assert.deepEqual(errors, []);
    if (accept && !multiline) {
      value.value = 'Hi @Ad'; await drain();
      native.dispatchEvent(new browserWindow.CompositionEvent('compositionstart', { bubbles: true }));
      mode.value = true; await drain();
      assert.equal(host.querySelector('input'), native);
      native.dispatchEvent(new browserWindow.CompositionEvent('compositionend', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0)); await drain();
      const replacement = host.querySelector('textarea');
      assert.ok(query.value); assert.equal(replacement.value, 'Hi @Ad');
      const next = new browserWindow.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      replacement.dispatchEvent(next); assert.equal(next.defaultPrevented, true, 'The committed replacement retains candidate navigation');
      const retired = new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      native.dispatchEvent(retired); assert.equal(retired.defaultPrevented, false); assert.deepEqual(errors, []);
    }
  } finally { app.unmount(); host.remove(); }
});

test('inline Combobox shares Dialog dismissal and nested popup ancestry through mode and IME churn', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const presentation = shallowRef('inline'), open = shallowRef(true), nested = shallowRef(false), requests = []; let state;
  const itemId = shallowRef(value => 'first-' + value);
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const app = createApp({ render: () => h(DialogRoot, { open: open.value, autoFocus: false, 'onUpdate:open': value => { requests.push(value); open.value = value; } }, {
    default: () => h(DialogContent, { 'data-inline-dialog': '', 'aria-label': 'Commands' }, { default: () => h(ComboboxRoot, {
      items: [{ id: 'a', label: 'Alpha' }], presentation: presentation.value, itemId: itemId.value, open: true, defaultInputValue: 'a',
    }, { default: value => { state = value; return [h(ComboboxInput), h(ComboboxContent, { id: 'inline-commands-results' }, { default: () => [h(ComboboxItem, { value: 'a' }),
      h(PopoverRoot, { open: nested.value, position: false, autoFocus: false, 'onUpdate:open': value => { nested.value = value; } }, {
        default: () => h(PopoverPortal, { to: document.body }, { default: () => h(PopoverContent, { 'data-inline-nested': '' }) }),
      }),
    ] })]; } }) }),
  }) });
  const assertOrder = expected => {
    const root = document.createElement('div'); document.body.append(root);
    const witness = createPopover({ root, defaultOpen: true, position: false, autoFocus: false });
    try { assert.equal(witness.getLayerOrder(), expected); } finally { witness.disconnect(); root.remove(); }
  };
  app.mount(host);
  try {
    await drain(); const input = host.querySelector('input'), panel = host.querySelector('[data-scope=combobox][data-part=content]');
    assertOrder(1); assert.equal(panel.style.position, ''); assert.ok(input.getAttribute('aria-controls')); assert.equal(panel.getAttribute('role'), 'listbox');
    assert.equal(panel.querySelector('[role=option]').id, 'first-a');
    nested.value = true; await drain(); assertOrder(2);
    nested.value = false; await drain(); assertOrder(1);
    input.setSelectionRange(0, input.value.length);
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); input.value = '한'; input.setSelectionRange(1, 1);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
    presentation.value = 'popup'; itemId.value = value => 'second-' + value; await drain(); assertOrder(1); assert.equal(panel.style.position, '');
    assert.equal(panel.querySelector('[role=option]').id, 'first-a');
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' }));
    await new Promise(resolve => setTimeout(resolve, 0)); await drain();
    assertOrder(2); assert.ok(panel.style.position !== ''); assert.equal(input.value, '한'); assert.equal(state.inputValue, '한');
    assert.equal(panel.querySelector('[role=option]').id, 'second-a'); assert.equal(input.getAttribute('aria-activedescendant'), 'second-a');
    presentation.value = 'inline'; await drain(); assertOrder(1); assert.equal(panel.style.position, ''); assert.ok(host.querySelector('input') === input);
    input.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await drain();
    assert.deepEqual(requests, [false]); assert.equal(open.value, false); assertOrder(0);
  } finally { app.unmount(); host.remove(); }
  assertOrder(0);
});

test('cached Combobox settles interrupted IME and deferred configuration without reviving Portal work while inactive', async () => {
  for (const controlled of [false, true]) {
    const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
    const shown = shallowRef(true), inputValue = shallowRef(''), label = shallowRef('City');
    const items = shallowRef([{ id: 'a', label: 'Alpha' }]), requests = [];
    let state, constructed = 0;
    const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
    const Child = defineComponent({ setup() { constructed++; return () => h('input', { 'data-retained': '' }); } });
    const Cached = defineComponent({ setup: () => () => h(ComboboxRoot, { items: items.value, label: label.value,
      defaultValue: 'a', open: true, position: false,
      ...(controlled ? { inputValue: inputValue.value } : {}),
      'onUpdate:inputValue': value => { inputValue.value = value; }, 'onUpdate:open': value => requests.push(value),
    }, { default: value => { state = value; return [h(ComboboxInput), h(Teleport, { to: target }, [h(ComboboxContent, {}, {
      default: () => [h(ComboboxItem, { value: 'a' }), h(Child),
        h(PopoverRoot, { defaultOpen: true, position: false, autoFocus: false }, { default: () => h(PopoverPortal,
          { to: target }, { default: () => h(PopoverContent, { 'data-combobox-nested': '' }) }) }),
      ],
    })])]; } }) });
    const Empty = defineComponent({ render: () => null });
    const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
    const assertOrder = expected => {
      const root = document.createElement('div'); document.body.append(root);
      const witness = createPopover({ root, defaultOpen: true, position: false, autoFocus: false });
      try { assert.equal(witness.getLayerOrder(), expected); } finally { witness.disconnect(); root.remove(); }
    };
    app.mount(host);
    try {
      await drain(); const panel = target.querySelector('[data-scope=combobox][data-part=content]');
      const input = host.querySelector('[data-part=input]'), retained = panel.querySelector('[data-retained]'); retained.value = 'Retained';
      assertOrder(2);
      for (let cycle = 0; cycle < 3; cycle++) {
        input.setSelectionRange(0, input.value.length);
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        input.value = `한${cycle}`; input.setSelectionRange(2, 2);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
        if (cycle === 1) { label.value = 'Deferred while composing'; await drain(); }
        shown.value = false; await drain();
        assert.equal(panel.hidden, true); assert.equal(panel.inert, true);
        assert.equal(target.querySelector('[data-combobox-nested]').hidden, true); assertOrder(0);
        input.value = 'unobserved'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        if (cycle > 0) { label.value = `Paused ${cycle}`; items.value = [...items.value, { id: `extra-${cycle}`, label: `Extra ${cycle}` }]; await drain(); }
        assert.equal(panel.hidden, true); assertOrder(0);
        shown.value = true; await drain();
        assert.equal(panel.hidden, false); assert.equal(panel.inert, false); assertOrder(2);
        assert.equal(input.value, `한${cycle}`); assert.equal(state.inputValue, `한${cycle}`); assert.equal(state.value, 'a');
        assert.equal(target.querySelector('[data-combobox-nested]').hidden, false);
        assert.equal(panel.querySelector('[data-retained]'), retained); assert.equal(retained.value, 'Retained'); assert.equal(constructed, 1);
        label.value = `Resumed ${cycle}`; await drain(); assert.equal(input.getAttribute('aria-label'), `Resumed ${cycle}`);
        assert.deepEqual(requests, []);
      }
    } finally { app.unmount(); host.remove(); target.remove(); }
    assertOrder(0);
  }
});

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

test('controlled Vue combobox chains rapid native insertions and deletions before render', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const inputValue = ref('');
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: [{ id: 'value', label: 'abc' }],
      inputValue: inputValue.value,
      'onUpdate:inputValue': (value) => { inputValue.value = value; },
    }, { default: () => h(ComboboxInput) }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.set, 'function');

  for (const [value, inputType] of [
    ['a', 'insertText'],
    ['ab', 'insertText'],
    ['abc', 'insertText'],
    ['ab', 'deleteContentBackward'],
    ['a', 'deleteContentBackward'],
    ['', 'deleteContentBackward'],
  ]) {
    valueDescriptor.set.call(input, value);
    input.setSelectionRange(value.length, value.length);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }));
    assert.equal(input.value, value);
    assert.equal(inputValue.value, value);
  }

  await nextTick();
  assert.equal(input.value, '');
  assert.equal(inputValue.value, '');

  app.unmount();
  host.remove();
});

test('controlled Vue combobox preserves native edits across render-only policy identity churn', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const inputValue = ref('');
  const items = ref([
    { id: 'hangul', label: '한글' },
    { id: 'fresh', label: '후레쉬' },
  ]);
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: items.value,
      inputValue: inputValue.value,
      policies: {
        matches: (label, query) => query.length === 0 || label.includes(query),
      },
      'onUpdate:inputValue': (value) => { inputValue.value = value; },
    }, { default: () => h(ComboboxInput) }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.set, 'function');
  const addEventListener = input.addEventListener.bind(input);
  const removeEventListener = input.removeEventListener.bind(input);
  let nativeListenerAdds = 0;
  let nativeListenerRemoves = 0;
  input.addEventListener = (type, listener, options) => {
    if (type === 'input' || type === 'search' || type === 'compositionstart' || type === 'compositionend') {
      nativeListenerAdds += 1;
    }
    return addEventListener(type, listener, options);
  };
  input.removeEventListener = (type, listener, options) => {
    if (type === 'input' || type === 'search' || type === 'compositionstart' || type === 'compositionend') {
      nativeListenerRemoves += 1;
    }
    return removeEventListener(type, listener, options);
  };

  valueDescriptor.set.call(input, 'abc');
  input.setSelectionRange(3, 3);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'abc' }));
  await nextTick();
  assert.equal(inputValue.value, 'abc');
  assert.equal(input.value, 'abc');
  assert.equal(nativeListenerAdds, 0);
  assert.equal(nativeListenerRemoves, 0);

  items.value = [...items.value, { id: 'result', label: 'abc 결과' }];
  await nextTick();
  await nextTick();
  assert.equal(inputValue.value, 'abc');
  assert.equal(input.value, 'abc');

  valueDescriptor.set.call(input, 'ab');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  await nextTick();
  assert.equal(inputValue.value, 'ab');
  assert.equal(input.value, 'ab');

  app.unmount();
  host.remove();
});

test('Vue combobox applies policy changes through the existing native text connection', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const inputValue = ref('');
  const matchMode = ref('prefix');
  const excludeBeta = shallowRef(false);
  const items = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
  ];
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items,
      inputValue: inputValue.value,
      policies: {
        eligible: excludeBeta.value ? id => id !== 'beta' : () => true,
        matches: matchMode.value === 'prefix'
          ? (label, query) => label.toLowerCase().startsWith(query.toLowerCase())
          : (label, query) => label.toLowerCase().includes(query.toLowerCase()),
      },
      'onUpdate:inputValue': (value) => { inputValue.value = value; },
    }, {
      default: (state) => [
        h(ComboboxInput),
        h('output', { id: 'combobox-highlight' }, state.highlightedValue ?? ''),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  const highlight = host.querySelector('#combobox-highlight');
  assert.ok(input instanceof HTMLInputElement);
  assert.ok(highlight instanceof HTMLElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.set, 'function');

  valueDescriptor.set.call(input, 'ta');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'ta' }));
  await nextTick();
  assert.equal(highlight.textContent, '');

  matchMode.value = 'contains';
  await nextTick();
  input.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
  await nextTick();
  assert.equal(highlight.textContent, 'beta');

  excludeBeta.value = true; await nextTick();
  input.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' })); await nextTick();
  assert.equal(highlight.textContent, ''); assert.equal(input.value, 'ta'); assert.ok(host.querySelector('input') === input);
  excludeBeta.value = false; await nextTick();
  input.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' })); await nextTick(); assert.equal(highlight.textContent, 'beta');

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

test('Vue combobox preserves the first committed Hangul syllable when items change between compositions', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const items = ref([{ id: 'hangul', label: '한글' }]);
  const inputValue = ref('');
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: items.value,
      inputValue: inputValue.value,
      'onUpdate:inputValue': (value) => { inputValue.value = value; },
    }, { default: () => h(ComboboxInput) }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.get, 'function');
  assert.equal(typeof valueDescriptor?.set, 'function');
  const frameworkWrites = [];
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => valueDescriptor.get.call(input),
    set: (value) => {
      frameworkWrites.push(value);
      valueDescriptor.set.call(input, value);
    },
  });

  input.dispatchEvent(compositionEvent('compositionstart', ''));
  valueDescriptor.set.call(input, 'ㅎ');
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  valueDescriptor.set.call(input, '한');
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  input.dispatchEvent(compositionEvent('compositionend', '한'));

  items.value = [
    { id: 'hangul', label: '한글' },
    { id: 'other', label: '기타' },
  ];

  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  input.dispatchEvent(compositionEvent('compositionstart', ''));
  await Promise.resolve();
  await nextTick();

  assert.equal(inputValue.value, '한');
  assert.equal(input.value, '한');
  assert.equal(frameworkWrites.includes(''), false);

  valueDescriptor.set.call(input, '한ㄱ');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  valueDescriptor.set.call(input, '한글');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  input.dispatchEvent(compositionEvent('compositionend', '글'));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));

  await Promise.resolve();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();

  assert.equal(inputValue.value, '한글');
  assert.equal(input.value, '한글');
  assert.equal(frameworkWrites.includes(''), false);

  app.unmount();
  host.remove();
});

test('Vue combobox preserves an active composition while its item domain changes', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const items = ref([{ id: 'fresh', label: '후레쉬' }]);
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: items.value,
    }, { default: () => h(ComboboxInput) }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.get, 'function');
  assert.equal(typeof valueDescriptor?.set, 'function');
  const frameworkWrites = [];
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => valueDescriptor.get.call(input),
    set: (value) => {
      frameworkWrites.push(value);
      valueDescriptor.set.call(input, value);
    },
  });

  input.dispatchEvent(compositionEvent('compositionstart', ''));
  valueDescriptor.set.call(input, 'ㅎ');
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await nextTick();

  items.value = [
    { id: 'fresh', label: '후레쉬' },
    { id: 'other', label: '기타' },
  ];
  await nextTick();
  assert.equal(input.value, 'ㅎ');
  assert.deepEqual(frameworkWrites, []);

  valueDescriptor.set.call(input, '후');
  input.setSelectionRange(1, 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  input.dispatchEvent(compositionEvent('compositionend', '후'));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await Promise.resolve();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();

  assert.equal(input.value, '후');
  assert.deepEqual(frameworkWrites, []);

  app.unmount();
  host.remove();
});

test('controlled Vue combobox restores a rejected native proposal after owner settlement', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const items = ref([{ id: 'alpha', label: 'Alpha' }]);
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: items.value,
      inputValue: 'a',
      'onUpdate:inputValue': (value) => updates.push(value),
    }, { default: () => h(ComboboxInput) }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  assert.equal(typeof valueDescriptor?.get, 'function');
  assert.equal(typeof valueDescriptor?.set, 'function');
  const frameworkWrites = [];
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => valueDescriptor.get.call(input),
    set: (value) => {
      frameworkWrites.push(value);
      valueDescriptor.set.call(input, value);
    },
  });

  valueDescriptor.set.call(input, 'ab');
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  items.value = [{ id: 'alpha', label: 'Alpha' }, { id: 'beta', label: 'Beta' }];
  await nextTick();
  await nextTick();

  assert.deepEqual(updates, ['ab']);
  assert.equal(input.value, 'a');
  assert.deepEqual(frameworkWrites, ['a']);

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
