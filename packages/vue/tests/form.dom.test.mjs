import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/account' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  HTMLSelectElement: browserWindow.HTMLSelectElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  SubmitEvent: browserWindow.SubmitEvent,
  FormData: browserWindow.FormData,
  MutationObserver: browserWindow.MutationObserver,
});

const { KeepAlive, Teleport, createApp, createSSRApp, defineComponent, h, mergeProps, nextTick, ref, shallowRef } = await import('vue');
const {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSelector,
  FormFieldSelector,
  FormSubmit,
  FormSummary,
  provideFormControlOwner,
  useCompositeFormControl,
  useFormControl,
  useFormFieldController,
  useFormFieldSelector,
  useFormSelector,
  useNativeInputFormControl,
} = await import('../.verification-dist/form.js');
const { CheckboxRoot } = await import('../.verification-dist/checkbox.js');
const { CheckboxGroupRoot } = await import('../.verification-dist/checkbox-group.js');
const { CalendarContent, CalendarGrid, CalendarInput, CalendarRoot } = await import('../.verification-dist/temporal/calendar.js');
const { ColorPickerRoot, ColorPickerTextInput, ColorPickerChannelInput, ColorPickerFormatTrigger, ColorPickerCoordinateInput, ColorPickerNativeInput, ColorPickerHueSlider, ColorPickerAlphaSlider, ColorPickerArea, ColorPickerAreaSurface, ColorPickerSwatch } = await import('../.verification-dist/color-picker.js');
const { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } = await import('../.verification-dist/temporal/date-range-field.js');
const {
  DateRangePickerContent,
  DateRangePickerEndInput,
  DateRangePickerRoot,
  DateRangePickerStartInput,
  DateRangePickerTrigger,
} = await import('../.verification-dist/temporal/date-range-picker.js');
const { EditableInput, EditablePreview, EditableRoot } = await import('../.verification-dist/editable.js');
const { ComboboxRoot, ComboboxInput, ComboboxContent, ComboboxItem } = await import('../.verification-dist/combobox.js');
const { ListboxRoot, ListboxItem } = await import('../.verification-dist/listbox.js');
const { CascadeListRoot, CascadeListColumn, CascadeListItem } = await import('../.verification-dist/cascade-list.js');
const { CascadeSelectRoot, CascadeSelectTrigger, CascadeSelectContent, CascadeSelectColumn, CascadeSelectItem } = await import('../.verification-dist/cascade-select.js');
const { MultiThumbSliderRoot, MultiThumbSliderThumb } = await import('../.verification-dist/multi-thumb-slider.js');
const { PinInputInput, PinInputRoot } = await import('../.verification-dist/pin-input.js');
const { RadioGroupRoot, RadioGroupItem } = await import('../.verification-dist/radio-group.js');
const { RatingRoot, RatingItem, RatingClear } = await import('../.verification-dist/rating.js');
const { provideFormControlReset } = await import('../.verification-dist/form/control.js');
const {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} = await import('../.verification-dist/select.js');
const { SliderRoot, SliderThumb, SliderTrack } = await import('../.verification-dist/slider.js');
const { SpinButtonInput, SpinButtonRoot } = await import('../.verification-dist/spin-button.js');
const { SwitchRoot } = await import('../.verification-dist/switch.js');
const { TagsInputInput, TagsInputRoot, TagsInputItem, TagsInputItemDelete } = await import('../.verification-dist/tags-input.js');
const { TextField } = await import('../.verification-dist/text.js');
const { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput } = await import('../.verification-dist/temporal/time-range-field.js');
const { ToggleGroupRoot, ToggleGroupItem } = await import('../.verification-dist/toggle-group.js');
const { formValueControlInventory } = await import('../.verification-dist/form/control-inventory.js');

