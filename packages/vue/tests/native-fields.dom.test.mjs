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
  HTMLSelectElement: browserWindow.HTMLSelectElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  FormData: browserWindow.FormData,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, createSSRApp, defineComponent, h, nextTick, ref, shallowRef } = await import('vue');
const { renderToString } = await import('vue/server-renderer');
const { DateField } = await import('../.verification-dist/temporal/date-field.js');
const { DateTimeField } = await import('../.verification-dist/temporal/date-time-field.js');
const { NumberField } = await import('../.verification-dist/number-field.js');
const {
  createStandardQuantityPolicies,
  QuantityFieldInput,
  QuantityFieldRoot,
  QuantityFieldUnitSelect,
} = await import('../.verification-dist/quantity-field.js');
const { TimeField } = await import('../.verification-dist/temporal/time-field.js');
const { TemporalProvider, useTemporalFormatter, useTemporalReferenceDate } = await import('../.verification-dist/temporal/temporal-provider.js');
const { HostProvider } = await import('../.verification-dist/host-provider.js');
const { RadioGroupRoot, RadioGroupItem } = await import('../.verification-dist/radio-group.js');
const { ComboboxRoot, ComboboxInput, ComboboxContent, ComboboxItem, ComboboxResults } = await import('../.verification-dist/combobox.js');
const { createNativeFieldComponent, provideNativeFieldValueControl } = await import('../.verification-dist/input/native-field.js');
const {
  TimePickerRoot, TimePickerInput, TimePickerColumn, TimePickerItem,
  TimePickerTrigger, TimePickerContent, TimePickerClose,
} = await import('../.verification-dist/temporal/time-picker.js');

function timeChoiceColumns(parts) {
  return parts.map(part => h(TimePickerColumn, { key: part, part, label: part }, {
    default: state => state.choices.map(choice => h(TimePickerItem, { key: choice.id, value: choice.id })),
  }));
}

test('ComboboxResults reuses matching publication across windows and preserves the canonical IME baseline', async () => {
  const items = shallowRef([{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'k', label: '한글' }]);
  let reads = 0, results, state;
  const matches = (label, query) => { reads++; return label.startsWith(query); };
  const policies = shallowRef({ matches, eligible: id => id !== 'b' }), visible = shallowRef(['b']);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(ComboboxRoot, { items: items.value, renderedItems: visible.value, policies: policies.value,
    presentation: 'inline', defaultOpen: true, defaultInputValue: 'Beta', defaultValue: 'b', label: 'Search',
  }, { default: value => { state = value; return [h(ComboboxInput), h(ComboboxContent, null, {
    default: () => h(ComboboxResults, null, { default: projection => {
      results = projection.items;
      return results.filter(item => visible.value.includes(item.id)).map(item =>
        h('span', { key: item.id }, item.label));
    } }),
  })]; } }) });
  const settle = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  try {
    app.mount(host); await settle(); const input = host.querySelector('input'); input.focus();
    assert.deepEqual(results.map(item => item.id), ['b']); assert.equal(results[0], items.value[1]);
    assert.equal(Object.isFrozen(results), true);
    const original = results; reads = 0;
    for (const ids of [[], ['b'], []]) { visible.value = ids; await settle(); assert.equal(results, original); }
    assert.equal(reads, 0, 'Window-only publication must reuse the matching view');
    input.setSelectionRange(0, input.value.length); input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
    input.value = '한'; input.setSelectionRange(1, 1);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true })); await settle();
    assert.deepEqual(results.map(item => item.id), ['b']); assert.equal(state.value, 'b');
    input.value = '한글'; input.setSelectionRange(2, 2); input.dispatchEvent(new Event('compositionend', { bubbles: true }));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); await settle();
    assert.deepEqual(results.map(item => item.id), ['k']); assert.equal(state.value, 'b');
    policies.value = undefined; await settle(); assert.equal(results, items.value);
    items.value = [{ id: 'next', label: 'Next' }]; await settle(); assert.equal(results, items.value);
    policies.value = { matches }; await settle(); assert.deepEqual(results, []);
  } finally { app.unmount(); host.remove(); }
});

test('combobox rendered windows publish only mounted IDs without rebuilding text or the logical domain', async () => {
  let labelReads = 0, state; const proposals = [], choices = shallowRef(Array.from({ length: 5000 }, (_, index) => ({
    id: String(index), get label() { labelReads++; return 'Choice ' + index; },
  })));
  const visible = shallowRef(['0']);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(ComboboxRoot, { items: choices.value, renderedItems: visible.value,
    presentation: 'inline', defaultOpen: true, label: 'Choices', 'onUpdate:modelValue': value => proposals.push(value),
  }, { default: value => { state = value; return [h(ComboboxInput), h(ComboboxContent, { id: 'windowed-results' }, {
    default: () => (visible.value ?? choices.value.map(item => item.id)).filter(id => choices.value.some(item => item.id === id))
      .map(id => h(ComboboxItem, { value: id, key: id }, () => id)),
  })]; } }) });
  const settle = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  try {
    app.mount(host); await settle(); const input = host.querySelector('input'); input.focus();
    for (let step = 0; step < 2; step++) { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })); await settle(); }
    assert.equal(state.highlightedValue, '1'); assert.equal(input.hasAttribute('aria-activedescendant'), false);
    input.setSelectionRange(0, 0); const originalText = input.value; labelReads = 0;
    for (const ids of [['1'], [], ['1', 'stale', '1']]) {
      visible.value = ids; await settle();
      const active = input.getAttribute('aria-activedescendant');
      assert.equal(active === null ? null : document.getElementById(active)?.textContent, ids.length ? '1' : null);
      assert.equal(state.highlightedValue, '1'); assert.equal(state.value, null); assert.equal(input.value, originalText);
      assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 0]);
    }
    assert.equal(labelReads, 0, 'A window update must not rebuild the full-domain controller or label index');
    assert.deepEqual(proposals, []);
    choices.value = [{ id: 'replacement', label: 'Replacement' }]; await settle();
    assert.equal(input.hasAttribute('aria-activedescendant'), false);
    visible.value = ['replacement']; await settle();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })); await settle();
    assert.equal(state.highlightedValue, 'replacement'); assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).textContent, 'replacement');
    visible.value = undefined; await settle(); assert.equal(host.querySelectorAll('[role=option]').length, 1);
  } finally { app.unmount(); host.remove(); }
});

test('radio card compositions keep sibling actions and nested groups within their keyboard owners', async () => {
  const changes = [], nestedChanges = [];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(RadioGroupRoot, {
    items: ['standard', 'express'], defaultValue: 'standard', 'aria-label': 'Delivery service',
    'onUpdate:modelValue': value => changes.push(value),
  }, { default: () => [
    h(RadioGroupItem, { value: 'standard' }, () => h('span', null, 'Standard')),
    h(RadioGroupRoot, {
      items: ['standard', 'express'], defaultValue: 'standard', 'aria-label': 'Nested service',
      'onUpdate:modelValue': value => nestedChanges.push(value),
    }, { default: () => ['standard', 'express'].map(value => h(RadioGroupItem, { value }, () => value)) }),
    h(RadioGroupItem, { value: 'express' }, () => 'Express'),
    h('input', { 'aria-label': 'Delivery note' }),
    h('button', { type: 'button' }, 'Details'),
  ] }) });
  const key = (target, value, prevented = false) => {
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
    if (prevented) event.preventDefault();
    target.dispatchEvent(event);
    return event;
  };
  try {
    app.mount(host); await nextTick();
    const group = host.querySelector('[role="radiogroup"]'), nested = group.querySelector('[role="radiogroup"]');
    const outerRadios = [...group.children].filter(element => element.getAttribute('role') === 'radio');
    const input = group.querySelector('input'), details = [...group.children].find(element => element.textContent === 'Details');
    for (const [target, value] of [[input, 'ArrowDown'], [details, ' ']]) {
      target.focus();
      const event = key(target, value); await nextTick(); await nextTick();
      assert.equal(event.defaultPrevented, false);
      assert.deepEqual(changes, []);
      assert.equal(document.activeElement, target);
    }
    key(outerRadios[0], 'ArrowDown', true); await nextTick();
    assert.deepEqual(changes, []);
    const nestedRadio = nested.querySelector('[role="radio"]');
    nestedRadio.focus(); key(nestedRadio, 'ArrowDown'); await nextTick(); await nextTick();
    assert.deepEqual(nestedChanges, ['express']); assert.deepEqual(changes, []);
    assert.equal(document.activeElement, nested.querySelector('[aria-checked="true"]'));
    assert.equal(key(outerRadios[0].firstElementChild, 'ArrowDown').defaultPrevented, true);
    await nextTick(); await nextTick();
    assert.deepEqual(changes, ['express']); assert.equal(document.activeElement, outerRadios[1]);
    assert.equal(key(group, 'ArrowUp').defaultPrevented, true); await nextTick(); await nextTick();
    assert.deepEqual(changes, ['express', 'standard']); assert.equal(document.activeElement, outerRadios[0]);
  } finally { app.unmount(); host.remove(); }
});

