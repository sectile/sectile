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
  KeyboardEvent: browserWindow.KeyboardEvent,
  FocusEvent: browserWindow.FocusEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref } = await import('vue');
const { PinInputInput, PinInputRoot } = await import('../.verification-dist/pin-input.js');

test('PIN input reconnects changed native topology and preserves localized cell names', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = ref({ length: 4, defaultValue: '12', as: 'div' });
  const values = [], errors = [];
  const app = createApp({ render: () => h(PinInputRoot, { ...options.value, label: '인증 코드', 'onUpdate:modelValue': value => values.push(value) }, {
    default: () => Array.from({ length: options.value.length }, (_, index) => h(PinInputInput, { index, key: index, 'aria-label': `인증 코드 ${index + 1}번째 자리` })),
  }) });
  app.config.errorHandler = error => errors.push(error);
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  try {
    app.mount(host); await drain();
    const firstInput = host.querySelector('input'), originalAdd = firstInput.addEventListener;
    let nativeConnections = 0;
    firstInput.addEventListener = function (type, ...args) { if (type === 'focus') nativeConnections += 1; return originalAdd.call(this, type, ...args); };
    options.value = { ...options.value, length: 6 }; await drain();
    assert.equal(nativeConnections, 1, 'prop and reference changes coalesce into one native connection');
    const inputs = [...host.querySelectorAll('input')]; assert.equal(inputs.length, 6);
    inputs[2].focus(); inputs[2].value = '3'; inputs[2].dispatchEvent(new Event('input', { bubbles: true })); await drain();
    assert.deepEqual(values, ['123']);
    assert.equal(inputs[2].getAttribute('aria-label'), '인증 코드 3번째 자리');
    options.value = { ...options.value, as: 'section' }; await drain();
    assert.ok(host.querySelector('section')); const next = [...host.querySelectorAll('input')];
    const count = values.length; inputs[3].value = '9'; inputs[3].dispatchEvent(new Event('input', { bubbles: true })); await drain();
    assert.equal(values.length, count, 'retired inputs cannot propose into the replacement connection');
    next[3].focus(); next[3].value = '4'; next[3].dispatchEvent(new Event('input', { bubbles: true })); await drain();
    assert.equal(values.at(-1), '1234'); assert.deepEqual(errors, []);
  } finally { app.unmount(); host.remove(); }
});

test('PIN input settles valid controlled shrink before native input and rejects queued unmount work', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = ref({ length: 6, modelValue: '12' }); const values = [], errors = [];
  const app = createApp({ render: () => h(PinInputRoot, { ...options.value, 'onUpdate:modelValue': value => values.push(value) }, {
    default: () => Array.from({ length: options.value.length }, (_, index) => h(PinInputInput, { index, key: index })),
  }) });
  app.config.errorHandler = error => errors.push(error);
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); options.value = { length: 2, modelValue: '12' }; await drain();
    const inputs = [...host.querySelectorAll('input')]; assert.equal(inputs.length, 2);
    inputs[0].focus(); inputs[0].value = '3'; inputs[0].dispatchEvent(new Event('input', { bubbles: true })); await drain();
    assert.deepEqual(values, ['32']); assert.deepEqual(inputs.map(input => input.value), ['1', '2']);
    options.value = { length: 4, modelValue: '12' }; await nextTick(); const count = values.length;
    app.unmount(); await drain(); assert.equal(values.length, count); assert.deepEqual(errors, []);
  } finally { app.unmount(); host.remove(); }
});

test('PIN input element registration settles without recursive updates', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const errors = [];
  const app = createApp({
    render: () => h(PinInputRoot, { length: 6, defaultValue: '12' }, {
      default: () => Array.from({ length: 6 }, (_, index) => h(PinInputInput, { index })),
    }),
  });
  app.config.errorHandler = (error) => errors.push(error);

  app.mount(host);
  await nextTick();
  await nextTick();

  assert.equal(host.querySelectorAll('[data-part="input"]').length, 6);
  assert.deepEqual(errors, []);

  app.unmount();
  host.remove();
});

test('controlled PIN input preserves every character while focus advances', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('');
  const app = createApp({
    render: () => h(PinInputRoot, {
      length: 6,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, {
      default: () => Array.from({ length: 6 }, (_, index) => h(PinInputInput, { index })),
    }),
  });

  app.mount(host);
  await nextTick();
  const inputs = [...host.querySelectorAll('[data-part="input"]')];
  inputs[0].focus();

  for (const character of '123456') {
    const input = document.activeElement;
    assert.ok(input instanceof HTMLInputElement);
    input.value = character;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
  }

  assert.equal(value.value, '123456');
  assert.deepEqual(inputs.map((input) => input.value), ['1', '2', '3', '4', '5', '6']);

  app.unmount();
  host.remove();
});

test('controlled PIN input settles a rejected native proposal after the browser edit', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(PinInputRoot, {
      length: 4,
      modelValue: '',
      'onUpdate:modelValue': (next) => updates.push(next),
    }, {
      default: () => Array.from({ length: 4 }, (_, index) => h(PinInputInput, { index })),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('[data-part="input"]');
  assert.ok(input instanceof HTMLInputElement);

  input.value = '1';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  assert.equal(input.value, '1');
  assert.deepEqual(updates, ['1']);

  await nextTick();
  await Promise.resolve();
  assert.equal(input.value, '');

  app.unmount();
  host.remove();
});

test('PIN input keeps the active cell browser-owned until composition commits', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('');
  const app = createApp({
    render: () => h(PinInputRoot, {
      length: 4,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, {
      default: () => Array.from({ length: 4 }, (_, index) => h(PinInputInput, { index })),
    }),
  });

  app.mount(host);
  await nextTick();
  const inputs = [...host.querySelectorAll('[data-part="input"]')];
  const first = inputs[0];
  assert.ok(first instanceof HTMLInputElement);
  first.focus();
  first.dispatchEvent(new Event('compositionstart', { bubbles: true }));
  first.value = '1';
  first.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();

  assert.equal(value.value, '');
  assert.equal(first.value, '1');
  assert.equal(document.activeElement, first);

  first.dispatchEvent(new Event('compositionend', { bubbles: true }));
  await Promise.resolve();
  await nextTick();

  assert.equal(value.value, '1');
  assert.equal(inputs[0].value, '1');
  assert.equal(document.activeElement, inputs[1]);

  app.unmount();
  host.remove();
});