for (const controlled of [false, true]) test(`ColorPicker retains achromatic intent through owner sync and topology, and resets uncontrolled intent (${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const surfaceKey = shallowRef(0), options = shallowRef({ ...(controlled ? { modelValue: '#000000' } : { defaultValue: '#000000' }) });
  const proposals = []; let state;
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'accent' }, {
    default: () => h(ColorPickerRoot, { ...options.value, 'onUpdate:modelValue': value => proposals.push(value) }, {
      default: current => { state = current; return [h(ColorPickerHueSlider), h(ColorPickerArea, {}, { default: () => h(ColorPickerAreaSurface, { key: surfaceKey.value }) }), h(ColorPickerTextInput)]; },
    }),
  }) }) });
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); let hue = host.querySelector('[data-part="hue-slider"]');
    hue.value = '120'; hue.dispatchEvent(new Event('input', { bubbles: true })); await drain();
    assert.equal(state.area.hue, 120); assert.equal(hue.value, '120'); assert.equal(proposals.length, 0);
    if (controlled) { options.value = { ...options.value, format: 'hsv' }; await drain(); assert.equal(state.area.hue, 120); }
    surfaceKey.value++; await drain(); assert.equal(state.area.hue, 120);
    host.querySelector('[data-part="area-surface"]').getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
    const area = host.querySelector('[data-part="area"]'), event = new Event('pointerdown', { bubbles: true });
    Object.assign(event, { button: 0, pointerId: 1, clientX: 33.3333, clientY: 54.3211 }); area.dispatchEvent(event); await drain();
    if (controlled) { assert.equal(state.area.y, 0); options.value = { ...options.value, modelValue: proposals.at(-1) }; await drain(); }
    assert.ok(Math.abs(state.area.x - 0.333333) < 1e-12); assert.ok(Math.abs(state.area.y - 0.456789) < 1e-12); assert.equal(state.area.hue, 120);
    const count = proposals.length; host.querySelector('form').reset(); await drain();
    assert.equal(state.area.hue, controlled ? 120 : 0); assert.equal(proposals.length, count);
    app.unmount(); hue.value = '240'; hue.dispatchEvent(new Event('input', { bubbles: true })); await drain(); assert.equal(proposals.length, count);
  } finally { if (host.querySelector('[data-part="root"]')) app.unmount(); host.remove(); }
});

test('ColorPicker measures the current surface through replacement and falls back after removal', async () => {
  const host = document.createElement('div'); document.body.append(host); const surfaceKey = shallowRef(0), visible = shallowRef(true); let state;
  const app = createApp({ render: () => h(ColorPickerRoot, { defaultValue: '#ff0000' }, { default: current => { state = current; return h(ColorPickerArea, {}, {
    default: () => visible.value ? h(ColorPickerAreaSurface, { key: surfaceKey.value }) : null,
  }); } }) });
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  const point = () => { const event = new Event('pointerdown', { bubbles: true }); Object.assign(event, { button: 0, pointerId: 1, clientX: 50, clientY: 30 }); return event; };
  let unmounted = false;
  try {
    app.mount(host); await drain(); const area = host.querySelector('[data-part="area"]'); area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
    const first = host.querySelector('[data-part="area-surface"]'); first.getBoundingClientRect = () => ({ left: 20, top: 10, width: 60, height: 40 });
    area.dispatchEvent(point()); await drain(); assert.deepEqual(state.value, { red: 128, green: 64, blue: 64, alpha: 255 });
    surfaceKey.value++; await drain(); const second = host.querySelector('[data-part="area-surface"]'); assert.notEqual(second, first); second.getBoundingClientRect = () => ({ left: 40, top: 20, width: 20, height: 20 });
    first.getBoundingClientRect = () => { throw Error('retired surface must not be measured'); }; area.dispatchEvent(point()); await drain(); assert.equal(state.value.red, 128);
    visible.value = false; await drain(); second.getBoundingClientRect = () => { throw Error('removed surface must not be measured'); }; area.dispatchEvent(point()); await drain(); assert.deepEqual(state.value, { red: 179, green: 89, blue: 89, alpha: 255 });
    app.unmount(); unmounted = true; area.getBoundingClientRect = () => { throw Error('unmounted area must not be measured'); }; area.dispatchEvent(point()); await drain();
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

test('ColorPicker client projection preserves composing native text through accepted owner updates', async () => {
  const host = document.createElement('div'); document.body.append(host); const options = shallowRef({ modelValue: '#ff0000', draft: null });
  const app = createApp({ render: () => h(ColorPickerRoot, options.value, { default: () => h(ColorPickerTextInput) }) });
  try {
    app.mount(host); await nextTick(); const input = host.querySelector('[data-part="text-input"]');
    input.dispatchEvent(new Event('compositionstart', { bubbles: true })); input.value = '編集中';
    options.value = { ...options.value, modelValue: '#00ff00' }; await nextTick(); await nextTick(); assert.equal(input.value, '編集中');
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); await nextTick(); await nextTick(); assert.equal(input.value, '#00ff00');
  } finally { app.unmount(); host.remove(); }
});

test('ColorPicker keeps caller localized names through updates, reconnect and labelledby changes', async () => {
  const host = document.createElement('div'); document.body.append(host); const locale = shallowRef('ko'), labelled = shallowRef(false), options = shallowRef({ modelValue: '#ff0000', disabled: false });
  const parts = [ColorPickerChannelInput, ColorPickerCoordinateInput, ColorPickerArea, ColorPickerHueSlider, ColorPickerAlphaSlider, ColorPickerSwatch];
  const app = createApp({ render: () => h(ColorPickerRoot, { ...options.value, 'aria-label': '브랜드 색상' }, { default: () => parts.map((part, index) => h(part, {
    ...(index === 0 ? { channel: 'red' } : index === 1 ? { format: 'rgb', coordinate: 'red' } : {}),
    ...(labelled.value ? { 'aria-labelledby': 'color-label' } : { 'aria-label': `${locale.value}-${index}` }), 'aria-valuetext': `${locale.value}-value-${index}`,
  })) }) });
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const nodes = [...host.querySelectorAll('[data-part]')].filter(node => node.dataset.part !== 'root');
    const check = () => nodes.forEach((node, index) => {
      assert.equal(node.getAttribute('aria-label'), `${locale.value}-${index}`);
      if (index === 2) {
        assert.equal(node.getAttribute('role'), 'group');
        assert.equal(node.getAttribute('aria-description'), `${locale.value}-value-${index}`);
        assert.equal(node.getAttribute('aria-valuetext'), null);
      } else assert.equal(node.getAttribute('aria-valuetext'), `${locale.value}-value-${index}`);
    });
    check(); assert.equal(host.querySelector('[data-part="root"]').getAttribute('aria-label'), '브랜드 색상');
    options.value = { ...options.value, modelValue: '#00ff00' }; locale.value = 'en'; await drain(); check();
    options.value = { ...options.value, disabled: true }; await drain(); check();
    labelled.value = true; await drain(); options.value = { ...options.value, disabled: false }; await drain();
    for (const node of nodes) { assert.equal(node.getAttribute('aria-label'), null); assert.equal(node.getAttribute('aria-labelledby'), 'color-label'); }
  } finally { app.unmount(); host.remove(); }
});

test('ColorPicker rebuilds changed part topology once and releases retired native inputs', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const visible = shallowRef(true), channel = shallowRef('red'), coordinate = shallowRef({ format: 'rgb', coordinate: 'red' }), title = shallowRef('first');
  const updates = []; let state;
  const app = createApp({ render: () => h(ColorPickerRoot, { defaultValue: '#ff0000', title: title.value, 'onUpdate:modelValue': value => updates.push(value), 'onUpdate:draft': value => updates.push(value) }, {
    default: current => { state = current; return [h(ColorPickerTextInput), ...(visible.value ? [h(ColorPickerNativeInput), h(ColorPickerChannelInput, { channel: channel.value }), h(ColorPickerCoordinateInput, coordinate.value), h(ColorPickerHueSlider), h(ColorPickerAlphaSlider)] : [])]; },
  }) });
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const text = host.querySelector('[data-part="text-input"]'); text.focus(); let connects = 0;
    const originalAdd = text.addEventListener; text.addEventListener = function (type, ...args) { if (type === 'input') connects++; return originalAdd.call(this, type, ...args); };
    title.value = 'second'; await drain(); assert.equal(connects, 0, 'unchanged native identities do not reconnect'); assert.equal(document.activeElement, text);
    channel.value = 'blue'; coordinate.value = { format: 'hsl', coordinate: 'lightness' }; await drain();
    assert.equal(connects, 1, 'descriptor changes share one reconnect'); assert.equal(host.querySelector('[data-part="coordinate-input"]').max, '100');
    const old = [...host.querySelectorAll('input')].filter(input => input !== text); visible.value = false; await drain(); assert.equal(connects, 2);
    const count = updates.length, accepted = state.value;
    for (const input of old) { input.value = input.type === 'color' ? '#00ff00' : '30'; input.dispatchEvent(new Event('input', { bubbles: true })); }
    await drain(); assert.equal(updates.length, count); assert.deepEqual(state.value, accepted);
    for (let turn = 0; turn < 3; turn++) { visible.value = true; await drain(); visible.value = false; await drain(); }
    assert.equal(connects, 8, 'each completed topology generation reconnects once'); assert.equal(document.activeElement, text);
  } finally { app.unmount(); host.remove(); }
});
test('ColorPicker defers topology rebuild through composition and releases removed composing text', async () => {
  const host = document.createElement('div'); document.body.append(host); const extra = shallowRef(false), showText = shallowRef(true); let state;
  const app = createApp({ render: () => h(ColorPickerRoot, { defaultValue: '#ff0000' }, { default: current => { state = current; return [
    ...(showText.value ? [h(ColorPickerTextInput)] : []), h(ColorPickerChannelInput, { channel: 'blue' }), ...(extra.value ? [h(ColorPickerCoordinateInput, { format: 'rgb', coordinate: 'red' })] : []),
  ]; } }) });
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const input = host.querySelector('[data-part="text-input"]'), channel = host.querySelector('[data-part="channel-input"]'); let connects = 0;
    const originalAdd = channel.addEventListener; channel.addEventListener = function (type, ...args) { if (type === 'input') connects++; return originalAdd.call(this, type, ...args); };
    input.dispatchEvent(new Event('compositionstart', { bubbles: true })); input.value = 'unfinished'; extra.value = true; await drain(); assert.equal(connects, 0); assert.equal(input.value, 'unfinished');
    input.dispatchEvent(new Event('compositionend', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 5)); await drain(); assert.equal(connects, 1); assert.equal(state.draft, 'unfinished');
    input.dispatchEvent(new Event('compositionstart', { bubbles: true })); showText.value = false; await drain(); await new Promise(resolve => setTimeout(resolve, 5)); await drain(); assert.equal(connects, 2);
    const draft = state.draft; input.value = 'stale'; input.dispatchEvent(new Event('input', { bubbles: true })); await drain(); assert.equal(state.draft, draft);
    extra.value = false; app.unmount(); await drain(); assert.equal(connects, 2, 'unmount cancels scheduled topology work');
  } finally { if (host.firstChild !== null) app.unmount(); host.remove(); }
});

for (const shape of ['none', 'value', 'draft', 'format', 'all']) test(`ColorPicker registered reset restores independent mount axes (${shape})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const controlledValue = shape === 'value' || shape === 'all', controlledDraft = shape === 'draft' || shape === 'all', controlledFormat = shape === 'format' || shape === 'all';
  const options = shallowRef({ defaultValue: '#ff0000', defaultFormat: 'hex', ...(controlledValue ? { modelValue: '#ff0000' } : {}),
    ...(controlledDraft ? { draft: null } : {}), ...(controlledFormat ? { format: 'hex' } : {}) });
  const updates = [], errors = []; let state;
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'accent' }, { default: () => h(ColorPickerRoot, {
    ...options.value, 'onUpdate:modelValue': value => updates.push(value), 'onUpdate:draft': value => updates.push(value), 'onUpdate:format': value => updates.push(value),
  }, { default: current => { state = current; return [h(ColorPickerTextInput), h(ColorPickerChannelInput, { channel: 'green' }), h(ColorPickerFormatTrigger, { format: 'rgb' })]; } }) }) }) });
  app.config.errorHandler = error => errors.push(error);
  const drain = async () => { for (let turn = 0; turn < 4; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const channel = host.querySelector('[data-part="channel-input"]'); channel.value = '200'; channel.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector('[data-part="format-trigger"]').click(); await drain();
    options.value = { ...options.value, ...(controlledValue ? { modelValue: '#00ff00' } : {}), ...(controlledDraft ? { draft: 'controlled draft' } : {}), ...(controlledFormat ? { format: 'rgb' } : {}) }; await drain();
    const input = host.querySelector('[data-part="text-input"]');
    if (!controlledDraft) { input.value = 'invalid draft'; input.dispatchEvent(new Event('input', { bubbles: true })); await drain(); }
    let connects = 0; const originalAdd = input.addEventListener;
    input.addEventListener = function (type, ...args) { if (type === 'input') connects += 1; return originalAdd.call(this, type, ...args); };
    const count = updates.length, form = host.querySelector('form'); form.reset(); form.reset(); form.reset(); await drain();
    assert.deepEqual(state.value, controlledValue ? { red: 0, green: 255, blue: 0, alpha: 255 } : { red: 255, green: 0, blue: 0, alpha: 255 });
    assert.equal(state.draft, controlledDraft ? 'controlled draft' : null); assert.equal(state.format, controlledFormat ? 'rgb' : 'hex'); assert.equal(updates.length, count);
    assert.equal(connects, 1, 'synchronous reset requests share one native reconnect');
    if (!controlledDraft) assert.deepEqual(new FormData(form).getAll('accent'), [controlledFormat ? 'rgb(255, 0, 0)' : controlledValue ? '#00ff00' : '#ff0000']);
    assert.deepEqual(errors, []);
  } finally { app.unmount(); host.remove(); }
});
test('ColorPicker keeps accepted color separate from an invalid draft when native policy reconnects', async () => {
  const host = document.createElement('div'); document.body.append(host); const options = shallowRef({ defaultValue: '#ff0000', disabled: false });
  const errors = []; let state;
  const app = createApp({ render: () => h(ColorPickerRoot, options.value, { default: current => { state = current; return h(ColorPickerTextInput); } }) });
  app.config.errorHandler = error => errors.push(error);
  try {
    app.mount(host); await nextTick(); const input = host.querySelector('input'); input.value = 'invalid draft'; input.dispatchEvent(new Event('input', { bubbles: true })); await nextTick();
    options.value = { ...options.value, disabled: true }; await nextTick(); options.value = { ...options.value, disabled: false }; await nextTick();
    assert.deepEqual(errors, []); assert.deepEqual(state.value, { red: 255, green: 0, blue: 0, alpha: 255 }); assert.equal(state.draft, 'invalid draft'); assert.equal(input.value, 'invalid draft');
  } finally { app.unmount(); host.remove(); }
});
test('ColorPicker model projections follow accepted color generations independently of display format', async () => {
  const host = document.createElement('div'); document.body.append(host); const options = shallowRef({ modelValue: '#ff0000', format: 'rgb' }); let state;
  const app = createApp({ render: () => h(ColorPickerRoot, options.value, { default: current => { state = current; return [
    h(ColorPickerCoordinateInput, { format: 'rgb', coordinate: 'red' }), h(ColorPickerCoordinateInput, { format: 'hsv', coordinate: 'hue' }),
  ]; } }) });
  try {
    app.mount(host); await nextTick(); assert.equal(state.coordinates.find(value => value.coordinate === 'red').value, 255);
    options.value = { ...options.value, modelValue: '#00ff00' }; await nextTick(); await nextTick();
    assert.equal(state.coordinates.find(value => value.coordinate === 'red').value, 0);
    options.value = { ...options.value, format: 'hsv' }; await nextTick(); await nextTick();
    assert.equal(state.coordinates.find(value => value.coordinate === 'hue').value, 120);
    assert.equal(host.querySelector('[data-coordinate="red"]').value, '0'); assert.equal(host.querySelector('[data-coordinate="hue"]').value, '120');
  } finally { app.unmount(); host.remove(); }
});
test('ColorPicker cancels queued reset work and native handlers when unmounted before reset flush', async () => {
  const host = document.createElement('div'); document.body.append(host); const updates = [];
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'color' }, { default: () => h(ColorPickerRoot, {
    defaultValue: '#ff0000', 'onUpdate:draft': value => updates.push(value),
  }, { default: () => h(ColorPickerTextInput) }) }) }) });
  let unmounted = false;
  try {
    app.mount(host); await nextTick(); await nextTick(); const input = host.querySelector('[data-part="text-input"]'); let connects = 0;
    const originalAdd = input.addEventListener; input.addEventListener = function (type, ...args) { if (type === 'input') connects += 1; return originalAdd.call(this, type, ...args); };
    host.querySelector('form').reset(); app.unmount(); unmounted = true; await nextTick(); await nextTick();
    input.value = 'stale'; input.dispatchEvent(new Event('input', { bubbles: true })); assert.equal(connects, 0); assert.deepEqual(updates, []);
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

for (const [Root, Item, initial, changed, stateAttribute] of [
  [RatingRoot, RatingItem, 'a', 'b', 'aria-checked'],
  [ToggleGroupRoot, ToggleGroupItem, ['a'], ['b'], 'aria-pressed'],
  [RadioGroupRoot, RadioGroupItem, 'a', 'b', 'aria-checked'],
  [SwitchRoot, null, true, false, 'aria-checked'],
]) for (const controlled of [false, true]) test(`${Root.name} registered reset retains mount baseline and controlled ownership (${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = shallowRef({ items: ['a', 'b'], defaultValue: initial, ...(controlled ? { modelValue: initial } : {}) });
  const updates = [];
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'choice' }, {
    default: () => h(Root, { ...options.value, ...(Root === RatingRoot ? { clearable: true } : {}), 'onUpdate:modelValue': value => updates.push(value) },
      Item ? { default: () => [...options.value.items.map(value => h(Item, { value }, () => value)), ...(Root === RatingRoot ? [h(RatingClear, {}, () => 'Clear')] : [])] } : {}),
  }) }) });
  try {
    app.mount(host); await nextTick(); await nextTick();
    const form = host.querySelector('form');
    const controls = [...host.querySelectorAll(Item ? '[data-part="item"]' : '[role="switch"]')];
    controls[Item ? 1 : 0].click(); await nextTick();
    assert.equal(controls[0].getAttribute(stateAttribute), controlled ? 'true' : 'false');
    if (controlled) { options.value = { ...options.value, modelValue: changed }; await nextTick(); }
    options.value = { ...options.value, defaultValue: changed }; await nextTick();
    const count = updates.length; form.reset(); await nextTick(); await nextTick();
    assert.equal(controls[0].getAttribute(stateAttribute), controlled ? 'false' : 'true');
    assert.equal(updates.length, count, 'reset does not emit a selection proposal');
    assert.deepEqual(new FormData(form).getAll('choice'), controlled ? Item ? ['b'] : [] : Item ? ['a'] : ['on']);
    if (Root === RatingRoot) {
      host.querySelector('[data-part="clear"]').click(); await nextTick();
      assert.deepEqual(new FormData(form).getAll('choice'), controlled ? ['b'] : []);
      const count = updates.length; form.reset(); await nextTick(); await nextTick();
      assert.deepEqual(new FormData(form).getAll('choice'), controlled ? ['b'] : ['a']); assert.equal(updates.length, count);
    }
    if (Item && !controlled) {
      options.value = { ...options.value, items: ['b'] }; await nextTick();
      form.reset(); await nextTick(); await nextTick();
      assert.deepEqual(new FormData(form).getAll('choice'), [], 'removed baseline identities are reconciled against the current domain');
    }
  } finally { app.unmount(); host.remove(); }
});

test('TextField edit snapshots use one native Form value and retire after reset', async () => {
  const host = document.createElement('div'); document.body.append(host); let field;
  const updates = [], app = createApp({ render: () => h(FormRoot, {}, {
    default: () => h(FormField, { name: 'query' }, { default: () => h(TextField, {
      defaultValue: 'Address', ref: value => { if (value) field = value; }, 'onUpdate:modelValue': value => updates.push(value),
    }) }),
  }) });
  const drain = async () => { for (let turn = 0; turn < 6; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const form = host.querySelector('form');
    const result = await field.replaceText({ snapshot: field.getTextSnapshot(), startCodeUnitOffset: 0, endCodeUnitOffset: 7, text: 'Ada' });
    assert.equal(result.status, 'accepted'); assert.deepEqual(new FormData(form).getAll('query'), ['Ada']);
    assert.deepEqual(updates, ['Ada']); form.reset(); await drain();
    assert.deepEqual(new FormData(form).getAll('query'), ['Address']); assert.deepEqual(updates, ['Ada']);
    const stale = await field.replaceText({ snapshot: result.snapshot, startCodeUnitOffset: 0, endCodeUnitOffset: 3, text: 'Other' });
    assert.equal(stale.reason, 'stale'); assert.deepEqual(new FormData(form).getAll('query'), ['Address']);
  } finally { app.unmount(); host.remove(); }
});

test('derived Form reset stays within its originating field and unregisters with its control', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const visible = shallowRef(true); let resets = 0;
  const Wrapped = defineComponent({ setup() {
    provideFormControlReset(() => { resets += 1; });
    return () => [h(TextField, { defaultValue: 'Primary' }), h(FormField, { name: 'nested' }, { default: () => h(TextField, { defaultValue: 'Nested' }) })];
  } });
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'primary' }, { default: () => visible.value ? h(Wrapped) : null }) }) });
  try {
    app.mount(host); await nextTick(); await nextTick(); const form = host.querySelector('form');
    form.reset(); await nextTick(); await nextTick(); assert.equal(resets, 1);
    assert.deepEqual(new FormData(form).getAll('primary'), ['Primary']); assert.deepEqual(new FormData(form).getAll('nested'), ['Nested']);
    visible.value = false; await nextTick(); form.reset(); await nextTick(); assert.equal(resets, 1);
  } finally { app.unmount(); host.remove(); }
});

for (const selectionMode of ['single', 'multiple']) test(`Listbox disabled submission follows its native owner while readonly preserves the selected value (${selectionMode})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const flags = shallowRef({ disabled: false, readonly: true }), proposals = [];
  const app = createApp({ render: () => h('form', {}, [h(ListboxRoot, {
    items: ['a', 'b'], selectionMode, defaultValue: selectionMode === 'single' ? 'b' : ['b'],
    name: 'selection', ...flags.value, 'onUpdate:modelValue': value => proposals.push(value),
  }, { default: () => ['a', 'b'].map(value => h(ListboxItem, { value }, () => value)) })]) });
  try {
    app.mount(host); await nextTick(); const form = host.querySelector('form'), select = host.querySelector('select');
    assert.equal(select.multiple, selectionMode === 'multiple'); assert.deepEqual(new FormData(form).getAll('selection'), ['b']);
    flags.value = { disabled: true, readonly: false }; await nextTick();
    // Happy DOM does not omit disabled selects from FormData; inspect the real target flag.
    assert.equal(select.disabled, true); assert.equal(select.value, 'b');
    flags.value = { disabled: false, readonly: true }; await nextTick();
    assert.equal(select.disabled, false); assert.deepEqual(new FormData(form).getAll('selection'), ['b']);
    assert.equal(host.querySelector('select'), select); assert.deepEqual(proposals, []);
  } finally { app.unmount(); host.remove(); }
});