test('time picker rendered windows preserve full-domain navigation, selection and option positions', async () => {
  const window = shallowRef([0]), initial = { hour: 9, minute: 30, second: 0, millisecond: 0 }, proposals = [];
  let highlighted;
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TimePickerRoot, { defaultValue: initial, 'onUpdate:modelValue': value => proposals.push(value) }, {
    default: () => [h(TimePickerInput), h(TimePickerColumn, { part: 'hour', label: 'Hours', renderedChoices: window.value }, {
      default: state => {
        highlighted = state.highlighted;
        return state.choices.filter(choice => window.value === undefined || window.value.includes(choice.id))
          .map(choice => h(TimePickerItem, { value: choice.id, key: choice.id }));
      },
    })],
  }) });
  try {
    app.mount(host); await nextTick(); const list = host.querySelector('[role="listbox"]'), input = host.querySelector('input');
    assert.equal(list.hasAttribute('aria-activedescendant'), false); assert.equal(highlighted, 9);
    window.value = [9]; await nextTick(); await nextTick();
    let option = list.querySelector('[role="option"]');
    assert.equal(list.getAttribute('aria-activedescendant'), option.id);
    assert.deepEqual([option.getAttribute('aria-posinset'), option.getAttribute('aria-setsize')], ['10', '24']);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await nextTick();
    assert.equal(highlighted, 10); assert.equal(list.hasAttribute('aria-activedescendant'), false);
    assert.equal(input.value, '09:30'); assert.deepEqual(proposals, []);
    window.value = [10]; await nextTick(); await nextTick();
    option = list.querySelector('[role="option"]');
    assert.equal(list.getAttribute('aria-activedescendant'), option.id);
    assert.equal(option.getAttribute('aria-posinset'), '11');
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await nextTick();
    assert.equal(input.value, '10:30'); assert.deepEqual(proposals, [{ ...initial, hour: 10 }]);
    window.value = []; await nextTick(); await nextTick();
    assert.equal(list.hasAttribute('aria-activedescendant'), false); assert.equal(input.value, '10:30');
    window.value = undefined; await nextTick(); await nextTick();
    assert.equal(list.querySelectorAll('[role="option"]').length, 24);
    assert.equal(list.getAttribute('aria-activedescendant'), [...list.querySelectorAll('[role="option"]')].find(option => option.textContent === '10').id);
    assert.equal(proposals.length, 1);
  } finally { app.unmount(); host.remove(); }
});

test('time picker delegates native editing, column activation and bounded selection without duplicate proposals', async () => {
  const initial = { hour: 9, minute: 30, second: 0, millisecond: 0 }, proposals = [];
  const disabled = shallowRef(false), readonly = shallowRef(false);
  let picker, inputView;
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TimePickerRoot, {
    defaultValue: initial, policies: { min: initial }, disabled: disabled.value, readonly: readonly.value,
    ref: value => { if (value) picker = value; }, 'onUpdate:modelValue': value => proposals.push(value),
  }, { default: state => [h(TimePickerInput, { label: 'Delivery time', ref: value => { if (value) inputView = value; } }), ...timeChoiceColumns(state.parts)] }) });
  let unmounted = false;
  try {
    app.mount(host); await nextTick(); const input = host.querySelector('input'), saved = picker.selectChoice;
    assert.equal(picker.element === input, true); assert.equal(inputView.element === input, true);
    assert.equal(input.value, '09:30'); assert.equal(host.querySelectorAll('[role="option"]').length, 84);
    assert.equal(host.querySelectorAll('select').length, 0);
    assert.equal(saved('hour', 8), false); assert.equal(saved('timezone', 0), false); assert.equal(saved('hour', -1), false);
    const hour = host.querySelector('[data-time-part="hour"]');
    [...hour.querySelectorAll('[role="option"]')].find(option => option.textContent === '10').click();
    await nextTick(); assert.equal(input.value, '10:30'); assert.equal(proposals.length, 1);
    const minute = host.querySelector('[data-time-part="minute"]');
    minute.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    minute.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick(); assert.equal(input.value, '10:31'); assert.equal(proposals.length, 2);
    input.value = '10:'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    assert.equal(saved('minute', 45), true); await nextTick(); assert.equal(input.value, '10:45');
    input.dispatchEvent(new Event('compositionstart', { bubbles: true })); await nextTick();
    assert.equal(saved('hour', 11), false); assert.equal(minute.hasAttribute('data-readonly'), true);
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); await nextTick();
    disabled.value = true; await nextTick(); assert.equal(saved('hour', 11), false);
    disabled.value = false; readonly.value = true; await nextTick(); assert.equal(saved('hour', 11), false);
    readonly.value = false; await nextTick();
    inputView.focus(); assert.equal(document.activeElement === input, true);
    inputView.select(); assert.deepEqual([input.selectionStart, input.selectionEnd], [0, input.value.length]);
    assert.equal(proposals.length, 3);
    app.unmount(); unmounted = true;
    assert.equal(picker.element, null); assert.equal(inputView.element, null); assert.equal(saved('hour', 12), false);
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

for (const controlled of [false, true]) test(`time selection command replaces drafts in the requested format and releases its binding (${controlled ? 'controlled' : 'uncontrolled'})`, async () => {
  const initial = { hour: 9, minute: 30, second: 0, millisecond: 0 };
  const accepted = shallowRef(initial), precision = shallowRef('minute'), disabled = shallowRef(false), readonly = shallowRef(false);
  const proposals = []; let port = null, detached = 0;
  const BoundInput = defineComponent({ setup() {
    provideNativeFieldValueControl(value => { port = value; return () => { port = null; detached++; }; });
    return () => h(TimeField, { ...(controlled ? { modelValue: accepted.value } : { defaultValue: initial }), precision: precision.value,
      disabled: disabled.value, readonly: readonly.value, 'onUpdate:modelValue': value => proposals.push(value) });
  } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp(BoundInput); let unmounted = false;
  try {
    assert.equal(port, null); app.mount(host); await nextTick();
    const input = host.querySelector('input'), saved = port;
    assert.equal(saved.element === input, true); assert.equal(saved.composing.value, false);
    input.value = '09:'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    accepted.value = { ...initial, hour: 10 }; await nextTick();
    assert.equal(input.value, '09:', 'passive synchronization does not replace a dirty draft');
    precision.value = 'second'; await nextTick(); assert.equal(input.value, '09:');
    const chosen = { hour: 11, minute: 45, second: 20, millisecond: 0 };
    disabled.value = true; await nextTick(); assert.equal(saved.commit(chosen), false);
    disabled.value = false; readonly.value = true; await nextTick(); assert.equal(saved.commit(chosen), false);
    readonly.value = false; await nextTick();
    input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
    assert.equal(saved.composing.value, true); assert.equal(saved.commit(chosen), false);
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); await nextTick();
    assert.equal(saved.composing.value, false); assert.deepEqual(proposals, []);
    assert.equal(saved.commit(chosen), true); await nextTick();
    assert.equal(input.value, '11:45:20'); assert.deepEqual(proposals, [chosen]);
    assert.equal(saved.commit({ ...chosen, hour: 25 }), false); assert.deepEqual(proposals, [chosen]);
    app.unmount(); unmounted = true;
    assert.equal(port, null); assert.equal(detached, 1); assert.equal(saved.element, null);
    assert.equal(saved.composing.value, false); assert.equal(saved.commit(initial), false);
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

test('date presentation follows the provider and settles pending locale changes without losing drafts or IME', async () => {
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'UTC' }), proposals = [];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TemporalProvider, { formatting: formatting.value, referenceDate: { year: 2026, month: 10, day: 14 } }, {
    default: () => h(DateField, { defaultValue: { year: 2026, month: 10, day: 14 }, 'onUpdate:modelValue': value => proposals.push(value) }),
  }) });
  try {
    app.mount(host); await nextTick(); const input = host.querySelector('input'); input.focus();
    assert.equal(input.value, '10/14/2026'); assert.equal(input.placeholder, 'MM/DD/YYYY');
    input.setSelectionRange(0, 2);
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.equal(input.value, '14/10/2026'); assert.deepEqual([input.selectionStart, input.selectionEnd], [3, 5]); assert.deepEqual(proposals, []);
    input.value = '14/10/'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); assert.equal(input.getAttribute('aria-invalid'), 'true');
    formatting.value = { locale: 'en-US', timeZone: 'UTC' }; await nextTick(); assert.equal(input.value, '14/10/');
    assert.equal(input.getAttribute('aria-invalid'), 'true', 'locale-only deferral retains the existing invalid draft connection');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.equal(input.value, '10/14/2026'); assert.deepEqual(proposals, []);
    input.dispatchEvent(new Event('compositionstart', { bubbles: true })); input.value = '10/구/2026';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick(); assert.equal(input.value, '10/구/2026');
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.equal(input.value, '14/10/2026'); assert.deepEqual(proposals, []);
  } finally { app.unmount(); host.remove(); }
});

test('time presentation follows locale and precision while dirty and IME edits defer conversion', async () => {
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'UTC' }), precision = shallowRef('minute'), proposals = [];
  const value = { hour: 15, minute: 24, second: 0, millisecond: 0 };
  const render = () => h(TemporalProvider, { formatting: formatting.value, referenceDate: { year: 2026, month: 10, day: 14 } }, {
    default: () => h(TimeField, { defaultValue: value, precision: precision.value, 'onUpdate:modelValue': next => proposals.push(next) }),
  });
  const ssr = await renderToString(createSSRApp({ render }));
  assert.match(ssr, /03:24.*PM/u); assert.match(ssr, /inputmode="text"/u);
  const host = document.createElement('div'); document.body.append(host); const app = createApp({ render });
  let input;
  try {
    app.mount(host); await nextTick(); input = host.querySelector('input'); input.focus(); input.setSelectionRange(0, 2);
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.equal(input.value, '15:24'); assert.equal(input.inputMode, 'numeric'); assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 2]);
    input.value = '15:'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    precision.value = 'second'; await nextTick(); assert.equal(input.value, '15:');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.equal(input.value, '15:24:00'); assert.equal(input.placeholder, 'HH:mm:ss');
    input.dispatchEvent(new Event('compositionstart', { bubbles: true })); input.value = '15:구:00';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
    formatting.value = { locale: 'en-US', timeZone: 'UTC' }; await nextTick(); assert.equal(input.value, '15:구:00');
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.match(input.value, /^03:24:00.*PM$/u); assert.equal(input.inputMode, 'text'); assert.deepEqual(proposals, []);
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; app.unmount(); await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); assert.deepEqual(proposals, []);
  } finally { app.unmount(); host.remove(); }
});

test('time SSR preserves full values by default, admits explicit standalone precision and retains native ISO', async () => {
  const value = { hour: 15, minute: 24, second: 38, millisecond: 125 };
  const render = props => h(TemporalProvider, { formatting: { locale: 'en-GB', timeZone: 'UTC' }, referenceDate: { year: 2026, month: 10, day: 14 } }, {
    default: () => h(TimeField, { defaultValue: value, ...props }),
  });
  assert.match(await renderToString(createSSRApp({ render: () => render({}) })), /value="15:24:38\.125"/u);
  assert.match(await renderToString(createSSRApp({ render: () => render({ native: true, precision: 'minute' }) })), /type="time".*value="15:24:38\.125"/u);
  await assert.rejects(renderToString(createSSRApp({ render: () => render({ precision: 'minute' }) })), /precision|represented/i);
  assert.match(await renderToString(createSSRApp({ render: () => h(TimeField, { defaultValue: { ...value, millisecond: 0 }, precision: 'second' }) })), /value="15:24:38"/u);
});

test('Temporal provider formatter replacement updates nested projections without per-render reconstruction', async () => {
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'America/Los_Angeles' });
  const referenceInstant = shallowRef(Date.UTC(2026, 9, 14, 0, 30));
  const unrelated = shallowRef(0);
  const childFormatting = shallowRef(undefined);
  let projected;
  const Output = defineComponent({ setup() {
    projected = useTemporalFormatter(); const date = useTemporalReferenceDate();
    return () => h('output', projected.value.date(date.value).value);
  } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TemporalProvider, { formatting: formatting.value, referenceInstant: referenceInstant.value }, {
    default: () => [h('span', String(unrelated.value)), h(TemporalProvider, { formatting: childFormatting.value }, { default: () => h(Output) })],
  }) });
  try {
    app.mount(host); await nextTick();
    assert.equal(host.querySelector('output').textContent, '10/13/2026');
    const initial = projected.value;
    unrelated.value++; await nextTick(); assert.equal(projected.value, initial);
    formatting.value = { locale: 'en-GB', timeZone: 'Asia/Seoul' }; await nextTick();
    assert.equal(host.querySelector('output').textContent, '14/10/2026');
    assert.notEqual(projected.value, initial);
    const replacement = projected.value;
    referenceInstant.value = Date.UTC(2026, 9, 15, 0, 30); await nextTick();
    assert.equal(host.querySelector('output').textContent, '15/10/2026');
    assert.equal(projected.value, replacement, 'changing the instant borrows the admitted formatter');
    childFormatting.value = { locale: 'en-US', timeZone: 'UTC' }; await nextTick();
    assert.equal(host.querySelector('output').textContent, '10/15/2026');
    assert.notEqual(projected.value, replacement);
    childFormatting.value = undefined; await nextTick();
    assert.equal(host.querySelector('output').textContent, '15/10/2026');
    assert.equal(projected.value, replacement, 'undefined resumes nearest-parent inheritance');
  } finally { app.unmount(); host.remove(); }
});
const { FormRoot, FormField } = await import('../.verification-dist/form.js');