for (const selectionMode of ['single', 'multiple']) for (const controlled of [false, true]) test(`Listbox registered reset reconciles its mount baseline against the current domain (${selectionMode}/${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const initial = selectionMode === 'single' ? 'a' : ['a', 'b'];
  const options = shallowRef({ items: ['a', 'b'], selectionMode, required: true, defaultValue: initial, ...(controlled ? { modelValue: initial } : {}) });
  const updates = []; let state, unmounted = false;
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'choice' }, {
    default: () => h(ListboxRoot, { ...options.value, 'onUpdate:modelValue': value => updates.push(value) }, {
      default: current => { state = current; return options.value.items.map(value => h(ListboxItem, { value }, () => value)); },
    }),
  }) }) });
  try {
    app.mount(host); await nextTick(); await nextTick(); const form = host.querySelector('form');
    if (controlled) { options.value = { ...options.value, modelValue: selectionMode === 'single' ? 'b' : ['b'] }; await nextTick(); }
    options.value = { ...options.value, items: ['b'], defaultValue: selectionMode === 'single' ? 'b' : [] }; await nextTick();
    const proposals = updates.length; form.reset(); await nextTick(); await nextTick();
    const expected = selectionMode === 'single' && !controlled ? [''] : ['b'];
    assert.deepEqual(new FormData(form).getAll('choice'), expected);
    assert.equal(host.querySelector('select').checkValidity(), !(selectionMode === 'single' && !controlled));
    assert.deepEqual(state.value, selectionMode === 'single' ? expected[0] ?? '' : expected);
    assert.equal(state.highlightedValue, 'b'); assert.equal(updates.length, proposals);
    host.querySelector('[role="option"]').click(); await nextTick();
    const retainedValue = state.value;
    form.reset(); app.unmount(); unmounted = true; await nextTick();
    assert.deepEqual(state.value, retainedValue, 'queued reset cannot publish after its owner unmounts');
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

for (const controlled of [0, 2, 5, 7]) test(`Combobox registered reset retains mount defaults and independent controlled axes (${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const items = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }];
  const options = shallowRef({ items, defaultValue: 'a', defaultInputValue: 'Alpha', defaultOpen: false,
    ...(controlled & 1 ? { modelValue: 'a' } : {}), ...(controlled & 2 ? { inputValue: 'Alpha' } : {}), ...(controlled & 4 ? { open: false } : {}) });
  const events = []; let state, unmounted = false;
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'service' }, {
    default: () => h(ComboboxRoot, { ...options.value, position: false, label: 'Service',
      'onUpdate:modelValue': value => events.push(['value', value]), 'onUpdate:inputValue': value => events.push(['input', value]),
      'onUpdate:open': value => events.push(['open', value]),
    }, { default: current => { state = current; return [h(ComboboxInput), h(ComboboxContent, {}, {
      default: () => options.value.items.map(item => h(ComboboxItem, { value: item.id }, () => item.label)),
    })]; } }),
  }) }) });
  try {
    app.mount(host); await drain(); const form = host.querySelector('form'), input = host.querySelector('input');
    options.value = { ...options.value, defaultValue: 'b', defaultInputValue: 'Later default', defaultOpen: true,
      ...(controlled & 1 ? { modelValue: 'b' } : {}), ...(controlled & 2 ? { inputValue: 'Beta' } : {}), ...(controlled & 4 ? { open: true } : {}) }; await drain();
    input.value = 'Beta'; input.setSelectionRange(4, 4); input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); await drain();
    input.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })); await drain();
    host.querySelectorAll('[role="option"]')[1].click(); await drain();
    const count = events.length; form.reset(); await drain();
    assert.equal(state.value, controlled & 1 ? 'b' : 'a'); assert.equal(state.inputValue, controlled & 2 ? 'Beta' : 'Alpha');
    assert.equal(state.open, Boolean(controlled & 4)); assert.equal(input.value, state.inputValue);
    assert.deepEqual(new FormData(form).getAll('service'), [state.inputValue]); assert.equal(events.length, count, 'reset does not propose new controlled values');
    options.value = { ...options.value, items: [items[1]] }; await drain(); form.reset(); await drain();
    assert.equal(state.value, controlled & 1 ? 'b' : null, 'removed mount identities are reconciled against the current domain');
    form.reset(); const retained = input.value; app.unmount(); unmounted = true; await drain(); assert.equal(input.value, retained);
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

for (const [initial, expected] of [[{ defaultValue: 'b' }, 'b'], [{ modelValue: 'b', defaultValue: 'a' }, 'b'], [{ modelValue: null, defaultValue: 'a' }, '']]) {
  test(`Select SSR encodes initial native selection for ${JSON.stringify(initial)}`, async () => {
    const { renderToString } = await import('vue/server-renderer');
    const html = await renderToString(createSSRApp({ render: () => h(SelectRoot, { ...initial, items: ['a', 'b'], name: 'service', label: 'Service', position: false }, {
      default: () => [h(SelectTrigger, {}, () => 'Choose'), h(SelectContent, {}, { default: () => ['a', 'b'].map(value => h(SelectItem, { value }, () => value)) })],
    }) }));
    const form = document.createElement('form'); form.innerHTML = html;
    // Verify encoded defaults; physical initial FormData remains maintainer-owned.
    assert.equal(form.querySelector('select').getAttribute('name'), 'service');
    assert.equal(form.querySelector('option[selected]').getAttribute('value'), expected);
    assert.equal(form.querySelectorAll('select').length, 1); assert.equal(form.querySelectorAll('option[selected]').length, 1);
  });
}