test('time picker preserves authored undefined flags and rejects commands while its host is inactive', async () => {
  const overrides = shallowRef({}), active = shallowRef(true), initial = { hour: 9, minute: 30, second: 0, millisecond: 0 };
  let picker; const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(HostProvider, { active: active.value }, { default: () => h(FormRoot, {}, {
    default: () => h(FormField, { name: 'delivery', disabled: true, readonly: true, required: true }, {
      default: () => h(TimePickerRoot, { defaultValue: initial, ...overrides.value, ref: value => { if (value) picker = value; } },
        { default: () => h(TimePickerInput) }),
    }),
  }) }) });
  try {
    app.mount(host); await nextTick(); const input = host.querySelector('input');
    assert.deepEqual([input.disabled, input.readOnly, input.required], [true, true, true]);
    overrides.value = { disabled: undefined, readonly: undefined, required: undefined }; await nextTick(); await nextTick();
    assert.deepEqual([input.disabled, input.readOnly, input.required], [false, false, false]);
    assert.equal(picker.selectChoice('hour', 10), true); await nextTick();
    active.value = false; await nextTick(); assert.equal(picker.selectChoice('hour', 11), false);
    active.value = true; await nextTick(); assert.equal(picker.selectChoice('hour', 11), true);
    overrides.value = {}; await nextTick(); await nextTick();
    assert.deepEqual([input.disabled, input.readOnly, input.required], [true, true, true]);
  } finally { app.unmount(); host.remove(); }
});

test('time picker rejects multiple native inputs in one root', async () => {
  await assert.rejects(renderToString(createSSRApp({ render: () => h(TimePickerRoot, {}, {
    default: () => [h(TimePickerInput), h(TimePickerInput)],
  }) })), /at most one TimePickerInput/u);
});

for (const controlled of [false, true]) test('time picker keeps one native Form participant and reset ownership (' + (controlled ? 'controlled' : 'uncontrolled') + ')', async () => {
  const initial = { hour: 9, minute: 30, second: 0, millisecond: 0 }, accepted = shallowRef(initial), metadata = shallowRef({});
  const host = document.createElement('div'); document.body.append(host);
  const proposals = []; let form, picker;
  const render = () => h(FormRoot, { ref: value => { if (value) form = value; } }, {
    default: () => h(FormField, { name: 'delivery' }, {
      default: () => h(TimePickerRoot, { ...(controlled ? { modelValue: accepted.value } : { defaultValue: initial }),
        ...metadata.value, ref: value => { if (value) picker = value; }, 'onUpdate:modelValue': value => proposals.push(value),
      }, { default: state => [h(TimePickerInput, { label: 'Time' }), ...timeChoiceColumns(state.parts)] }),
    }),
  });
  const ssr = await renderToString(createSSRApp({ render }));
  assert.equal((ssr.match(/<input\b/gu) ?? []).length, 1); assert.equal((ssr.match(/<select\b/gu) ?? []).length, 0);
  assert.ok(ssr.includes('name="delivery"')); assert.ok(ssr.includes('value="09:30"'));
  const app = createApp({ render });
  try {
    app.mount(host); await nextTick(); const input = host.querySelector('input'), nativeForm = host.querySelector('form');
    assert.deepEqual([...new FormData(nativeForm).entries()], [['delivery', '09:30']]);
    if (controlled) { accepted.value = { ...initial, hour: 10 }; await nextTick(); }
    assert.equal(picker.selectChoice('hour', 11), true); await nextTick(); assert.equal(proposals.length, 1);
    for (let index = 0; index < 10; index++) form.reset(); await nextTick(); await nextTick();
    const expected = controlled ? '10:30' : '09:30';
    assert.equal(input.value, expected); assert.deepEqual([...new FormData(nativeForm).entries()], [['delivery', expected]]);
    assert.equal(proposals.length, 1, 'reset does not propose a new selected value');
    for (const [next, names] of [[{ name: undefined, form: undefined }, [null, null]],
      [{ name: 'parcel[0001]', form: 'external' }, ['parcel[0001]', 'external']],
      [{}, ['delivery', null]]]) {
      metadata.value = next; await nextTick(); await nextTick();
      assert.deepEqual([input.getAttribute('name'), input.getAttribute('form')], names);
      assert.equal(host.querySelector('input') === input, true); assert.equal(input.value, expected);
    }
    assert.equal(host.querySelector('[data-scope="time-picker"][data-part="root"]').hasAttribute('name'), false);
    assert.equal(host.querySelectorAll('select').length, 0);
  } finally { app.unmount(); host.remove(); }
});

test('time picker borrows localized formats and admits popup-only selection without a native actor', async () => {
  const initial = { hour: 9, minute: 30, second: 0, millisecond: 0 }, proposals = [];
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'UTC' });
  let picker;
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TemporalProvider, { formatting: formatting.value }, {
    default: () => h(TimePickerRoot, { defaultValue: initial, ref: value => { if (value) picker = value; },
      'onUpdate:modelValue': value => proposals.push(value),
    }, { default: state => timeChoiceColumns(state.parts) }),
  }) });
  try {
    app.mount(host); await nextTick();
    assert.equal(picker.element, null); assert.equal(host.querySelectorAll('input, select').length, 0);
    assert.equal(host.querySelectorAll('[role="option"]').length, 74);
    assert.equal(picker.selectChoice('dayPeriod', 1), true); await nextTick();
    assert.deepEqual(proposals, [{ ...initial, hour: 21 }]);
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.equal(host.querySelector('[data-time-part="dayPeriod"]'), null);
    assert.equal(host.querySelectorAll('[role="option"]').length, 84);
    assert.equal(picker.selectChoice('dayPeriod', 0), false);
    assert.equal(picker.selectChoice('hour', 13), true); await nextTick();
    assert.deepEqual(proposals[1], { ...initial, hour: 13 });
  } finally { app.unmount(); host.remove(); }
});

test('time picker delegates popup open and close while closed content stays unmounted', async () => {
  const host = document.createElement('div'); document.body.append(host); const opens = [];
  let picker;
  const render = () => h(TimePickerRoot, { label: 'Choose delivery time', position: false, autoFocus: false,
    ref: value => { if (value) picker = value; }, 'onUpdate:open': open => opens.push(open),
  }, { default: () => [h(TimePickerInput), h(TimePickerTrigger, null, { default: () => 'Choose' }),
    h(TimePickerContent, null, { default: state => [...timeChoiceColumns(state.columns.map(column => column.part)), h(TimePickerClose, null, { default: () => 'Done' })] })] });
  const ssr = await renderToString(createSSRApp({ render }));
  assert.equal(ssr.includes('role="listbox"'), false);
  const app = createApp({ render });
  try {
    app.mount(host); await nextTick(); assert.equal(host.querySelector('[role="listbox"]'), null);
    host.querySelector('button').click(); await nextTick(); await nextTick();
    assert.equal(host.querySelectorAll('[role="option"]').length, 84); assert.deepEqual(opens, [true]);
    picker.requestClose(); await nextTick(); await nextTick();
    assert.equal(host.querySelector('[role="listbox"]'), null); assert.deepEqual(opens, [true, false]);
  } finally { app.unmount(); host.remove(); }
});
const { DateRangeFieldRoot, DateRangeFieldStartInput, DateRangeFieldEndInput } = await import('../.verification-dist/temporal/date-range-field.js');
const { TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput } = await import('../.verification-dist/temporal/time-range-field.js');
const { DateTimeRangeFieldRoot, DateTimeRangeFieldStartInput, DateTimeRangeFieldEndInput } = await import('../.verification-dist/temporal/date-time-range-field.js');

test('date-time range Provider presentation keeps both dates and defers locale changes until drafts settle', async () => {
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'UTC' }), proposals = [];
  const value = {
    start: { date: { year: 2026, month: 10, day: 14 }, time: { hour: 23, minute: 0, second: 0, millisecond: 0 } },
    end: { date: { year: 2026, month: 10, day: 15 }, time: { hour: 1, minute: 0, second: 0, millisecond: 0 } },
  };
  const render = () => h(TemporalProvider, { formatting: formatting.value, referenceDate: value.start.date }, {
    default: () => h(DateTimeRangeFieldRoot, { defaultValue: value, precision: 'minute', 'onUpdate:modelValue': next => proposals.push(next) }, {
      default: () => [h(DateTimeRangeFieldStartInput), h(DateTimeRangeFieldEndInput)],
    }),
  });
  const ssr = await renderToString(createSSRApp({ render }));
  assert.match(ssr, /value="10\/14\/2026, 11:00.*PM"/u);
  assert.match(ssr, /value="10\/15\/2026, 01:00.*AM"/u);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render });
  try {
    app.mount(host); await nextTick(); const [start, end] = host.querySelectorAll('input');
    assert.equal(start.inputMode, 'text');
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['14/10/2026, 23:00', '15/10/2026, 01:00']);
    end.value = '15/10/'; end.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    formatting.value = { locale: 'en-US', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['14/10/2026, 23:00', '15/10/']);
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.match(start.value, /^10\/14\/2026, 11:00.*PM$/u);
    assert.match(end.value, /^10\/15\/2026, 01:00.*AM$/u);
    assert.deepEqual(proposals, []);
  } finally { app.unmount(); host.remove(); }
});

test('date-time Provider presentation preserves drafts and IME and resets through the shared Form owner', async () => {
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'UTC' }), precision = shallowRef('minute'), proposals = [];
  const initial = { date: { year: 2026, month: 10, day: 14 }, time: { hour: 15, minute: 24, second: 0, millisecond: 0 } };
  let form, unmounted = false;
  const render = () => h(FormRoot, { ref: value => { if (value) form = value; } }, {
    default: () => h(TemporalProvider, { formatting: formatting.value, referenceDate: initial.date }, {
      default: () => h(FormField, { name: 'scheduled' }, { default: () => h(DateTimeField, { defaultValue: initial, precision: precision.value, 'onUpdate:modelValue': value => proposals.push(value) }) }),
    }),
  });
  const ssr = await renderToString(createSSRApp({ render })); assert.match(ssr, /10\/14\/2026, 03:24.*PM/u);
  const host = document.createElement('div'); document.body.append(host); const app = createApp({ render });
  try {
    app.mount(host); await nextTick(); const input = host.querySelector('input'); input.focus(); input.setSelectionRange(0, 2);
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.equal(input.value, '14/10/2026, 15:24'); assert.deepEqual([input.selectionStart, input.selectionEnd], [3, 5]);
    input.value = '14/10/'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    precision.value = 'second'; await nextTick(); assert.equal(input.value, '14/10/');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.equal(input.value, '14/10/2026, 15:24:00'); assert.equal(input.placeholder, 'DD/MM/YYYY, HH:mm:ss');
    input.dispatchEvent(new Event('compositionstart', { bubbles: true })); input.value = '14/구/2026, 15:24:00';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
    formatting.value = { locale: 'en-US', timeZone: 'UTC' }; await nextTick(); assert.equal(input.value, '14/구/2026, 15:24:00');
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.match(input.value, /^10\/14\/2026, 03:24:00.*PM$/u); assert.deepEqual(proposals, []);
    input.value = input.value.replace('03:24:00', '04:30:00'); input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await nextTick();
    assert.equal(proposals.length, 1); assert.equal(proposals[0].time.hour, 16); assert.equal(proposals[0].time.minute, 30);
    for (let index = 0; index < 20; index++) form.reset(); await nextTick(); await nextTick();
    assert.match(input.value, /^10\/14\/2026, 03:24:00.*PM$/u); assert.equal(proposals.length, 1);
    form.reset(); app.unmount(); unmounted = true; await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); assert.equal(proposals.length, 1);
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

test('date-time SSR defaults preserve precision, standalone uses ISO and native ignores presentation', async () => {
  const value = { date: { year: 2026, month: 10, day: 14 }, time: { hour: 15, minute: 24, second: 38, millisecond: 125 } };
  const render = props => h(TemporalProvider, { formatting: { locale: 'en-GB', timeZone: 'UTC' }, referenceDate: value.date }, {
    default: () => h(DateTimeField, { defaultValue: value, ...props }),
  });
  assert.match(await renderToString(createSSRApp({ render: () => render({}) })), /value="14\/10\/2026, 15:24:38\.125"/u);
  assert.match(await renderToString(createSSRApp({ render: () => render({ native: true, precision: 'minute' }) })), /type="datetime-local".*value="2026-10-14T15:24:38\.125"/u);
  await assert.rejects(renderToString(createSSRApp({ render: () => render({ precision: 'minute' }) })), /precision/i);
  assert.match(await renderToString(createSSRApp({ render: () => h(DateTimeField, { defaultValue: { ...value, time: { ...value.time, millisecond: 0 } }, precision: 'second' }) })), /value="2026-10-14T15:24:38"/u);
});

test('time range Provider presentation defers both endpoints until drafts and IME settle', async () => {
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'UTC' }), precision = shallowRef('minute'), proposals = [];
  const value = { start: { hour: 9, minute: 30, second: 0, millisecond: 0 }, end: { hour: 17, minute: 45, second: 0, millisecond: 0 } };
  const render = () => h(TemporalProvider, { formatting: formatting.value, referenceDate: { year: 2026, month: 10, day: 14 } }, {
    default: () => h(TimeRangeFieldRoot, { defaultValue: value, precision: precision.value, 'onUpdate:modelValue': next => proposals.push(next) }, {
      default: () => [h(TimeRangeFieldStartInput), h(TimeRangeFieldEndInput)],
    }),
  });
  const ssr = await renderToString(createSSRApp({ render }));
  assert.match(ssr, /value="09:30.*AM"/u); assert.match(ssr, /value="05:45.*PM"/u);
  assert.equal(ssr.split('inputmode="text"').length - 1, 2);
  const host = document.createElement('div'); document.body.append(host); const app = createApp({ render });
  try {
    app.mount(host); await nextTick(); const [start, end] = host.querySelectorAll('input');
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['09:30', '17:45']); assert.equal(start.inputMode, 'numeric');
    end.value = '17:'; end.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    formatting.value = { locale: 'en-US', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['09:30', '17:']); assert.equal(start.inputMode, 'numeric');
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.match(start.value, /^09:30.*AM$/u); assert.match(end.value, /^05:45.*PM$/u); assert.equal(start.inputMode, 'text');
    for (const input of [start, end]) {
      input.dispatchEvent(new Event('compositionstart', { bubbles: true })); input.value = '구:';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
    }
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['구:', '구:']);
    end.dispatchEvent(new Event('compositionend', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); await nextTick();
    assert.equal(start.value, '구:'); assert.equal(start.inputMode, 'text');
    start.dispatchEvent(new Event('compositionend', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); await nextTick();
    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.deepEqual([start.value, end.value], ['09:30', '17:45']);
    precision.value = 'second'; await nextTick();
    assert.deepEqual([start.value, end.value], ['09:30:00', '17:45:00']); assert.equal(end.placeholder, 'HH:mm:ss'); assert.deepEqual(proposals, []);
  } finally { app.unmount(); host.remove(); }
});