for (const unmountOnExit of [false, true]) for (const controlled of [0, 1, 2, 3]) test(`Select registered reset preserves mount defaults and independent controlled axes (${controlled}/${unmountOnExit})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = shallowRef({ items: ['a', 'b'], defaultValue: 'a', defaultOpen: false,
    ...(controlled & 1 ? { modelValue: 'a' } : {}), ...(controlled & 2 ? { open: false } : {}) });
  const events = []; let state, unmounted = false;
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'service' }, {
    default: () => h(SelectRoot, { ...options.value, unmountOnExit, label: 'Service', position: false,
      'onUpdate:modelValue': value => events.push(['value', value]), 'onUpdate:open': value => events.push(['open', value]),
    }, { default: current => { state = current; return [h(SelectTrigger, {}, () => 'Choose'), h(SelectContent, {}, {
      default: () => options.value.items.map(value => h(SelectItem, { value }, () => value)),
    })]; } }),
  }) }) });
  try {
    app.mount(host); await drain(); const form = host.querySelector('form'), trigger = host.querySelector('button'), select = host.querySelector('select');
    options.value = { ...options.value, defaultValue: 'b', defaultOpen: true,
      ...(controlled & 1 ? { modelValue: 'b' } : {}), ...(controlled & 2 ? { open: true } : {}) }; await drain();
    trigger.click(); await drain(); host.querySelectorAll('[role=option]')[1].click(); await drain();
    assert.deepEqual(new FormData(form).getAll('service'), ['b']);
    const count = events.length; form.reset(); form.reset(); form.reset(); await drain();
    assert.equal(state.value, controlled & 1 ? 'b' : 'a'); assert.equal(state.open, Boolean(controlled & 2));
    assert.deepEqual(new FormData(form).getAll('service'), [controlled & 1 ? 'b' : 'a']); assert.equal(events.length, count, 'reset does not propose controlled state changes');
    assert.equal(host.querySelector('select') === select, true); assert.equal(host.querySelector('button') === trigger, true);
    options.value = { ...options.value, items: ['b'] }; await drain(); form.reset(); await drain();
    assert.equal(state.value, controlled & 1 ? 'b' : null, 'the existing reconciliation owner removes unavailable mount identities');
    const retained = state.value; form.reset(); app.unmount(); unmounted = true; await drain(); assert.equal(state.value, retained);
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

for (const popup of [false, true]) for (const controlled of popup ? [0, 1, 2, 3] : [0, 1]) test(`Cascade registered reset preserves mount defaults and controlled ownership (${popup}/${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const nodes = [{ id: 'branch', parentID: null }, { id: 'a', parentID: 'branch' }, { id: 'b', parentID: 'branch' }];
  const options = shallowRef({ nodes, defaultValue: 'a', defaultOpen: false,
    ...(controlled & 1 ? { modelValue: 'a' } : {}), ...(controlled & 2 ? { open: false } : {}) });
  const Root = popup ? CascadeSelectRoot : CascadeListRoot;
  const Column = popup ? CascadeSelectColumn : CascadeListColumn;
  const Item = popup ? CascadeSelectItem : CascadeListItem;
  const events = []; let state, unmounted = false;
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  const columns = current => current.columns.map((_, depth) => h(Column, { depth, label: `Level ${depth + 1}` }, {
    default: ({ items }) => items.map(value => h(Item, { value }, () => value)),
  }));
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'choice' }, {
    default: () => h(Root, { ...options.value, position: false, label: 'Choice',
      'onUpdate:modelValue': value => events.push(['value', value]), 'onUpdate:open': value => events.push(['open', value]),
    }, { default: current => { state = current; return popup
      ? [h(CascadeSelectTrigger, {}, () => 'Choose'), h(CascadeSelectContent, {}, { default: columns })]
      : columns(current); } }),
  }) }) });
  try {
    app.mount(host); await drain(); const form = host.querySelector('form');
    options.value = { ...options.value, defaultValue: 'b', defaultOpen: true,
      ...(controlled & 1 ? { modelValue: 'b' } : {}), ...(controlled & 2 ? { open: true } : {}) }; await drain();
    if (popup && !(controlled & 2)) { host.querySelector('[data-part="trigger"]').click(); await drain(); }
    host.querySelector(`[data-sectile-cascade-${popup ? 'select' : 'list'}-id="b"]`).click(); await drain();
    if (popup && !state.open) { host.querySelector('[data-part="trigger"]').click(); await drain(); }
    const count = events.length; form.reset(); await drain();
    assert.equal(state.value, controlled & 1 ? 'b' : 'a');
    if (popup) assert.equal(state.open, Boolean(controlled & 2));
    assert.deepEqual(new FormData(form).getAll('choice'), [state.value]);
    assert.equal(events.length, count, 'reset does not emit value/open proposals');
    options.value = { ...options.value, nodes: nodes.filter(node => node.id !== 'a') }; await drain();
    const beforeDomainReset = events.length; form.reset(); await drain();
    assert.equal(state.value, controlled & 1 ? 'b' : null);
    assert.deepEqual(new FormData(form).getAll('choice'), [state.value ?? '']);
    assert.equal(events.length, beforeDomainReset);
    const retained = state; form.reset(); app.unmount(); unmounted = true; await drain();
    assert.equal(state, retained, 'queued reset cannot publish after unmount');
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

for (const controlled of [false, true]) test(`PinInput registered reset restores native cells without taking controlled ownership (${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = shallowRef({ length: 4, defaultValue: '12', ...(controlled ? { modelValue: '12' } : {}) });
  const values = [], completions = []; let state, unmounted = false;
  const drain = async () => { for (let turn = 0; turn < 4; turn++) await nextTick(); };
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'code' }, {
    default: () => h(PinInputRoot, { ...options.value, label: 'Code', 'onUpdate:modelValue': value => values.push(value), onComplete: value => completions.push(value) }, {
      default: current => { state = current; return Array.from({ length: options.value.length }, (_, index) => h(PinInputInput, { index, key: index })); },
    }),
  }) }) });
  try {
    app.mount(host); await drain(); const form = host.querySelector('form'), inputs = [...host.querySelectorAll('[data-part="input"]')];
    inputs[2].focus(); inputs[2].value = '3'; inputs[2].dispatchEvent(new Event('input', { bubbles: true })); await drain();
    options.value = { ...options.value, defaultValue: '34', ...(controlled ? { modelValue: '34' } : {}) }; await drain();
    assert.deepEqual(inputs.map(input => input.value), controlled ? ['3', '4', '', ''] : ['1', '2', '3', '']);
    const beforeValues = values.length, beforeComplete = completions.length; form.reset(); await drain();
    assert.equal(state.value, controlled ? '34' : '12');
    assert.deepEqual(inputs.map(input => input.value), controlled ? ['3', '4', '', ''] : ['1', '2', '', '']);
    assert.deepEqual(new FormData(form).getAll('code'), [state.value]);
    assert.equal(values.length, beforeValues); assert.equal(completions.length, beforeComplete);
    form.reset(); const retained = inputs.map(input => input.value); app.unmount(); unmounted = true; await drain();
    assert.deepEqual(inputs.map(input => input.value), retained, 'queued reset cannot rewrite retired inputs');
  } finally { if (!unmounted) app.unmount(); host.remove(); }
});

test('TagsInput updates localized removal names without reconnecting native input or changing values', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const options = shallowRef({ defaultValue: ['서울', '부산'], removeLabel: (value, index) => `${index + 1}번째 ${value} 삭제` });
  const values = [], app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'places' }, {
    default: () => h(TagsInputRoot, { ...options.value, label: 'Places', 'onUpdate:modelValue': value => values.push(value) }, {
      default: state => [h(TagsInputInput), ...state.value.map((value, index) => h(TagsInputItem, { index, key: index }, { default: () => h(TagsInputItemDelete, {}, () => value) }))],
    }),
  }) }) });
  const drain = async () => { for (let turn = 0; turn < 4; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const input = host.querySelector('[data-part="input"]'), form = host.querySelector('form');
    let connections = 0; const originalAdd = input.addEventListener;
    input.addEventListener = function (type, ...args) { if (type === 'input') connections += 1; return originalAdd.call(this, type, ...args); };
    const buttons = [...host.querySelectorAll('button')]; assert.equal(buttons[0].getAttribute('aria-label'), '1번째 서울 삭제');
    buttons[0].focus(); options.value = { ...options.value, removeLabel: value => `Delete ${value}` }; await drain();
    assert.equal(buttons[0].getAttribute('aria-label'), 'Delete 서울'); assert.equal(connections, 0); assert.ok(document.activeElement === buttons[0]);
    assert.deepEqual(new FormData(form).getAll('places'), ['서울', '부산']); assert.deepEqual(values, []);
    buttons[0].click(); await drain(); assert.deepEqual(values, [['부산']]);
    assert.equal(host.querySelector('[data-part="item-delete"]').getAttribute('aria-label'), 'Delete 부산');
  } finally { app.unmount(); host.remove(); }
});

test('native and composite Form callback slots are captured once', async () => {
  for (const composite of [false, true]) {
    const reads = { reset: 0, getValue: 0, isValueEqual: 0 };
    const host = document.createElement('div');
    const app = createApp({ setup() {
      const element = shallowRef(null);
      const options = {
        get reset() { reads.reset += 1; return () => {}; },
        get getValue() { reads.getValue += 1; return () => 'owned'; },
        get isValueEqual() { reads.isValueEqual += 1; return Object.is; },
      };
      if (composite) useCompositeFormControl(Object.defineProperty(options, 'root', { value: element }));
      else useNativeInputFormControl(element, options);
      return () => h('input', { ref: (value) => { element.value = value; } });
    } });
    app.mount(host);
    await nextTick();
    assert.deepEqual(reads, { reset: 1, getValue: 1, isValueEqual: 1 });
    app.unmount();
  }
});

test('a scoped inactive FormField retains registration and pauses its observer beneath an active Form', async () => {
  const { HostProvider } = await import('../.verification-dist/host-provider.js');
  const host = document.createElement('div'); document.body.append(host);
  const available = shallowRef(true), name = shallowRef('email'), errors = [], liveObservers = new Set();
  const NativeObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = class extends NativeObserver {
    observe(...args) { super.observe(...args); liveObservers.add(this); }
    disconnect() { super.disconnect(); liveObservers.delete(this); }
  };
  let controller;
  const Observer = defineComponent({ setup() { controller = useFormFieldController('email'); return () => null; } });
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => [h(Observer),
    h(HostProvider, { active: available }, { default: () => h(FormField, { id: 'email', name: name.value }, { default: () => h('input') }) }),
  ] }) });
  app.config.errorHandler = error => errors.push(error); app.mount(host);
  try {
    await drain(); const input = host.querySelector('input'), field = host.querySelector('[data-part=field]');
    input.value = 'accepted'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('blur')); await drain();
    controller.upsertIssue({ id: 'retained', source: 'server', fieldId: 'email', message: 'Retained' }); await drain();
    for (let cycle = 0; cycle < 3; cycle++) {
      const accepted = controller.state.value; assert.equal(liveObservers.size, 1);
      available.value = false; await drain(); assert.equal(liveObservers.size, 0); assert.equal(field.inert, true);
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('blur')); await drain();
      assert.equal(controller.state.value, accepted);
      name.value = `email${cycle}`; await drain(); assert.equal(liveObservers.size, 0);
      available.value = true; await drain(); assert.equal(liveObservers.size, 1); assert.equal(field.inert, false);
      assert.equal(host.querySelector('input'), input); assert.equal(controller.state.value.dirty, true); assert.equal(controller.state.value.touched, true);
      assert.equal(controller.state.value.issues[0].id, 'retained'); assert.equal(controller.state.value.name, `email${cycle}`);
    }
    available.value = false; await drain(); const query = field.querySelectorAll, failure = new Error('Field discovery failed');
    field.querySelectorAll = () => { throw failure; };
    try { available.value = true; await drain(); assert.equal(errors[0], failure); assert.equal(field.inert, true); assert.equal(liveObservers.size, 0); }
    finally { field.querySelectorAll = query; }
    available.value = false; await drain(); available.value = true; await drain(); assert.equal(liveObservers.size, 1); assert.equal(field.inert, false);
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); await drain(); assert.equal(controller.state.value.dirty, false);
    available.value = false; await drain(); app.unmount(); assert.equal(liveObservers.size, 0);
  } finally { app.unmount(); globalThis.MutationObserver = NativeObserver; host.remove(); }
});

test('cached Form retains field baselines while validators and selectors pause and resume current data', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const shown = shallowRef(true), api = shallowRef(), pending = [], signals = [], errors = [];
  let selected, constructed = 0;
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const validate = (_values, context) => { signals.push(context.signal); return new Promise(resolve => pending.push(resolve)); };
  const Observer = defineComponent({ setup() { constructed++; selected = useFormSelector(state => state); return () => h('span', selected.value.allIssues.length); } });
  const Cached = defineComponent({ render: () => h(FormRoot, { ref: api, validate, validateOn: ['input'] }, { default: () => [
    h(FormField, { id: 'email', name: 'email' }, { default: () => h('input') }), h(Observer),
  ] }) });
  const Empty = defineComponent({ render: () => null });
  const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
  app.config.errorHandler = error => errors.push(error);
  app.mount(host);
  try {
    await drain(); const input = host.querySelector('input'), form = host.querySelector('form');
    for (let cycle = 0; cycle < 3; cycle++) {
      input.value = `accepted-${cycle}`; input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('blur')); await drain();
      assert.equal(selected.value.dirty, true); assert.equal(selected.value.touched, true);
      input.value = `accepted-${cycle}-pending`; input.dispatchEvent(new Event('input', { bubbles: true })); await drain();
      assert.equal(selected.value.validation.status, 'validating'); assert.equal(signals.at(-1).aborted, false);
      shown.value = false; await drain(); assert.equal(signals.at(-1).aborted, true);
      const paused = selected.value, action = api.value;
      action.replaceIssues('form', [{ id: 'paused', source: 'form', message: `Paused ${cycle}` }]); await drain();
      assert.equal(selected.value, paused, 'inactive selector owns no native subscription');
      const count = pending.length;
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('blur')); await drain(); assert.equal(pending.length, count);
      for (const resolve of pending) resolve({ issues: [{ message: 'Stale validation' }] }); await drain();
      shown.value = true; await drain(); assert.equal(host.querySelector('input'), input); assert.equal(constructed, 1);
      assert.equal(selected.value.allIssues[0].message, `Paused ${cycle}`); assert.equal(selected.value.dirty, true); assert.equal(selected.value.touched, true);
    }
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); await drain(); assert.equal(selected.value.dirty, false, 'reactivation retains the original field baseline');
    shown.value = false; await drain(); const add = form.addEventListener, failure = new Error('Form observation failed');
    form.addEventListener = function(type, ...args) { if (type === 'blur') throw failure; return add.call(this, type, ...args); };
    try {
      shown.value = true; await drain(); assert.equal(errors[0], failure); assert.equal(form.inert, true);
    } finally { form.addEventListener = add; }
    shown.value = false; await drain(); shown.value = true; await drain(); assert.equal(form.inert, false); assert.equal(host.querySelector('input'), input);
    shown.value = false; await drain(); app.unmount(); assert.equal(signals.every(signal => signal.aborted), true);
  } finally { app.unmount(); host.remove(); }
});

test('nested Form controls mount without a reactive render loop', () => {
  const fixture = fileURLToPath(new URL('./fixtures/form-nested-mount.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [fixture], {
    encoding: 'utf8',
    timeout: 3_000,
  });

  assert.equal(result.error?.code, undefined, result.error?.message);
  assert.equal(result.signal, null, `fixture terminated with ${result.signal}`);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('Vue Form value-control inventory is an explicit integration ratchet', () => {
  assert.deepEqual(Object.keys(formValueControlInventory), [
    'TextField',
    'NumberField',
    'CheckboxRoot',
    'SwitchRoot',
    'CheckboxGroupRoot',
    'RadioGroupRoot',
    'ListboxRoot',
    'SelectRoot',
    'ComboboxRoot',
    'TreeSelectRoot',
    'CascadeListRoot',
    'CascadeSelectRoot',
    'RatingRoot',
    'ToggleGroupRoot',
    'EditableRoot',
    'TagsInputRoot',
    'PinInputRoot',
    'SpinButtonRoot',
    'QuantityFieldRoot',
    'FileInputRoot',
    'DateField',
    'DateTimeField',
    'TimeField',
    'DateRangeFieldRoot',
    'TimeRangeFieldRoot',
    'SliderRoot',
    'MultiThumbSliderRoot',
    'ColorPickerRoot',
    'CalendarRoot',
    'RangeCalendarRoot',
    'DatePickerRoot',
    'DateRangePickerRoot',
    'DateTimePickerRoot',
    'DateTimeRangePickerRoot',
    'MonthPickerRoot',
    'MonthRangePickerRoot',
    'YearPickerRoot',
    'YearRangePickerRoot',
  ]);
  assert.equal(
    Object.values(formValueControlInventory)
      .filter(({ phase }) => phase === 'simple')
      .every(({ family }) => family !== 'compound'),
    true,
  );
});

test('Vue Form selector hooks rerender only affected form and field channels', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const renders = { dirty: 0, email: 0, profile: 0 };
  let emailController;
  const DirtyProbe = defineComponent({
    setup() {
      const dirty = useFormSelector((state) => state.dirty);
      return () => { renders.dirty += 1; return h('output', { 'data-probe': 'dirty' }, String(dirty.value)); };
    },
  });
  const FieldProbe = defineComponent({
    props: { id: { type: String, required: true } },
    setup(props) {
      const dirty = useFormFieldSelector(props.id, (field) => field?.dirty ?? false);
      if (props.id === 'email') emailController = useFormFieldController(props.id);
      return () => { renders[props.id] += 1; return h('output', { 'data-probe': props.id }, String(dirty.value)); };
    },
  });
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'email' }, { default: () => h('input') }),
        h(FormField, { id: 'profile' }, { default: () => h('input') }),
        h(DirtyProbe),
        h(FieldProbe, { id: 'email' }),
        h(FieldProbe, { id: 'profile' }),
      ],
    }),
  });
  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    renders.dirty = 0;
    renders.email = 0;
    renders.profile = 0;

    assert.equal(emailController.setMeta({ dirty: true }), true);
    await nextTick();
    assert.deepEqual(renders, { dirty: 1, email: 1, profile: 0 });

    assert.equal(emailController.setMeta({ dirty: true }), true);
    await nextTick();
    assert.deepEqual(renders, { dirty: 1, email: 1, profile: 0 });
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue Form selector components honor equality and field isolation', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const renders = { form: 0, email: 0, profile: 0 };
  let emailController;
  const ControllerProbe = defineComponent({
    setup() {
      emailController = useFormFieldController('email');
      return () => [];
    },
  });
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'email' }, { default: () => h('input') }),
        h(FormField, { id: 'profile' }, { default: () => h('input') }),
        h(ControllerProbe),
        h(FormSelector, {
          select: (state) => ({ valid: state.valid }),
          equals: (left, right) => left.valid === right.valid,
        }, { default: ({ selected }) => { renders.form += 1; return h('output', String(selected.valid)); } }),
        h(FormFieldSelector, {
          id: 'email',
          select: (field) => field?.issues ?? [],
        }, { default: ({ selected }) => { renders.email += 1; return h('output', String(selected.length)); } }),
        h(FormFieldSelector, {
          id: 'profile',
          select: (field) => field?.issues ?? [],
        }, { default: ({ selected }) => { renders.profile += 1; return h('output', String(selected.length)); } }),
      ],
    }),
  });
  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    renders.form = 0;
    renders.email = 0;
    renders.profile = 0;

    emailController.setMeta({ dirty: true });
    await nextTick();
    assert.deepEqual(renders, { form: 0, email: 0, profile: 0 });

    emailController.upsertIssue({ id: 'server-email', message: 'Unavailable', source: 'server', fieldId: 'email' });
    await nextTick();
    assert.deepEqual(renders, { form: 1, email: 1, profile: 0 });

    emailController.upsertIssue({ id: 'server-email', message: 'Unavailable', source: 'server', fieldId: 'email' });
    await nextTick();
    assert.deepEqual(renders, { form: 1, email: 1, profile: 0 });
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue Form coordinates native validation, focus, FormData, and reset without owning values', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const submissions = [];
  const states = [];
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => {
        event.preventDefault();
        submissions.push([...event.formData.entries()]);
      },
      onStateChange: (state) => states.push(state),
    }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'email', name: ['account', 'email'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Email' }),
            h(FormDescription, null, { default: () => 'Account email' }),
            h('input', {
              type: 'email',
              defaultValue: 'initial@sectile.dev',
            }),
            h(FormMessage),
          ],
        }),
        h(FormReset, null, { default: () => 'Reset' }),
        h(FormSubmit, null, { default: () => 'Save' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const form = host.querySelector('form');
  const input = host.querySelector('input');
  const summary = host.querySelector('[data-part="summary"]');
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(input instanceof HTMLInputElement);
  assert.equal(input.id, 'email-control');
  assert.equal(input.name, 'account.email');
  assert.equal(input.required, true);
  assert.equal(input.getAttribute('aria-describedby'), 'email-description email-message');

  input.value = '';
  form.requestSubmit();
  await Promise.resolve();
  await nextTick();
  assert.equal(document.activeElement?.id, input.id);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(summary.hidden, false);
  assert.equal(submissions.length, 0);
  assert.equal(states.some((state) => state.validation.status === 'invalid'), true);

  input.value = 'release@sectile.dev';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.requestSubmit();
  await nextTick();
  assert.deepEqual(submissions, [[['account.email', 'release@sectile.dev']]]);

  const reset = host.querySelector('[data-part="reset"]');
  assert.ok(reset instanceof HTMLButtonElement);
  reset.click();
  await nextTick();
  assert.equal(input.value, 'initial@sectile.dev');
  assert.equal(states.at(-1).validation.status, 'idle');
  assert.equal(states.at(-1).submission.status, 'idle');

  app.unmount();
  host.remove();
});

test('native-only Form fields preserve textarea and select successful controls', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let submitted;
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => { submitted = event; },
    }, {
      default: () => [
        h(FormField, { id: 'bio', name: ['profile', 'bio'] }, {
          default: () => h('textarea', { defaultValue: 'Maintainer' }),
        }),
        h(FormField, { id: 'plan', name: ['billing', 'plan'] }, {
          default: () => h('select', { value: 'team' }, [
            h('option', { value: 'starter' }, 'Starter'),
            h('option', { value: 'team' }, 'Team'),
          ]),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    host.querySelector('form').requestSubmit();

    assert.equal(submitted.values.profile.bio, 'Maintainer');
    assert.equal(submitted.values.billing.plan, 'team');
    assert.deepEqual([...submitted.formData.entries()], [
      ['profile.bio', 'Maintainer'],
      ['billing.plan', 'team'],
    ]);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('mixed native and Sectile controls serialize in one document-ordered FormData', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let entries;
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => { entries = [...event.formData.entries()]; },
    }, {
      default: () => [
        h(FormField, { name: 'native' }, {
          default: () => h('input', { defaultValue: 'first' }),
        }),
        h(FormField, { name: 'sectile' }, {
          default: () => h(TextField, { defaultValue: 'second' }),
        }),
        h(FormField, { name: 'enabled' }, {
          default: () => h(CheckboxRoot, { defaultValue: true, value: 'yes' }),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    host.querySelector('form').requestSubmit();

    assert.deepEqual(entries, [
      ['native', 'first'],
      ['sectile', 'second'],
      ['enabled', 'yes'],
    ]);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('named controls outside FormField submit without enhanced field registration', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let state;
  let submitted;
  const app = createApp({
    render: () => h(FormRoot, {
      onStateChange: (next) => { state = next; },
      onSubmit: (event) => { submitted = event.values; },
    }, {
      default: () => [
        h('input', { name: 'direct', value: 'outside' }),
        h(FormField, { id: 'enhanced', name: 'enhanced' }, {
          default: () => h('input', { value: 'inside' }),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    await nextTick();

    assert.deepEqual(state.fields.map((field) => field.id), ['enhanced']);
    host.querySelector('form').requestSubmit();
    assert.equal(submitted.direct, 'outside');
    assert.equal(submitted.enhanced, 'inside');
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue Form reset restores native and uncontrolled Sectile defaults without taking controlled ownership', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const controlledUpdates = [];
  const controlledTextValue = shallowRef('controlled-default');
  const rootRef = ref(null);
  let state;
  const app = createApp({
    render: () => h(FormRoot, {
      ref: rootRef,
      onStateChange: (next) => { state = next; },
    }, {
      default: () => [
        h(FormField, { name: 'native' }, {
          default: () => h('input', { defaultValue: 'native-default' }),
        }),
        h(FormField, { name: 'text' }, {
          default: () => h(TextField, { defaultValue: 'sectile-default' }),
        }),
        h(FormField, { name: 'controlledText' }, {
          default: () => h(TextField, { modelValue: controlledTextValue.value }),
        }),
        h(FormField, { name: 'textarea' }, {
          default: () => h(TextField, { multiline: true, defaultValue: 'textarea-default' }),
        }),
        h(FormField, { name: 'uncontrolled' }, {
          default: () => h(CheckboxRoot, { defaultValue: true }),
        }),
        h(FormField, { name: 'controlled' }, {
          default: () => h(CheckboxRoot, {
            modelValue: true,
            'onUpdate:modelValue': (value) => controlledUpdates.push(value),
          }),
        }),
        h(FormReset, null, { default: () => 'Reset' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const native = host.querySelector('input[name="native"]');
  const text = host.querySelector('input[name="text"]');
  const controlledText = host.querySelector('input[name="controlledText"]');
  const textarea = host.querySelector('textarea[name="textarea"]');
  const checkboxRoots = [...host.querySelectorAll('[data-scope="checkbox"][data-part="root"]')];
  assert.ok(native instanceof HTMLInputElement);
  assert.ok(text instanceof HTMLInputElement);
  assert.ok(controlledText instanceof HTMLInputElement);
  assert.ok(textarea instanceof window.HTMLTextAreaElement);
  assert.equal(text.defaultValue, 'sectile-default');
  assert.equal(controlledText.defaultValue, 'controlled-default');
  assert.equal(textarea.defaultValue, 'textarea-default');
  assert.equal(checkboxRoots.length, 2);

  native.value = 'changed-native';
  native.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  native.dispatchEvent(new Event('blur'));
  text.value = 'changed-sectile';
  text.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  checkboxRoots[0].click();
  checkboxRoots[1].click();
  await nextTick();
  assert.equal(checkboxRoots[0].getAttribute('data-state'), 'unchecked');
  assert.equal(checkboxRoots[1].getAttribute('data-state'), 'checked');
  assert.deepEqual(controlledUpdates, [false]);
  assert.equal(state.dirty, true);
  assert.equal(state.touched, true);

  native.value = 'native-default';
  native.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  text.value = 'sectile-default';
  text.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  checkboxRoots[0].click();
  await nextTick();
  await Promise.resolve();
  assert.equal(state.dirty, false);
  assert.equal(state.touched, true);

  native.value = 'new-baseline';
  native.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  assert.equal(state.dirty, true);
  rootRef.value.reinitialize({ preserve: { touched: true } });
  assert.equal(state.dirty, false);
  assert.equal(state.touched, true);

  native.value = 'changed-native';
  native.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  text.value = 'changed-sectile';
  text.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  checkboxRoots[0].click();
  await nextTick();

  textarea.value = 'changed-textarea';
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  controlledTextValue.value = 'controlled-latest';
  await nextTick();
  assert.equal(controlledText.defaultValue, 'controlled-latest');
  host.querySelector('[data-part="reset"]').click();
  await Promise.resolve();
  await nextTick();
  assert.equal(native.value, 'native-default');
  assert.equal(text.value, 'sectile-default');
  assert.equal(textarea.value, 'textarea-default');
  assert.equal(controlledText.value, 'controlled-latest');
  assert.equal(checkboxRoots[0].getAttribute('data-state'), 'checked');
  assert.equal(checkboxRoots[1].getAttribute('data-state'), 'checked');
  assert.deepEqual(controlledUpdates, [false]);

  app.unmount();
  host.remove();
});

test('Vue Form owns async submission success and failure lifecycle', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let mode = 'pending';
  let resolveSubmission;
  let state;
  const handler = (event) => {
    event.preventDefault();
    if (mode === 'pending') {
      event.reinitialize();
      return new Promise((resolve) => { resolveSubmission = resolve; });
    }
    if (mode === 'field-error') {
      return {
        ok: false,
        issues: [{ path: 'email', message: 'Email already in use.' }],
      };
    }
    return Promise.reject(new Error('Network unavailable.'));
  };
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: handler,
      onStateChange: (next) => { state = next; },
    }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'email', name: 'email' }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Email' }),
            h(TextField, { defaultValue: 'mina@sectile.dev' }),
            h(FormMessage),
          ],
        }),
        h(FormSubmit, null, { default: () => 'Save' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  const form = host.querySelector('form');
  const input = host.querySelector('input');
  const message = host.querySelector('[data-part="message"]');
  const summary = host.querySelector('[data-part="summary"]');
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(input instanceof HTMLInputElement);
  assert.ok(message instanceof HTMLElement);
  assert.ok(summary instanceof HTMLElement);

  input.value = 'release@sectile.dev';
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  form.requestSubmit();
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'submitting');
  resolveSubmission();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'idle');
  assert.equal(state.dirty, false);

  mode = 'field-error';
  form.requestSubmit();
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'failed');
  assert.equal(message.textContent, 'Email already in use.');
  assert.equal(summary.hidden, false);
  assert.equal(document.activeElement, input);

  mode = 'reject';
  form.requestSubmit();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'failed');
  assert.match(summary.textContent ?? '', /Form submission failed/);
  assert.equal(state.valid, true);
  assert.deepEqual(state.submission.failure, { message: 'Form submission failed.' });
  assert.equal(message.hidden, true);
  assert.equal(document.activeElement, input);

  app.unmount();
  host.remove();
});

test('ISSUE-192: Vue Form maps PromiseLike inspection failures through mapSubmitError', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let state;
  let mappedReason;
  const thenable = {};
  Object.defineProperty(thenable, 'then', {
    get() { throw new Error('vue submit inspection failed'); },
  });
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: () => thenable,
      mapSubmitError: (reason) => {
        mappedReason = reason;
        return { message: 'Mapped Vue submission inspection failure.' };
      },
      onStateChange: (next) => { state = next; },
    }, {
      default: () => [
        h(FormSummary),
        h(FormSubmit, null, { default: () => 'Save' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  const form = host.querySelector('form');
  assert.ok(form instanceof HTMLFormElement);

  form.requestSubmit();
  await nextTick();

  assert.equal(mappedReason?.message, 'vue submit inspection failed');
  assert.equal(form.dataset.submissionStatus, 'failed');
  assert.deepEqual(state.submission.failure, { message: 'Mapped Vue submission inspection failure.' });

  app.unmount();
  host.remove();
});

test('Vue FormSummary keeps one multi-field issue and exposes related-field ARIA state', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let state;
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: () => ({
        ok: false,
        issues: [{
          message: 'Check the order number and email.',
          relatedPaths: ['orderNumber', 'email'],
        }],
      }),
      onStateChange: (next) => { state = next; },
    }, {
      default: () => [
        h(FormSummary, null, {
          default: ({ issues, submission, firstIssue }) => h(
            'span',
            { 'data-summary-slot': '' },
            `${submission.status}:${issues.length}:${firstIssue?.message ?? ''}`,
          ),
        }),
        h(FormField, { id: 'order-number', name: 'orderNumber' }, {
          default: () => h(TextField, { defaultValue: 'A-1' }),
        }),
        h(FormField, { id: 'email', name: 'email' }, {
          default: () => h(TextField, { defaultValue: 'wrong@example.com' }),
        }),
        h(FormSubmit, null, { default: () => 'Look up' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  const form = host.querySelector('form');
  const summary = host.querySelector('[data-part="summary"]');
  const inputs = [...host.querySelectorAll('input')];
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(summary instanceof HTMLElement);
  assert.equal(inputs.length, 2);

  form.requestSubmit();
  await nextTick();

  assert.equal(state.allIssues.length, 1);
  assert.equal(state.fields[0].valid, false);
  assert.equal(state.fields[1].valid, false);
  assert.equal(summary.textContent, 'failed:1:Check the order number and email.');
  assert.equal(inputs[0].getAttribute('aria-invalid'), 'true');
  assert.equal(inputs[1].getAttribute('aria-invalid'), 'true');
  assert.equal(inputs[0].getAttribute('aria-errormessage'), summary.id);
  assert.equal(inputs[1].getAttribute('aria-errormessage'), summary.id);

  inputs[1].value = 'correct@example.com';
  inputs[1].dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  await nextTick();

  assert.deepEqual(state.allIssues, []);
  assert.equal(state.submission.status, 'idle');
  assert.equal(summary.hidden, true);

  app.unmount();
  host.remove();
});

test('Vue Form live regions suppress stale semantics during retained exit and restore current messages on reopen', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const issues = ref([{ path: 'email', message: 'Email is already in use.' }]);
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({
    render: () => h(FormRoot, { issues: issues.value }, {
      default: () => [
        h(FormSummary, { style: motion }),
        h(FormField, { id: 'email', name: 'email' }, {
          default: () => [
            h(TextField, { defaultValue: 'team@sectile.dev' }),
            h(FormMessage, { style: motion }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  try {
    await nextTick();
    await nextTick();
    const summary = host.querySelector('[data-part="summary"]');
    const message = host.querySelector('[data-part="message"]');
    assert.ok(summary instanceof HTMLElement);
    assert.ok(message instanceof HTMLElement);
    assert.equal(summary.hidden, false);
    assert.equal(message.hidden, false);
    assert.equal(summary.getAttribute('role'), 'alert');
    assert.equal(message.getAttribute('role'), 'alert');

    issues.value = [];
    await nextTick();
    await nextTick();
    await nextTick();
    for (const live of [summary, message]) {
      assert.equal(live.dataset.state, 'hidden');
      assert.equal(live.hidden, false);
      assert.equal(live.inert, true);
      assert.equal(live.getAttribute('role'), null);
      assert.equal(live.getAttribute('aria-live'), 'off');
      assert.equal(live.getAttribute('aria-hidden'), 'true');
    }

    issues.value = [{ path: 'email', message: 'Use another address.' }];
    await nextTick();
    await nextTick();
    await nextTick();
    for (const live of [summary, message]) {
      assert.equal(live.dataset.state, 'visible');
      assert.equal(live.hidden, false);
      assert.equal(live.inert, false);
      assert.equal(live.getAttribute('role'), 'alert');
      assert.equal(live.getAttribute('aria-live'), 'polite');
      assert.equal(live.getAttribute('aria-hidden'), null);
      assert.match(live.textContent, /Use another address/);
    }

    issues.value = [];
    await nextTick();
    await nextTick();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 25));
    summary.dispatchEvent(new Event('transitionend', { bubbles: true }));
    message.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await nextTick();
    await nextTick();
    for (const live of [summary, message]) {
      assert.equal(live.hidden, true);
      assert.equal(live.inert, false);
      assert.equal(live.getAttribute('role'), null);
      assert.equal(live.getAttribute('aria-live'), 'off');
      assert.equal(live.getAttribute('aria-hidden'), null);
    }
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue FormField uses native fieldset semantics and preserves explicit child metadata', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'channels',
        name: 'channels',
        required: true,
        disabled: true,
      }, {
        default: () => h('fieldset', null, [
          h(FormLabel, null, { default: () => 'Channels' }),
          h(FormDescription, null, { default: () => 'Choose notification channels.' }),
          h('input', { id: 'explicit-email', name: 'explicit-channel', type: 'checkbox', value: 'email' }),
          h('input', { type: 'checkbox', value: 'sms' }),
        ]),
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const fieldset = host.querySelector('fieldset');
  const legend = host.querySelector('legend');
  const inputs = [...host.querySelectorAll('input')];
  assert.ok(fieldset instanceof browserWindow.HTMLFieldSetElement);
  assert.ok(legend instanceof browserWindow.HTMLLegendElement);
  assert.equal(legend.hasAttribute('for'), false);
  assert.equal(fieldset.getAttribute('aria-required'), 'true');
  assert.equal(fieldset.getAttribute('aria-describedby'), 'channels-description channels-message');
  assert.equal(fieldset.disabled, true);
  assert.equal(inputs[0].id, 'explicit-email');
  assert.equal(inputs[0].name, 'explicit-channel');
  assert.equal(inputs[1].name, 'channels');

  app.unmount();
  host.remove();
});

test('native checkbox groups share one FormField path without requiring every choice', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let submitted;
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => { submitted = event.values; },
    }, {
      default: () => h(FormField, {
        id: 'channels',
        name: 'channels',
        required: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Channels' }),
          h('input', { type: 'checkbox', value: 'email', checked: true }),
          h('input', { type: 'checkbox', value: 'sms', checked: true }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const field = host.querySelector('[data-part="field"]');
  const label = host.querySelector('[data-part="label"]');
  const inputs = [...host.querySelectorAll('input')];
  assert.ok(field instanceof HTMLElement);
  assert.ok(label instanceof HTMLElement);
  assert.equal(label.tagName, 'SPAN');
  assert.equal(field.getAttribute('aria-labelledby'), 'channels-label');
  assert.equal(field.getAttribute('aria-required'), 'true');
  assert.deepEqual(inputs.map((input) => input.name), ['channels', 'channels']);
  assert.deepEqual(inputs.map((input) => input.required), [false, false]);

  host.querySelector('form').requestSubmit();
  assert.deepEqual(submitted.channels, ['email', 'sms']);

  app.unmount();
  host.remove();
});

test('fieldset checkbox groups keep group required semantics and focus an enabled control', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, {
      schema: {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: () => ({
            issues: [{ path: ['channels'], message: 'Review the channel selection.' }],
          }),
        },
      },
    }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'channels', name: 'channels', required: true }, {
          default: () => h('fieldset', null, [
            h(FormLabel, null, { default: () => 'Channels' }),
            h('input', { type: 'checkbox', value: 'email', disabled: true }),
            h('input', { type: 'checkbox', value: 'sms', checked: true }),
          ]),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();

    const inputs = [...host.querySelectorAll('input[type="checkbox"]')];
    assert.deepEqual(inputs.map((input) => input.required), [false, false]);

    host.querySelector('form').requestSubmit();

    assert.equal(document.activeElement, inputs[1]);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('fieldset fields retain focus on their first invalid native control', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'profile', name: 'profile' }, {
          default: () => h('fieldset', null, [
            h(FormLabel, null, { default: () => 'Profile' }),
            h('input', { name: 'profile.first', value: 'ready' }),
            h('input', { name: 'profile.second', required: true }),
          ]),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();

    const inputs = [...host.querySelectorAll('input')];
    host.querySelector('form').requestSubmit();
    await Promise.resolve();

    assert.equal(document.activeElement, inputs[1]);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('native radio groups share one FormField path and serialize the checked choice', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let submitted;
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => { submitted = event.values; },
    }, {
      default: () => h(FormField, { id: 'contact', name: 'contact', required: true }, {
        default: () => h('fieldset', null, [
          h(FormLabel, null, { default: () => 'Contact method' }),
          h('input', { type: 'radio', value: 'email' }),
          h('input', { type: 'radio', value: 'phone', checked: true }),
        ]),
      }),
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();

    const radios = [...host.querySelectorAll('input[type="radio"]')];
    assert.deepEqual(radios.map((input) => input.name), ['contact', 'contact']);
    host.querySelector('form').requestSubmit();
    assert.equal(submitted.contact, 'phone');
  } finally {
    app.unmount();
    host.remove();
  }
});

test('unrelated native controls produce a field diagnostic instead of choosing one target', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let state;
  const app = createApp({
    render: () => h(FormRoot, {
      onStateChange: (next) => { state = next; },
    }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'ambiguous', name: 'ambiguous' }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Ambiguous' }),
            h('input', { type: 'text' }),
            h('select', null, [h('option', { value: 'one' }, 'One')]),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  await nextTick();

  const inputs = [...host.querySelectorAll('input, select')];
  assert.equal(state.fields[0].valid, false);
  assert.equal(state.fields[0].issues[0].source, 'field');
  assert.match(state.fields[0].issues[0].message, /multiple unrelated native controls/);
  assert.deepEqual(inputs.map((input) => input.id), ['', '']);

  host.querySelector('form').requestSubmit();
  await nextTick();
  assert.equal(document.activeElement, host.querySelector('[data-part="summary"]'));

  app.unmount();
  host.remove();
});

test('multiple custom registrations and invalid paths become recoverable field diagnostics', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let state;
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (message) => { warnings.push(message); };
  const AtomicInput = defineComponent({
    name: 'DiagnosticAtomicInput',
    setup() {
      const input = shallowRef(null);
      const participation = useFormControl({
        element: input,
        semanticControl: input,
        focusTarget: input,
        validationTarget: input,
        labelMode: 'for',
        capabilities: { id: true },
      });
      return () => h('input', mergeProps(participation.controlProps.value, { ref: input }));
    },
  });
  const app = createApp({
    render: () => h(FormRoot, {
      onStateChange: (next) => { state = next; },
    }, {
      default: () => [
        h(FormField, { id: 'custom-ambiguous', name: 'custom' }, {
          default: () => [h(AtomicInput), h(AtomicInput)],
        }),
        h(FormField, { id: 'invalid-path', name: 'profile..email' }, {
          default: () => h('input'),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    await nextTick();

    const custom = state.fields.find((field) => field.id === 'custom-ambiguous');
    const invalidPath = state.fields.find((field) => field.id === 'invalid-path');
    assert.match(custom.issues[0].message, /multiple active controls/);
    assert.match(invalidPath.issues[0].message, /invalid field path/);
    assert.equal(host.querySelectorAll('[data-part="field"]')[1].querySelector('input').name, '');
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = previousWarn;
    app.unmount();
    host.remove();
  }
});

test('configured descendant issues use the longest FormField path and summary fallback', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, {
      issues: [
        { path: ['profile', 'email', 'domain'], message: 'Use an approved domain.' },
        { path: ['unowned'], message: 'Review the complete form.' },
      ],
    }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'profile', name: 'profile' }, {
          default: () => [h('input')],
        }),
        h(FormField, { id: 'email', name: 'profile.email' }, {
          default: () => [h('input'), h(FormMessage)],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  await nextTick();

  const fields = [...host.querySelectorAll('[data-part="field"]')];
  assert.equal(fields[0].hasAttribute('data-invalid'), false);
  assert.equal(fields[1].hasAttribute('data-invalid'), true);
  assert.equal(fields[1].querySelector('[data-part="message"]').textContent, 'Use an approved domain.');

  host.querySelector('form').requestSubmit();
  await nextTick();
  assert.equal(document.activeElement, fields[1].querySelector('input'));
  assert.match(host.querySelector('[data-part="summary"]').textContent, /Review the complete form/);

  app.unmount();
  host.remove();
});

test('native fallback prefers a visible control over hidden submission elements', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, { id: 'search', name: 'query' }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Search' }),
          h('input', { name: 'source', type: 'hidden', value: 'metadata' }),
          h('input', { type: 'search' }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const hidden = host.querySelector('input[type="hidden"]');
  const search = host.querySelector('input[type="search"]');
  const label = host.querySelector('label');
  assert.ok(hidden instanceof HTMLInputElement);
  assert.ok(search instanceof HTMLInputElement);
  assert.ok(label instanceof browserWindow.HTMLLabelElement);
  assert.equal(search.id, 'search-control');
  assert.equal(label.htmlFor, search.id);
  assert.equal(hidden.id, '');
  assert.equal(hidden.name, 'source');
  assert.equal(search.name, 'query');

  app.unmount();
  host.remove();
});

test('teleported custom controls keep FormField context, form association, and interaction state', async () => {
  const host = document.createElement('div');
  const portal = document.createElement('div');
  document.body.append(host, portal);
  let state;
  let submitted;
  const AtomicInput = defineComponent({
    name: 'AtomicInput',
    inheritAttrs: false,
    setup(_, { attrs }) {
      const input = shallowRef(null);
      const participation = useFormControl({
        element: input,
        semanticControl: input,
        focusTarget: input,
        validationTarget: input,
        labelMode: 'for',
        capabilities: {
          id: true,
          describedBy: true,
          invalid: true,
          required: true,
          disabled: true,
          readonly: true,
        },
      });
      return () => h('input', mergeProps(attrs, participation.controlProps.value, {
        ref: input,
        value: 'portal@sectile.dev',
      }));
    },
  });
  const app = createApp({
    render: () => h(FormRoot, {
      id: 'teleport-form',
      onStateChange: (next) => { state = next; },
      onSubmit: (event) => { submitted = event.values; },
    }, {
      default: () => h(FormField, {
        id: 'teleported-email',
        name: ['profile', 'email'],
        form: 'teleport-form',
        required: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Email' }),
          h(Teleport, { to: portal }, h(AtomicInput)),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  await nextTick();

  const input = portal.querySelector('input');
  assert.ok(input instanceof HTMLInputElement);
  assert.equal(input.name, 'profile.email');
  assert.equal(input.getAttribute('form'), 'teleport-form');
  assert.equal(input.required, true);

  input.value = 'changed@sectile.dev';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('blur'));
  assert.equal(state.fields[0].dirty, true);
  assert.equal(state.fields[0].touched, true);

  host.querySelector('form').requestSubmit();
  assert.equal(submitted.profile.email, 'changed@sectile.dev');

  app.unmount();
  host.remove();
  portal.remove();
});

test('dynamic custom-control replacement preserves field metadata and refreshes targets', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const variant = ref('first');
  let state;
  let submitted;
  const AtomicInput = defineComponent({
    name: 'ReplaceableAtomicInput',
    inheritAttrs: false,
    props: { value: { type: String, required: true } },
    setup(props, { attrs }) {
      const input = shallowRef(null);
      const participation = useFormControl({
        element: input,
        semanticControl: input,
        focusTarget: input,
        validationTarget: input,
        labelMode: 'for',
        capabilities: { id: true, describedBy: true, invalid: true },
      });
      return () => h('input', mergeProps(attrs, participation.controlProps.value, {
        ref: input,
        value: props.value,
      }));
    },
  });
  const app = createApp({
    render: () => h(FormRoot, {
      onStateChange: (next) => { state = next; },
      onSubmit: (event) => { submitted = event.values; },
    }, {
      default: () => h(FormField, { id: 'dynamic', name: 'dynamic' }, {
        default: () => h(AtomicInput, {
          key: variant.value,
          value: variant.value,
        }),
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  let input = host.querySelector('input');
  input.value = 'changed';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('blur'));
  assert.equal(state.fields[0].dirty, true);
  assert.equal(state.fields[0].touched, true);

  variant.value = 'second';
  await nextTick();
  await nextTick();
  input = host.querySelector('input');
  assert.equal(input.value, 'second');
  assert.equal(input.name, 'dynamic');
  assert.equal(state.fields[0].dirty, true);
  assert.equal(state.fields[0].touched, true);

  host.querySelector('form').requestSubmit();
  assert.equal(submitted.dynamic, 'second');

  app.unmount();
  host.remove();
});

test('useFormControl maps compound semantics and nested submission names to separate elements', async () => {
  const CompoundControl = defineComponent({
    name: 'CompoundControl',
    inheritAttrs: false,
    setup(_, { attrs }) {
      const semantic = shallowRef(null);
      const hidden = shallowRef(null);
      const participation = useFormControl({
        element: semantic,
        semanticControl: semantic,
        focusTarget: semantic,
        labelMode: 'labelledby',
        capabilities: {
          id: true,
          describedBy: true,
          invalid: true,
          labelledBy: true,
        },
        submissions: [{
          element: hidden,
          relativeName: 'value',
          capabilities: { name: true, form: true, disabled: true },
        }],
      });
      return () => h('div', mergeProps(participation.controlProps.value, attrs, {
        ref: semantic,
        role: 'group',
        tabindex: 0,
      }), [h('input', { ref: hidden, type: 'hidden', value: 'release' })]);
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'channel',
        name: ['notifications', 0],
        required: true,
        readonly: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Channel' }),
          h(FormDescription, null, { default: () => 'Primary notification channel.' }),
          h(CompoundControl),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const semantic = host.querySelector('[role="group"]');
  const hidden = host.querySelector('input[type="hidden"]');
  const label = host.querySelector('[data-part="label"]');
  assert.ok(semantic instanceof HTMLElement);
  assert.ok(hidden instanceof HTMLInputElement);
  assert.ok(label instanceof HTMLElement);
  assert.equal(label.tagName, 'SPAN');
  assert.equal(label.hasAttribute('for'), false);
  assert.equal(semantic.id, 'channel-control');
  assert.equal(semantic.getAttribute('aria-labelledby'), 'channel-label');
  assert.equal(semantic.getAttribute('aria-describedby'), 'channel-description channel-message');
  assert.equal(semantic.getAttribute('aria-required'), 'true');
  assert.equal(semantic.getAttribute('aria-readonly'), 'true');
  assert.equal(semantic.hasAttribute('name'), false);
  assert.equal(hidden.name, 'notifications[0].value');
  assert.equal(hidden.required, false);

  app.unmount();
  host.remove();
});

test('useFormControl is inert outside FormField while the native control still submits', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let participation;
  let state;
  let submitted;
  const AtomicControl = defineComponent({
    name: 'UnwrappedAtomicControl',
    setup() {
      const input = shallowRef(null);
      participation = useFormControl({
        element: input,
        semanticControl: input,
        focusTarget: input,
        validationTarget: input,
        labelMode: 'for',
        capabilities: { id: true, describedBy: true, invalid: true },
      });
      return () => h('input', {
        ...participation.controlProps.value,
        ref: input,
        name: 'direct-custom',
        value: 'available',
      });
    },
  });
  const app = createApp({
    render: () => h(FormRoot, {
      onStateChange: (next) => { state = next; },
      onSubmit: (event) => { submitted = event.values; },
    }, { default: () => h(AtomicControl) }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();

    assert.equal(participation.participating, false);
    assert.deepEqual(participation.controlProps.value, {});
    assert.deepEqual(state.fields, []);
    host.querySelector('form').requestSubmit();
    assert.equal(submitted['direct-custom'], 'available');
  } finally {
    app.unmount();
    host.remove();
  }
});

test('custom composite ownership prevents nested duplicate registration and resets once', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let childParticipation;
  let resetCount = 0;
  let state;
  const NestedInput = defineComponent({
    name: 'OwnedNestedInput',
    setup() {
      const input = shallowRef(null);
      childParticipation = useNativeInputFormControl(input);
      return () => h('input', {
        ...childParticipation.controlProps.value,
        ref: input,
        value: 'focus-only',
      });
    },
  });
  const CompositeControl = defineComponent({
    name: 'OwnedCompositeControl',
    setup() {
      const root = shallowRef(null);
      const hidden = shallowRef(null);
      const participation = useCompositeFormControl({
        root,
        submissions: [{
          element: hidden,
          relativeName: 'choice',
          capabilities: { name: true, form: true, disabled: true },
        }],
        reset: () => { resetCount += 1; },
      });
      provideFormControlOwner();
      return () => h('div', {
        ...participation.controlProps.value,
        ref: root,
        tabindex: 0,
      }, [
        h(NestedInput),
        h('input', { ref: hidden, type: 'hidden', value: 'nested' }),
      ]);
    },
  });
  const app = createApp({
    render: () => h(FormRoot, {
      onStateChange: (next) => { state = next; },
    }, {
      default: () => [
        h(FormField, { id: 'custom-composite', name: 'profile' }, {
          default: () => h(CompositeControl),
        }),
        h(FormReset, null, { default: () => 'Reset' }),
      ],
    }),
  });

  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    await nextTick();

    assert.equal(childParticipation.participating, false);
    assert.deepEqual(state.fields.map((field) => field.id), ['custom-composite']);
    assert.deepEqual([...new FormData(host.querySelector('form')).entries()], [
      ['profile.choice', 'nested'],
    ]);
    host.querySelector('[data-part="reset"]').click();
    await nextTick();
    assert.equal(resetCount, 1);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Sectile scalar and boolean controls inherit FormField metadata through their actual targets', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, { id: 'settings-form' }, {
      default: () => [
        h(FormField, { id: 'display-name', name: ['profile', 'displayName'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Display name' }),
            h(TextField, { defaultValue: 'Mina' }),
          ],
        }),
        h(FormField, { id: 'analytics', name: ['preferences', 'analytics'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Analytics' }),
            h(CheckboxRoot, { defaultValue: true, value: 'enabled' }),
          ],
        }),
        h(FormField, { id: 'notifications', name: ['preferences', 'notifications'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Notifications' }),
            h(SwitchRoot, { defaultValue: true, value: 'enabled' }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const text = host.querySelector('[data-scope="text"]');
  const checkbox = host.querySelector('[role="checkbox"]');
  const switchControl = host.querySelector('[role="switch"]');
  const hiddenInputs = [...host.querySelectorAll('input[type="checkbox"]')];
  assert.ok(text instanceof HTMLInputElement);
  assert.ok(checkbox instanceof HTMLElement);
  assert.ok(switchControl instanceof HTMLElement);
  assert.equal(text.id, 'display-name-control');
  assert.equal(text.name, 'profile.displayName');
  assert.equal(text.required, true);
  assert.equal(checkbox.getAttribute('aria-labelledby'), 'analytics-label');
  assert.equal(switchControl.getAttribute('aria-labelledby'), 'notifications-label');
  assert.deepEqual(hiddenInputs.map((input) => [input.name, input.value]), [
    ['preferences.analytics', 'enabled'],
    ['preferences.notifications', 'enabled'],
  ]);

  app.unmount();
  host.remove();
});

test('Sectile group and selection controls keep semantics separate from successful controls', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'channels', name: ['preferences', 'channels'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Channels' }),
            h(CheckboxGroupRoot, { items: ['email', 'sms'], defaultValue: ['email', 'sms'] }),
          ],
        }),
        h(FormField, { id: 'plan', name: ['billing', 'plan'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Plan' }),
            h(RadioGroupRoot, { items: ['starter', 'team'], defaultValue: 'team' }),
          ],
        }),
        h(FormField, { id: 'regions', name: ['deployment', 'regions'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Regions' }),
            h(ListboxRoot, {
              items: ['icn', 'fra'],
              selectionMode: 'multiple',
              defaultValue: ['icn', 'fra'],
            }),
          ],
        }),
        h(FormField, { id: 'environment', name: ['deployment', 'environment'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Environment' }),
            h(SelectRoot, { items: ['preview', 'production'], defaultValue: 'production' }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const roots = [...host.querySelectorAll('[data-part="root"]')];
  assert.equal(roots.every((root) => !root.hasAttribute('name')), true);
  assert.equal(host.querySelector('[data-scope="checkbox-group"]')?.getAttribute('aria-labelledby'), 'channels-label');
  assert.equal(host.querySelector('[data-scope="radio-group"]')?.getAttribute('aria-labelledby'), 'plan-label');
  assert.deepEqual(
    [...host.querySelectorAll('input[type="hidden"]')].map((input) => [input.name, input.value]),
    [
      ['preferences.channels', 'email'],
      ['preferences.channels', 'sms'],
    ],
  );
  assert.deepEqual(
    [...host.querySelectorAll('input[type="radio"]')].map((input) => [input.name, input.value, input.checked]),
    [
      ['billing.plan', 'starter', false],
      ['billing.plan', 'team', true],
    ],
  );
  assert.deepEqual(
    [...host.querySelectorAll('select')].map((select) => [select.name, select.value, select.multiple]),
    [
      ['deployment.regions', 'icn', true],
      ['deployment.environment', 'production', false],
    ],
  );

  app.unmount();
  host.remove();
});

test('TextField and Select remain editable inside a reactive FormField', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const submissions = [];
  const roles = ['member', 'admin'];
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => {
        event.preventDefault();
        submissions.push(event.values);
      },
    }, {
      default: () => [
        h(FormField, { name: ['invitation', 'email'] }, {
          default: () => h(TextField, { defaultValue: 'alex@example.com' }),
        }),
        h(FormField, { name: ['invitation', 'role'] }, {
          default: () => h(SelectRoot, { items: roles, defaultValue: 'member' }, {
            default: () => [
              h(SelectTrigger, null, { default: () => h(SelectValue) }),
              h(SelectContent, null, {
                default: () => roles.map((role) => h(SelectItem, { value: role }, {
                  default: () => role,
                })),
              }),
            ],
          }),
        }),
        h(FormSubmit, null, { default: () => 'Invite' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const form = host.querySelector('form');
  const email = host.querySelector('input[type="text"]');
  const trigger = host.querySelector('[data-scope="select"][data-part="trigger"]');
  const content = host.querySelector('[data-scope="select"][data-part="content"]');
  const admin = host.querySelector('[data-sectile-select-id="admin"]');
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(email instanceof HTMLInputElement);
  assert.ok(trigger instanceof browserWindow.HTMLButtonElement);
  assert.ok(content instanceof HTMLElement);
  assert.ok(admin instanceof HTMLElement);

  email.value = 'mina@sectile.dev';
  email.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertReplacementText',
  }));
  await nextTick();
  assert.equal(email.value, 'mina@sectile.dev');

  trigger.click();
  await nextTick();
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(content.hidden, false);

  admin.click();
  await nextTick();
  assert.equal(trigger.textContent, 'admin');
  assert.equal(content.hidden, true);

  form.requestSubmit();
  await nextTick();
  assert.equal(submissions[0]?.invitation?.email, 'mina@sectile.dev');
  assert.equal(submissions[0]?.invitation?.role, 'admin');

  app.unmount();
  host.remove();
});

for (const controlled of [false, true]) test(`Select selected Form options retain accepted values and registered reset (${controlled})`, async () => {
  const items = shallowRef(['a', 'b']), mode = shallowRef('selected'), disabled = shallowRef(false), proposals = [], errors = [];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'service', required: true, disabled: disabled.value }, {
    default: () => h(SelectRoot, { items: items.value, formOptions: mode.value, ...(controlled ? { modelValue: 'a' } : { defaultValue: 'a' }),
      position: false, disabled: disabled.value, label: 'Service', 'onUpdate:modelValue': value => proposals.push(value) }, {
      default: () => [h(SelectTrigger), h(SelectContent, null, { default: () => ['a', 'b'].filter(id => items.value.includes(id)).map(id => h(SelectItem, { value: id }, () => id)) })],
    }),
  }) }) });
  app.config.errorHandler = error => errors.push(error);
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  try {
    app.mount(host); await drain();
    const form = host.querySelector('form'), select = host.querySelector('select'), trigger = host.querySelector('[data-part=trigger]'), content = host.querySelector('[data-part=content]');
    assert.equal(select.options.length, 2); assert.equal(select.required, true); assert.deepEqual(new FormData(form).getAll('service'), ['a']);
    trigger.click(); await drain(); host.querySelector('[data-sectile-select-id=b]').click(); await drain();
    assert.deepEqual(proposals, ['b']); assert.deepEqual(new FormData(form).getAll('service'), [controlled ? 'a' : 'b']);
    assert.equal(select.options.length, 2);
    mode.value = 'all'; await drain(); assert.equal(select.options.length, 3);
    mode.value = 'selected'; await drain(); assert.equal(select.options.length, 2);
    assert.equal(host.querySelector('[data-part=trigger]'), trigger); assert.equal(host.querySelector('[data-part=content]'), content);
    form.reset(); await drain(); assert.deepEqual(new FormData(form).getAll('service'), ['a']);
    items.value = ['b']; await drain(); assert.equal(select.options.length, 1); assert.deepEqual(new FormData(form).getAll('service'), ['']);
    disabled.value = true; await drain();
    assert.equal(select.disabled, true, select.outerHTML);
    // Happy DOM serializes disabled SELECT elements; native successful-control
    // exclusion remains part of maintainer-owned physical acceptance.
    assert.deepEqual(errors, []);
  } finally { app.unmount(); host.remove(); }
});

async function defaultsReaderFixture() {
  const { useFormFieldDefaults, provideFormBoundary } = await import('../.verification-dist/form-boundary.js');
  const flags = shallowRef({ disabled: true, readonly: true, required: true }), name = shallowRef(['amount']), readers = {};
  const Reader = defineComponent({ props: { location: String }, setup(props) {
    const defaults = useFormFieldDefaults(); readers[props.location] = defaults;
    return () => h('output', { 'data-defaults': props.location }, defaults === undefined ? 'none' : String(defaults.value.disabled));
  } });
  const Owner = defineComponent({ setup() { provideFormControlOwner(); return () => h(Reader, { location: 'owned' }); } });
  const Boundary = defineComponent({ setup() { provideFormBoundary(); return () => h(Reader, { location: 'boundary' }); } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => [h(Reader, { location: 'outside' }),
    h(FormField, { name: name.value, ...flags.value }, { default: () => [
      h(Reader, { location: 'inside' }), h(TextField, { defaultValue: 'a' }), h(Owner), h(Boundary),
    ] }),
  ] }) });
  app.mount(host); await nextTick(); await nextTick();
  return { host, flags, name, readers, dispose() { app.unmount(); host.remove(); } };
}

test('Form field defaults are scoped readonly scalar snapshots without another control registration', async () => {
  const fixture = await defaultsReaderFixture();
  const view = fixture.readers.inside;
  try {
    assert.equal(fixture.readers.outside, undefined); assert.equal(fixture.readers.owned, undefined); assert.equal(fixture.readers.boundary, undefined);
    assert.deepEqual(view.value, { disabled: true, readonly: true, required: true }); assert.equal(Object.isFrozen(view.value), true);
    assert.equal(Reflect.set(view.value, 'disabled', false), false);
    const input = fixture.host.querySelector('input'); assert.equal(input.name, 'amount'); assert.equal(fixture.host.querySelectorAll('input').length, 1);
    const original = view.value;
    fixture.flags.value = { disabled: true, readonly: true, required: true }; await nextTick(); await nextTick();
    assert.equal(view.value, original, 'equivalent defaults preserve snapshot identity');
    fixture.flags.value = { disabled: false, readonly: false, required: false }; await nextTick(); await nextTick();
    assert.deepEqual(view.value, fixture.flags.value); assert.notEqual(view.value, original);
    assert.deepEqual(new FormData(fixture.host.querySelector('form')).getAll('amount'), ['a']);
    const retired = view.value; fixture.dispose();
    fixture.flags.value = { disabled: true, readonly: true, required: true }; await nextTick();
    assert.equal(view.value, retired, 'a retained view keeps only the last retired scalar snapshot');
  } finally { if (fixture.host.isConnected) fixture.dispose(); }
});

test('a retained field-default view does not retain disposed field metadata', { skip: typeof global.gc !== 'function' }, async () => {
  let fixture = await defaultsReaderFixture();
  const view = fixture.readers.inside, borrowedName = new WeakRef(fixture.name.value);
  fixture.dispose(); fixture.name.value = undefined; fixture = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => setImmediate(resolve)); global.gc();
    await new Promise(resolve => setImmediate(resolve));
    if (borrowedName.deref() === undefined) break;
  }
  assert.equal(borrowedName.deref(), undefined); assert.deepEqual(view.value, { disabled: true, readonly: true, required: true });
});

test('explicit control metadata wins over inherited FormField defaults', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'inherited',
        name: 'inherited-name',
        required: true,
        disabled: true,
        readonly: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Explicit control' }),
          h(TextField, {
            id: 'explicit-control',
            name: 'explicit-name',
            required: false,
            disabled: false,
            readonly: false,
          }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const input = host.querySelector('[data-scope="text"]');
  const label = host.querySelector('label');
  assert.ok(input instanceof HTMLInputElement);
  assert.ok(label instanceof browserWindow.HTMLLabelElement);
  assert.equal(input.id, 'explicit-control');
  assert.equal(input.name, 'explicit-name');
  assert.equal(input.required, false);
  assert.equal(input.disabled, false);
  assert.equal(input.readOnly, false);
  assert.equal(label.htmlFor, input.id);

  app.unmount();
  host.remove();
});

test('token and toggle controls inherit metadata without naming their focus inputs', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'skills', name: ['profile', 'skills'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Skills' }),
            h(TagsInputRoot, { defaultValue: ['TypeScript', 'Accessibility'] }, {
              default: () => h(TagsInputInput),
            }),
          ],
        }),
        h(FormField, { id: 'verification', name: ['security', 'code'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Verification code' }),
            h(PinInputRoot, { length: 4, defaultValue: '7291' }, {
              default: () => Array.from({ length: 4 }, (_, index) => h(PinInputInput, { index })),
            }),
          ],
        }),
        h(FormField, { id: 'formatting', name: ['editor', 'formats'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Formatting' }),
            h(ToggleGroupRoot, {
              items: ['bold', 'italic'],
              multiple: true,
              defaultValue: ['bold', 'italic'],
            }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const tagsRoot = host.querySelector('[data-scope="tags-input"]');
  const tagsDraft = host.querySelector('[data-scope="tags-input"][data-part="input"]');
  const pinRoot = host.querySelector('[data-scope="pin-input"]');
  const pinDigits = [...host.querySelectorAll('[data-scope="pin-input"][data-part="input"]')];
  assert.ok(tagsRoot instanceof HTMLElement);
  assert.ok(tagsDraft instanceof HTMLInputElement);
  assert.ok(pinRoot instanceof HTMLElement);
  assert.equal(tagsRoot.getAttribute('aria-labelledby'), 'skills-label');
  assert.equal(tagsDraft.name, '');
  assert.equal(pinRoot.getAttribute('aria-required'), 'true');
  assert.equal(pinDigits.every((input) => input instanceof HTMLInputElement && input.name === ''), true);
  assert.deepEqual(
    [...host.querySelectorAll('input[type="hidden"]')].map((input) => [input.name, input.value]),
    [
      ['profile.skills', 'TypeScript'],
      ['profile.skills', 'Accessibility'],
      ['security.code', '7291'],
      ['editor.formats', 'bold'],
      ['editor.formats', 'italic'],
    ],
  );

  app.unmount();
  host.remove();
});

test('numeric and editable controls register the actual native input', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'quantity', name: ['order', 'quantity'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Quantity' }),
            h(SpinButtonRoot, { min: 1, max: 20, defaultValue: 4 }, {
              default: () => h(SpinButtonInput),
            }),
          ],
        }),
        h(FormField, { id: 'title', name: ['release', 'title'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Release title' }),
            h(EditableRoot, { defaultValue: 'Version 0.3' }, {
              default: () => [
                h(EditablePreview),
                h(EditableInput),
              ],
            }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const quantity = host.querySelector('[data-scope="spin-button"][data-part="input"]');
  const title = host.querySelector('[data-scope="editable"][data-part="input"]');
  assert.ok(quantity instanceof HTMLInputElement);
  assert.ok(title instanceof HTMLInputElement);
  assert.equal(quantity.id, 'quantity-control');
  assert.equal(quantity.name, 'order.quantity');
  assert.equal(quantity.required, true);
  assert.equal(title.id, 'title-control');
  assert.equal(title.name, 'release.title');
  assert.equal(title.required, true);

  app.unmount();
  host.remove();
});

test('compound range fields inherit one FormField path and submit named endpoints', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, { id: 'schedule-form' }, {
      default: () => [
        h(FormField, { id: 'dates', name: ['availability', 'dates'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Available dates' }),
            h(DateRangeFieldRoot, {
              defaultValue: {
                start: { year: 2026, month: 8, day: 22 },
                end: { year: 2026, month: 8, day: 25 },
              },
            }, {
              default: () => [h(DateRangeFieldStartInput), h(DateRangeFieldEndInput)],
            }),
          ],
        }),
        h(FormField, { id: 'hours', name: ['availability', 'hours'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Available hours' }),
            h(TimeRangeFieldRoot, {
              defaultValue: {
                start: { hour: 9, minute: 30, second: 0, millisecond: 0 },
                end: { hour: 17, minute: 30, second: 0, millisecond: 0 },
              },
            }, {
              default: () => [h(TimeRangeFieldStartInput), h(TimeRangeFieldEndInput)],
            }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const dateGroup = host.querySelector('[data-scope="date-range-field"][data-part="root"]');
  const timeGroup = host.querySelector('[data-scope="time-range-field"][data-part="root"]');
  const dateInputs = [...host.querySelectorAll('[data-scope="date-range-field"] input')];
  const timeInputs = [...host.querySelectorAll('[data-scope="time-range-field"] input')];
  assert.ok(dateGroup instanceof HTMLElement);
  assert.ok(timeGroup instanceof HTMLElement);
  assert.equal(dateGroup.getAttribute('aria-labelledby'), 'dates-label');
  assert.equal(timeGroup.getAttribute('aria-labelledby'), 'hours-label');
  assert.deepEqual(dateInputs.map((input) => input.name), [
    'availability.dates.start',
    'availability.dates.end',
  ]);
  assert.deepEqual(timeInputs.map((input) => input.name), [
    'availability.hours.start',
    'availability.hours.end',
  ]);
  assert.equal(dateInputs.every((input) => input.form?.id === 'schedule-form'), true);
  assert.equal(timeInputs.every((input) => input.form?.id === 'schedule-form'), true);
  assert.equal(dateInputs.every((input) => input.required), true);
  assert.equal(timeInputs.every((input) => input.required), true);

  app.unmount();
  host.remove();
});

test('compound picker inputs inherit endpoint paths without duplicating the field name', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'booking-dates',
        name: ['booking', 'dates'],
        required: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Booking dates' }),
          h(DateRangePickerRoot, {
            defaultOpen: true,
            defaultValue: {
              start: { year: 2026, month: 8, day: 22 },
              end: { year: 2026, month: 8, day: 25 },
            },
          }, {
            default: () => [
              h(DateRangePickerTrigger, null, { default: () => 'Choose dates' }),
              h(DateRangePickerStartInput),
              h(DateRangePickerEndInput),
              h(DateRangePickerContent),
            ],
          }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const content = host.querySelector('[data-scope="date-range"][data-part="content"]');
  const start = host.querySelector('[data-part="start-input"]');
  const end = host.querySelector('[data-part="end-input"]');
  assert.ok(content instanceof HTMLElement);
  assert.ok(start instanceof HTMLInputElement);
  assert.ok(end instanceof HTMLInputElement);
  assert.equal(start.getAttribute('aria-labelledby'), 'booking-dates-label');
  assert.equal(content.getAttribute('aria-labelledby'), 'booking-dates-label');
  assert.equal(start.name, 'booking.dates.start');
  assert.equal(end.name, 'booking.dates.end');
  assert.equal(start.required, true);
  assert.equal(end.required, true);

  app.unmount();
  host.remove();
});

const mountCompoundField = async ({ id, name, label, control }) => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, { id: 'filters-form' }, {
      default: () => h(FormField, { id, name, required: true }, {
        default: () => [
          h(FormLabel, null, { default: () => label }),
          control(),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  return { app, host };
};

for (const controlled of [false, true]) test(`Slider registered reset restores mount baseline without proposals (${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host); const updates = [];
  const options = shallowRef({ defaultValue: 40, ...(controlled ? { modelValue: 40 } : {}) });
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'volume' }, {
    default: () => h(SliderRoot, { ...options.value, 'onUpdate:modelValue': value => updates.push(value) }, { default: () => [h(SliderTrack), h(SliderThumb)] }),
  }) }) });
  const drain = async () => { for (let turn = 0; turn < 4; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const thumb = host.querySelector('[data-part="thumb"]');
    thumb.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await drain();
    assert.equal(updates.at(-1), '41');
    if (controlled) { options.value = { ...options.value, modelValue: 50 }; await drain(); }
    options.value = { ...options.value, defaultValue: 70 }; await drain();
    const count = updates.length; host.querySelector('form').reset(); await drain();
    assert.deepEqual(new FormData(host.querySelector('form')).getAll('volume'), [controlled ? '50' : '40']);
    assert.equal(updates.length, count);
    host.querySelector('form').reset(); app.unmount(); await drain();
    thumb.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await drain(); assert.equal(updates.length, count);
  } finally { if (host.querySelector('[data-part="root"]')) app.unmount(); host.remove(); }
});