test('date range provider presentation switches atomically after both drafts and compositions settle', async () => {
  const formatting = shallowRef({ locale: 'en-US', timeZone: 'UTC' });
  const proposals = [];
  const value = { start: { year: 2026, month: 10, day: 14 }, end: { year: 2026, month: 10, day: 18 } };
  const render = () => h(TemporalProvider, { formatting: formatting.value, referenceDate: value.start }, {
    default: () => h(DateRangeFieldRoot, { defaultValue: value, 'onUpdate:modelValue': v => proposals.push(v) }, {
      default: () => [h(DateRangeFieldStartInput), h(DateRangeFieldEndInput)],
    }),
  });
  const ssr = await renderToString(createSSRApp({ render }));
  assert.match(ssr, /value="10\/14\/2026"/);
  assert.match(ssr, /value="10\/18\/2026"/);
  assert.match(ssr, /placeholder="MM\/DD\/YYYY"/);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render });
  try {
    app.mount(host); await nextTick();
    const [start, end] = host.querySelectorAll('input');
    start.focus(); start.setSelectionRange(0, 2);
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['14/10/2026', '18/10/2026']);
    assert.deepEqual([start.selectionStart, start.selectionEnd], [3, 5]);
    end.value = '18/10/'; end.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(end.getAttribute('aria-invalid'), 'true');
    formatting.value = { locale: 'en-US', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['14/10/2026', '18/10/']);
    assert.equal(end.getAttribute('aria-invalid'), 'true');
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.deepEqual([start.value, end.value], ['10/14/2026', '10/18/2026']);
    start.dispatchEvent(compositionEvent('compositionstart')); end.dispatchEvent(compositionEvent('compositionstart'));
    end.value = '10/구/2026'; end.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await nextTick();
    assert.deepEqual([start.value, end.value], ['10/14/2026', '10/구/2026']);
    start.dispatchEvent(compositionEvent('compositionend')); await nextTick();
    assert.equal(start.value, '10/14/2026');
    end.dispatchEvent(compositionEvent('compositionend')); await new Promise(resolve => setTimeout(resolve, 0)); await nextTick();
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); await nextTick();
    assert.deepEqual([start.value, end.value], ['14/10/2026', '18/10/2026']);
    assert.deepEqual(proposals, []);
    let connections = 0; const add = start.addEventListener.bind(start);
    start.addEventListener = (...args) => { connections++; return add(...args); };
    formatting.value = { locale: 'en-US', timeZone: 'UTC' };
    app.unmount(); await nextTick();
    assert.equal(connections, 0);
  } finally { app.unmount(); host.remove(); }
});

for (const [name, Root, Start, End, text] of [
  ['date', DateRangeFieldRoot, DateRangeFieldStartInput, DateRangeFieldEndInput, '2026-10-14'],
  ['time', TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput, '09:30'],
  ['date-time', DateTimeRangeFieldRoot, DateTimeRangeFieldStartInput, DateTimeRangeFieldEndInput, '2026-10-14T23:30'],
]) test(`${name} range retains a committed partial endpoint through host reconfiguration`, async () => {
  const label = shallowRef('initial'), proposals = [];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Root, { startLabel: label.value, 'onUpdate:modelValue': v => proposals.push(v) }, {
    default: () => [h(Start), h(End)],
  }) });
  try {
    app.mount(host); await nextTick(); const [start, end] = host.querySelectorAll('input');
    start.value = text; start.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    label.value = 'updated'; await nextTick(); await nextTick();
    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.deepEqual([start.value, end.value], [text, '']);
    assert.equal(start.getAttribute('aria-label'), 'updated');
    assert.deepEqual(proposals, []);
  } finally { app.unmount(); host.remove(); }
});

for (const [kind, Root, Start, End, time, text] of [
  ['time', TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput,
    hour => ({ hour, minute: 30, second: 0, millisecond: 0 }), hour => String(hour).padStart(2, '0') + ':30'],
  ['date-time', DateTimeRangeFieldRoot, DateTimeRangeFieldStartInput, DateTimeRangeFieldEndInput,
    hour => ({ date: { year: 2026, month: 10, day: 14 }, time: { hour, minute: 30, second: 0, millisecond: 0 } }),
    hour => '2026-10-14T' + String(hour).padStart(2, '0') + ':30'],
]) for (const controlled of [false, true]) test(`${kind} range Form reset restores ${controlled ? 'accepted controlled' : 'initial uncontrolled'} values and coalesces work`, async () => {
  const initial = { start: time(9), end: time(17) }, accepted = shallowRef(initial), proposals = [];
  const host = document.createElement('div'); document.body.append(host); let form;
  const render = () => h(FormRoot, { ref: value => { if (value) form = value; } }, {
    default: () => h(FormField, { name: 'hours' }, { default: () => h(Root, {
      ...(controlled ? { modelValue: accepted.value } : { defaultValue: initial }),
      'onUpdate:modelValue': value => proposals.push(value),
    }, { default: () => [h(Start), h(End)] }) }),
  });
  const ssr = await renderToString(createSSRApp({ render }));
  assert.equal((ssr.match(/<input\b/gu) ?? []).length, 2);
  assert.ok(ssr.includes('name="hours.start"')); assert.ok(ssr.includes('name="hours.end"'));
  assert.ok(ssr.includes('value="' + text(9) + '"')); assert.ok(ssr.includes('value="' + text(17) + '"'));
  const app = createApp({ render });
  try {
    app.mount(host); await nextTick(); const [start, end] = host.querySelectorAll('input');
    if (controlled) { accepted.value = { start: time(10), end: time(18) }; await nextTick(); }
    end.value = text(19); end.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await nextTick();
    assert.equal(proposals.length, 1);
    let reconnects = 0; const add = start.addEventListener.bind(start);
    start.addEventListener = (...args) => { if (args[0] === 'keydown') reconnects++; return add(...args); };
    for (let index = 0; index < 20; index++) form.reset();
    await nextTick(); await nextTick();
    assert.equal(reconnects, 1);
    const expected = controlled ? [text(10), text(18)] : [text(9), text(17)];
    assert.deepEqual([start.value, end.value], expected);
    assert.deepEqual([...new FormData(host.querySelector('form')).entries()], [['hours.start', expected[0]], ['hours.end', expected[1]]]);
    assert.equal(proposals.length, 1, 'reset is not a new value proposal');
    form.reset(); app.unmount(); await nextTick(); await nextTick();
    assert.equal(reconnects, 1, 'unmount cancels the pending reset generation');
    end.value = text(20); end.dispatchEvent(new InputEvent('input', { bubbles: true }));
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(proposals.length, 1);
  } finally { app.unmount(); host.remove(); }
});

function compositionEvent(type, data = '') {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'data', { value: data });
  return event;
}

test('native field reset coalesces reconnects and cancels disconnected work', async () => {
  let connects = 0, disconnects = 0, root, unmounted = false;
  // This fixture measures the real Vue adapter's scheduling boundary, not a
  // substitute date reducer. Semantic editing is covered by the real fields.
  const Field = createNativeFieldComponent({ name: 'ScheduledField', scope: 'scheduled-field', inputMode: 'text', valueType: String,
    formatValue: value => value, create: options => {
      connects++; const value = options.value ?? options.defaultValue ?? '';
      return { getSnapshot: () => ({ revision: 0 }), getValue: () => value, getText: () => value,
        syncControlledValues: () => ({ ok: true }), disconnect: () => { disconnects++; } };
    } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(FormRoot, { ref: value => { if (value) root = value; } }, {
    default: () => h(FormField, { name: 'value' }, { default: () => h(Field, { defaultValue: 'baseline' }) }),
  }) });
  try {
    app.mount(host); await nextTick(); await nextTick(); assert.equal(connects, 1);
    for (let index = 0; index < 20; index++) root.reset();
    await nextTick(); assert.equal(connects, 2); assert.equal(disconnects, 1);
    root.reset(); app.unmount(); unmounted = true; await nextTick(); assert.equal(connects, 2); assert.equal(disconnects, 2);
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

test('quantity field renders initial text and units on the server and preserves Vue option ownership', async () => {
  const policies = createStandardQuantityPolicies('metre', 'metric');
  const label = shallowRef('Length');
  const disabled = shallowRef(false), readonly = shallowRef(false);
  let optionVisits = 0;
  const ObservedSelect = defineComponent({ inheritAttrs: false, setup(_props, { attrs, slots }) {
    return () => { const options = slots.default?.() ?? []; optionVisits += options.length; return h('select', attrs, options); };
  } });
  const children = () => [h(QuantityFieldInput), h(QuantityFieldUnitSelect, { as: ObservedSelect })];
  const props = () => ({ policies, label: label.value, disabled: disabled.value, readonly: readonly.value,
    defaultValue: { value: '1.5', unit: 'metre' }, defaultDisplayUnit: 'centimetre' });
  const html = await renderToString(createSSRApp({ render: () => h(QuantityFieldRoot, props(), { default: children }) }));
  assert.match(html, /<input[^>]*value="150"/);
  assert.match(html, /<option[^>]*value="centimetre"[^>]*selected[^>]*>cm<\/option>/);
  assert.match(html, /aria-label="Length unit"/);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(QuantityFieldRoot, props(), { default: children }) });
  try {
    app.mount(host); await nextTick();
    const input = host.querySelector('input'), select = host.querySelector('select');
    assert.equal(input.value, '150'); assert.equal(select.value, 'centimetre');
    const option = [...select.options].find(option => option.value === 'centimetre');
    const initialOptionVisits = optionVisits;
    for (const text of ['2', '23', '234']) {
      input.value = text;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      await nextTick();
    }
    assert.equal(optionVisits, initialOptionVisits, 'text-only updates do not process unchanged unit options');
    assert.equal(input.value, '234');
    readonly.value = true; await nextTick();
    assert.equal(select.getAttribute('aria-readonly'), 'true');
    disabled.value = true; await nextTick(); assert.equal(select.disabled, true);
    readonly.value = false; disabled.value = false; await nextTick();
    assert.equal(select.hasAttribute('aria-readonly'), false); assert.equal(select.disabled, false);
    label.value = 'Parcel length'; await nextTick();
    assert.equal([...select.options].find(option => option.value === 'centimetre'), option);
    select.value = 'metre'; select.dispatchEvent(new Event('change', { bubbles: true })); await nextTick();
    assert.equal(input.value, '1.5'); assert.equal(select.value, 'metre');
    input.value = 'invalid'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await nextTick();
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(host.querySelector('[data-part="root"]').hasAttribute('data-invalid'), true);
  } finally { app.unmount(); host.remove(); }
});

test('native date-time field mounts and commits without text selection APIs', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(DateTimeField, {
      native: true,
      defaultValue: {
        date: { year: 2026, month: 8, day: 22 },
        time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
      },
      'onUpdate:modelValue': (value) => updates.push(value),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.equal(input?.type, 'datetime-local');
  assert.equal(input?.value, '2026-08-22T09:30');

  input.value = '2026-08-23T10:45';
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  input.dispatchEvent(new Event('blur'));
  await nextTick();

  assert.deepEqual(updates.at(-1), {
    date: { year: 2026, month: 8, day: 23 },
    time: { hour: 10, minute: 45, second: 0, millisecond: 0 },
  });

  app.unmount();
  host.remove();
});

test('uncontrolled date field preserves accepted values and partial drafts across reconfiguration', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const label = ref('Date');
  const app = createApp({
    render: () => h(DateField, {
      defaultValue: { year: 2026, month: 9, day: 13 },
      label: label.value,
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);

  input.value = '2026-10-14';
  input.setSelectionRange(10, 10);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  input.dispatchEvent(new Event('blur'));
  await nextTick();

  label.value = 'Updated date';
  await nextTick();
  assert.equal(input.value, '2026-10-14');

  input.value = '2026-11-';
  input.setSelectionRange(8, 8);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  await nextTick();

  label.value = 'Draft date';
  await nextTick();
  assert.equal(input.value, '2026-11-');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [8, 8]);

  app.unmount();
  host.remove();
});

test('quantity field keeps live composition across reactive reconfiguration', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const label = ref('Quantity');
  const policies = createStandardQuantityPolicies('metre');
  const app = createApp({
    render: () => h(QuantityFieldRoot, {
      policies,
      label: label.value,
    }, {
      default: () => h(QuantityFieldInput),
    }),
  });

  app.mount(host);
  await nextTick();
  const input = host.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);

  input.dispatchEvent(compositionEvent('compositionstart'));
  input.value = '12 c';
  input.setSelectionRange(4, 4);
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertCompositionText',
    data: 'c',
  }));

  label.value = 'Updated quantity';
  await nextTick();
  assert.equal(input.value, '12 c');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [4, 4]);

  input.value = '12 cm';
  input.setSelectionRange(5, 5);
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertCompositionText',
    data: 'cm',
  }));
  input.dispatchEvent(compositionEvent('compositionend', 'cm'));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();

  assert.equal(input.value, '12 cm');

  app.unmount();
  host.remove();
});

test('controlled native fields retain pending proposals until delayed owner sync', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const dateTime = ref({
    date: { year: 2026, month: 8, day: 22 },
    time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  });
  const number = ref('12');
  let dateTimeProposal;
  let numberProposal;
  const app = createApp({
    render: () => h('div', null, [
      h(DateTimeField, {
        modelValue: dateTime.value,
        'onUpdate:modelValue': (value) => { dateTimeProposal = value; },
      }),
      h(NumberField, {
        modelValue: number.value,
        'onUpdate:modelValue': (value) => { numberProposal = value; },
      }),
    ]),
  });

  app.mount(host);
  await nextTick();
  const [dateTimeInput, numberInput] = host.querySelectorAll('input');
  dateTimeInput.setSelectionRange(5, 7);
  dateTimeInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
  numberInput.setSelectionRange(0, 2);
  numberInput.value = '34';
  numberInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  numberInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
  await nextTick();

  assert.equal(dateTime.value.date.month, 8);
  assert.equal(dateTimeInput.value, '2026-09-22T09:30');
  assert.deepEqual([dateTimeInput.selectionStart, dateTimeInput.selectionEnd], [5, 7]);
  assert.equal(number.value, '12');
  assert.equal(numberInput.value, '34');

  dateTime.value = dateTimeProposal;
  number.value = numberProposal;
  await nextTick();
  assert.equal(dateTimeInput.value, '2026-09-22T09:30');
  assert.deepEqual([dateTimeInput.selectionStart, dateTimeInput.selectionEnd], [5, 7]);
  assert.equal(numberInput.value, '34');

  app.unmount();
  host.remove();
});

test('controlled civil fields keep the last accepted value when owner synchronization rejects', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const date = ref({ year: 2026, month: 9, day: 13 });
  const time = ref({ hour: 9, minute: 30, second: 0, millisecond: 0 });
  const dateTime = ref({
    date: { year: 2026, month: 9, day: 13 },
    time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  });
  const errors = [];
  let dateProposal;
  const app = createApp({
    render: () => h('div', null, [
      h(DateField, {
        modelValue: date.value,
        'onUpdate:modelValue': (value) => { dateProposal = value; },
      }),
      h(TimeField, { modelValue: time.value }),
      h(DateTimeField, { modelValue: dateTime.value }),
    ]),
  });
  app.config.errorHandler = (error) => errors.push(error);

  app.mount(host);
  await nextTick();
  const [dateInput, timeInput, dateTimeInput] = host.querySelectorAll('input');
  assert.deepEqual(
    [dateInput.value, timeInput.value, dateTimeInput.value],
    ['2026-09-13', '09:30', '2026-09-13T09:30'],
  );

  date.value = { year: 0, month: 1, day: 1 };
  await nextTick();
  assert.equal(dateInput.value, '2026-09-13');
  assert.equal(errors.length, 1);
  assert.ok(errors[0] instanceof TypeError);

  time.value = { hour: 24, minute: 0, second: 0, millisecond: 0 };
  await nextTick();
  assert.equal(timeInput.value, '09:30');
  assert.equal(errors.length, 2);
  assert.ok(errors[1] instanceof TypeError);

  dateTime.value = {
    date: { year: 0, month: 1, day: 1 },
    time: { hour: 0, minute: 0, second: 0, millisecond: 0 },
  };
  await nextTick();
  assert.equal(dateTimeInput.value, '2026-09-13T09:30');
  assert.equal(errors.length, 3);
  assert.ok(errors[2] instanceof TypeError);

  dateInput.setSelectionRange(0, 4);
  dateInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
  await nextTick();
  assert.deepEqual(dateProposal, { year: 2027, month: 9, day: 13 });
  assert.equal(dateInput.value, '2027-09-13');

  app.unmount();
  host.remove();
});