test('Slider reconnects live orientation, range and track without retaining retired pointer targets', async () => {
  const host = document.createElement('div'); document.body.append(host); const updates = [], trackKey = shallowRef(0);
  const options = shallowRef({ defaultValue: 40, orientation: 'horizontal', label: 'Before', min: 0, max: 100, step: 1 });
  const app = createApp({ render: () => h(SliderRoot, { ...options.value, 'onUpdate:modelValue': value => updates.push(value) }, {
    default: () => [h(SliderTrack, { key: trackKey.value }), h(SliderThumb)],
  }) });
  const drain = async () => { for (let turn = 0; turn < 4; turn++) await nextTick(); };
  const pointer = (target, x, y) => { const event = new Event('pointerdown', { bubbles: true }); Object.assign(event, { pointerId: 1, clientX: x, clientY: y }); target.dispatchEvent(event); };
  const bounds = { left: 0, top: 0, bottom: 100, width: 100, height: 100 };
  try {
    app.mount(host); await drain(); const oldTrack = host.querySelector('[data-part="track"]'); oldTrack.getBoundingClientRect = () => bounds;
    options.value = { ...options.value, orientation: 'vertical', label: 'After' }; await drain(); pointer(oldTrack, 90, 75); await drain();
    assert.equal(updates.at(-1), '25'); assert.equal(host.querySelector('[data-part="thumb"]').getAttribute('aria-label'), 'After');
    trackKey.value++; await drain(); const track = host.querySelector('[data-part="track"]'); track.getBoundingClientRect = () => bounds;
    pointer(track, 80, 60); await drain(); assert.equal(updates.at(-1), '40'); const count = updates.length;
    pointer(oldTrack, 0, 0); await drain(); assert.equal(updates.length, count);
    options.value = { ...options.value, max: 200, step: 2 }; await drain();
    const thumb = host.querySelector('[data-part="thumb"]'); thumb.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await drain();
    assert.equal(updates.at(-1), '42'); assert.equal(thumb.getAttribute('aria-valuemax'), '200');
    app.unmount(); const finalCount = updates.length; pointer(track, 100, 0); thumb.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await drain(); assert.equal(updates.length, finalCount);
  } finally { if (host.querySelector('[data-part="root"]')) app.unmount(); host.remove(); }
});