test('controlled Vue range fields update both endpoints without losing either selection', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const dateRange = ref({
    start: { year: 2026, month: 8, day: 18 },
    end: { year: 2026, month: 8, day: 21 },
  });
  const timeRange = ref({
    start: { hour: 9, minute: 30, second: 0, millisecond: 0 },
    end: { hour: 17, minute: 45, second: 0, millisecond: 0 },
  });
  const app = createApp({
    render: () => h('div', null, [
      h(DateRangeFieldRoot, { modelValue: dateRange.value }, {
        default: () => [h(DateRangeFieldStartInput), h(DateRangeFieldEndInput)],
      }),
      h(TimeRangeFieldRoot, { modelValue: timeRange.value }, {
        default: () => [h(TimeRangeFieldStartInput), h(TimeRangeFieldEndInput)],
      }),
    ]),
  });

  app.mount(host);
  await nextTick();
  const [startDate, endDate, startTime, endTime] = host.querySelectorAll('input');
  startDate.setSelectionRange(5, 7);
  endDate.setSelectionRange(8, 10);
  startTime.setSelectionRange(0, 2);
  endTime.setSelectionRange(3, 5);
  dateRange.value = {
    start: { year: 2026, month: 9, day: 18 },
    end: { year: 2026, month: 9, day: 22 },
  };
  timeRange.value = {
    start: { hour: 10, minute: 30, second: 0, millisecond: 0 },
    end: { hour: 17, minute: 50, second: 0, millisecond: 0 },
  };
  await nextTick();

  assert.deepEqual(
    [...host.querySelectorAll('input')].map((input) => input.value),
    ['2026-09-18', '2026-09-22', '10:30', '17:50'],
  );
  assert.deepEqual([startDate.selectionStart, startDate.selectionEnd], [5, 7]);
  assert.deepEqual([endDate.selectionStart, endDate.selectionEnd], [8, 10]);
  assert.deepEqual([startTime.selectionStart, startTime.selectionEnd], [0, 2]);
  assert.deepEqual([endTime.selectionStart, endTime.selectionEnd], [3, 5]);

  app.unmount();
  host.remove();
});

for (const [name, Root, Start, End, defaultValue] of [
  ['date', DateRangeFieldRoot, DateRangeFieldStartInput, DateRangeFieldEndInput,
    { start: { year: 2026, month: 8, day: 18 }, end: { year: 2026, month: 8, day: 21 } }],
  ['time', TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput,
    { start: { hour: 9, minute: 30, second: 0, millisecond: 0 }, end: { hour: 17, minute: 45, second: 0, millisecond: 0 } }],
  ['date-time', DateTimeRangeFieldRoot, DateTimeRangeFieldStartInput, DateTimeRangeFieldEndInput,
    { start: { date: { year: 2026, month: 10, day: 14 }, time: { hour: 23, minute: 0, second: 0, millisecond: 0 } },
      end: { date: { year: 2026, month: 10, day: 15 }, time: { hour: 1, minute: 0, second: 0, millisecond: 0 } } }],
]) {
  test(`${name} range native submission metadata overrides inheritance without reconnecting inputs`, async () => {
    const metadata = shallowRef({ name: 'parcel[0001]', form: 'external' });
    const render = () => h(FormRoot, {}, {
      default: () => h(FormField, { name: 'period', form: 'inherited' }, {
        default: () => h(Root, { defaultValue, ...metadata.value }, { default: () => [h(Start), h(End)] }),
      }),
    });
    const ssr = await renderToString(createSSRApp({ render }));
    const ssrHost = document.createElement('div'); ssrHost.innerHTML = ssr;
    assert.deepEqual([...ssrHost.querySelectorAll('input')].map(input => [input.name, input.getAttribute('form')]),
      [['parcel[0001].start', 'external'], ['parcel[0001].end', 'external']]);
    const standalone = await renderToString(createSSRApp({
      render: () => h(Root, { defaultValue, name: 'standalone', form: 'outside' }, { default: () => [h(Start), h(End)] }),
    }));
    ssrHost.innerHTML = standalone;
    assert.deepEqual([...ssrHost.querySelectorAll('input')].map(input => [input.name, input.getAttribute('form')]),
      [['standalone.start', 'outside'], ['standalone.end', 'outside']]);
    const host = document.createElement('div'); document.body.append(host);
    const app = createApp({ render });
    try {
      app.mount(host); await nextTick();
      const inputs = [...host.querySelectorAll('input')], texts = inputs.map(input => input.value);
      let reconnects = 0;
      for (const input of inputs) {
        const add = input.addEventListener.bind(input);
        input.addEventListener = (...args) => { if (args[0] === 'keydown') reconnects++; return add(...args); };
      }
      inputs[0].focus(); inputs[0].setSelectionRange(1, 2);
      for (const [next, expected] of [
        [{ name: undefined, form: undefined }, [[null, null], [null, null]]],
        [{ name: '', form: '' }, [['', ''], ['', '']]],
        [{}, [['period.start', 'inherited'], ['period.end', 'inherited']]],
        [{ name: 'delivery', form: 'external' }, [['delivery.start', 'external'], ['delivery.end', 'external']]],
      ]) {
        metadata.value = next; await nextTick(); await nextTick();
        assert.deepEqual(inputs.map(input => [input.getAttribute('name'), input.getAttribute('form')]), expected);
        assert.equal(host.querySelectorAll('input')[0] === inputs[0], true);
        assert.deepEqual(inputs.map(input => input.value), texts);
        assert.deepEqual([inputs[0].selectionStart, inputs[0].selectionEnd], [1, 2]);
      }
      assert.equal(reconnects, 0, 'metadata changes do not rebuild a temporal editing connection');
      assert.equal(host.querySelector('[role="group"]').hasAttribute('name'), false);
      assert.equal(host.querySelector('[role="group"]').hasAttribute('form'), false);
    } finally { app.unmount(); host.remove(); }
  });

  test(`${name} range defers reconfiguration until both compositions end and cancels unmounted work`, async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const label = ref('initial');
    const app = createApp({
      render: () => h(Root, { defaultValue, startLabel: label.value }, {
        default: () => [h(Start), h(End)],
      }),
    });
    app.mount(host);
    await nextTick();
    const [start, end] = host.querySelectorAll('input');
    const texts = [start.value, end.value];
    start.dispatchEvent(compositionEvent('compositionstart'));
    end.dispatchEvent(compositionEvent('compositionstart'));
    label.value = 'reconfigured';
    await nextTick();
    assert.equal(start.getAttribute('aria-label'), 'initial');
    start.dispatchEvent(compositionEvent('compositionend'));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await nextTick();
    assert.equal(start.getAttribute('aria-label'), 'initial');
    end.dispatchEvent(compositionEvent('compositionend'));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await nextTick();
    assert.equal(start.getAttribute('aria-label'), 'reconfigured');
    assert.deepEqual([start.value, end.value], texts);

    let newListeners = 0;
    const add = start.addEventListener.bind(start);
    start.addEventListener = (...arguments_) => { newListeners += 1; return add(...arguments_); };
    start.dispatchEvent(compositionEvent('compositionstart'));
    label.value = 'after-unmount';
    await nextTick();
    start.dispatchEvent(compositionEvent('compositionend'));
    app.unmount();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await nextTick();
    assert.equal(newListeners, 0);
    host.remove();
  });
}