test('Slider settles simultaneous controlled range and value updates against the new exact range', async () => {
  const host = document.createElement('div'); document.body.append(host); const updates = [];
  const options = shallowRef({ modelValue: 40, min: 0, max: 100, step: 1 });
  const app = createApp({ render: () => h(SliderRoot, { ...options.value, 'onUpdate:modelValue': value => updates.push(value) }, { default: () => h(SliderThumb) }) });
  try {
    app.mount(host); await nextTick(); options.value = { modelValue: 150, min: 0, max: 200, step: 2 }; await nextTick(); await nextTick();
    const thumb = host.querySelector('[data-part="thumb"]'); assert.equal(thumb.getAttribute('aria-valuenow'), '150'); assert.equal(thumb.getAttribute('aria-valuemax'), '200');
    thumb.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await nextTick();
    assert.deepEqual(updates, ['152']); assert.equal(thumb.getAttribute('aria-valuenow'), '150');
  } finally { app.unmount(); host.remove(); }
});

test('slider submits a scalar value through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'traffic',
    name: ['filters', 'traffic'],
    label: 'Traffic',
    control: () => h(SliderRoot, { defaultValue: 40 }),
  });

  const root = host.querySelector('[data-scope="slider"][data-part="root"]');
  const input = host.querySelector('input[name="filters.traffic"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'traffic-label');
  assert.deepEqual([input?.name, input?.value, input?.form?.id], [
    'filters.traffic', '40', 'filters-form',
  ]);

  app.unmount();
  host.remove();
});

for (const controlled of [false, true]) test(`MultiThumbSlider registered reset restores its mount vector without proposals (${controlled})`, async () => {
  const host = document.createElement('div'); document.body.append(host); const updates = [], thumbs = ['low', 'high'];
  const options = shallowRef({ defaultValue: [20, 80], ...(controlled ? { modelValue: [20, 80] } : {}) }); let state;
  const app = createApp({ render: () => h(FormRoot, {}, { default: () => h(FormField, { name: 'limits' }, {
    default: () => h(MultiThumbSliderRoot, { thumbs, ...options.value, 'onUpdate:modelValue': values => updates.push([...values]) }, {
      default: current => { state = current; return thumbs.map(value => h(MultiThumbSliderThumb, { value })); },
    }),
  }) }) });
  const drain = async () => { for (let turn = 0; turn < 4; turn++) await nextTick(); };
  try {
    app.mount(host); await drain(); const low = host.querySelector('[data-sectile-multi-thumb="low"]');
    low.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await drain();
    assert.deepEqual(updates.at(-1), ['21', '80']);
    if (controlled) { options.value = { ...options.value, modelValue: [30, 70] }; await drain(); }
    options.value = { ...options.value, defaultValue: [40, 60] }; await drain();
    const count = updates.length; host.querySelector('form').reset(); await drain();
    const expected = controlled ? ['30', '70'] : ['20', '80'];
    assert.deepEqual(state.values, expected);
    assert.equal(low.getAttribute('aria-valuenow'), expected[0]);
    assert.deepEqual([...new FormData(host.querySelector('form')).values()], expected);
    assert.equal(updates.length, count);
    const retained = state; host.querySelector('form').reset(); app.unmount(); await drain();
    low.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await drain();
    assert.equal(state, retained); assert.equal(updates.length, count);
  } finally { if (host.querySelector('[data-part="root"]')) app.unmount(); host.remove(); }
});

test('multi-thumb slider submits indexed values through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'price',
    name: ['filters', 'price'],
    label: 'Price range',
    control: () => h(MultiThumbSliderRoot, {
      thumbs: ['minimum', 'maximum'],
      defaultValue: [47, 95],
    }),
  });

  const root = host.querySelector('[data-scope="multi-thumb-slider"][data-part="root"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'price-label');
  assert.equal(root?.getAttribute('aria-required'), 'true');
  assert.deepEqual(
    [...host.querySelectorAll('input[type="hidden"]')].map((input) => [input.name, input.value]),
    [['filters.price[0]', '47'], ['filters.price[1]', '95']],
  );

  app.unmount();
  host.remove();
});

test('calendar submits a scalar value through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'release-date',
    name: ['release', 'date'],
    label: 'Release date',
    control: () => h(CalendarRoot, {
      defaultValue: { year: 2026, month: 8, day: 22 },
      defaultHighlightedValue: { year: 2026, month: 8, day: 22 },
    }, {
      default: () => h(CalendarContent, null, {
        default: () => [h(CalendarInput), h(CalendarGrid)],
      }),
    }),
  });

  const root = host.querySelector('[data-scope="calendar"][data-part="content"]');
  const input = host.querySelector('input[type="hidden"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'release-date-label');
  assert.deepEqual([input?.name, input?.value, input?.form?.id], [
    'release.date', '2026-08-22', 'filters-form',
  ]);

  app.unmount();
  host.remove();
});

test('color picker submits a scalar value through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'accent',
    name: ['theme', 'accent'],
    label: 'Accent color',
    control: () => h(ColorPickerRoot, { defaultValue: '#5b6df6' }),
  });

  const root = host.querySelector('[data-scope="color-picker"][data-part="root"]');
  const input = host.querySelector('input[type="hidden"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'accent-label');
  assert.deepEqual([input?.name, input?.value, input?.form?.id], [
    'theme.accent', '#5b6df6', 'filters-form',
  ]);

  app.unmount();
  host.remove();
});
