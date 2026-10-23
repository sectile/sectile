import assert from 'node:assert/strict';
import test from 'node:test';
import packageManifest from '../package.json' with { type: 'json' };
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
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  FormData: browserWindow.FormData,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MouseEvent: browserWindow.MouseEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { KeepAlive, Teleport, createApp, createSSRApp, defineComponent, h, nextTick, ref, shallowRef } = await import('vue');
const { createPopover } = await import('@sectile/dom/popover');
const { PopoverRoot, PopoverContent, PopoverPortal } = await import('../.verification-dist/overlay/popover.js');
const { DialogRoot, DialogContent, DialogPortal } = await import('../.verification-dist/overlay/dialog.js');
const { renderToString } = await import('@vue/server-renderer');
const { TemporalProvider } = await import('../.verification-dist/temporal/temporal-provider.js');
const { FormRoot, FormField } = await import('../.verification-dist/form.js');
const { CalendarCell, CalendarContent, CalendarGrid, CalendarNextMonth, CalendarRoot } = await import('../.verification-dist/temporal/calendar.js');
const {
  DatePickerCell,
  DatePickerContent,
  DatePickerGrid,
  DatePickerInput,
  DatePickerRoot,
  DatePickerTrigger,
} = await import('../.verification-dist/temporal/date-picker.js');
const {
  DateRangePickerCell,
  DateRangePickerContent,
  DateRangePickerEndInput,
  DateRangePickerGrid,
  DateRangePickerRoot,
  DateRangePickerStartInput,
  DateRangePickerTrigger,
} = await import('../.verification-dist/temporal/date-range-picker.js');
const {
  DateTimePickerCell,
  DateTimePickerContent,
  DateTimePickerDateInput,
  DateTimePickerDateTimeInput,
  DateTimePickerGrid,
  DateTimePickerRoot,
  DateTimePickerTimeInput,
  DateTimePickerTrigger,
} = await import('../.verification-dist/temporal/date-time-picker.js');
const {
  DateTimeRangePickerCell,
  DateTimeRangePickerContent,
  DateTimeRangePickerEndDateInput,
  DateTimeRangePickerEndDateTimeInput,
  DateTimeRangePickerEndTimeInput,
  DateTimeRangePickerGrid,
  DateTimeRangePickerMonthViewTrigger,
  DateTimeRangePickerRoot,
  DateTimeRangePickerStartDateInput,
  DateTimeRangePickerStartDateTimeInput,
  DateTimeRangePickerStartTimeInput,
  DateTimeRangePickerTrigger,
} = await import('../.verification-dist/temporal/date-time-range-picker.js');
const {
  MonthPickerCell,
  MonthPickerContent,
  MonthPickerGrid,
  MonthPickerInput,
  MonthPickerRoot,
  MonthPickerTrigger,
} = await import('../.verification-dist/temporal/month-picker.js');
const {
  YearPickerCell,
  YearPickerContent,
  YearPickerGrid,
  YearPickerInput,
  YearPickerRoot,
  YearPickerTrigger,
} = await import('../.verification-dist/temporal/year-picker.js');

const start = Object.freeze({
  date: Object.freeze({ year: 2026, month: 8, day: 18 }),
  time: Object.freeze({ hour: 9, minute: 30 }),
});
const end = Object.freeze({
  date: Object.freeze({ year: 2026, month: 8, day: 21 }),
  time: Object.freeze({ hour: 17, minute: 30 }),
});

test('range picker families retain their first endpoint through live and inactive configuration replacement', async () => {
  const { HostProvider } = await import('../.verification-dist/host-provider.js');
  for (const [file, prefix] of [['date-range-picker', 'DateRangePicker'], ['range-calendar', 'RangeCalendar'],
    ['month-range-picker', 'MonthRangePicker'], ['year-range-picker', 'YearRangePicker'], ['date-time-range-picker', 'DateTimeRangePicker']]) {
    const parts = await import(`../.verification-dist/temporal/${file}.js`);
    const Root = parts[`${prefix}Root`], Content = parts[`${prefix}Content`], Grid = parts[`${prefix}Grid`], Cell = parts[`${prefix}Cell`], Trigger = parts[`${prefix}Trigger`];
    const host = document.createElement('div'); document.body.append(host);
    const active = shallowRef(true), label = shallowRef('Range'); let state;
    const first = { year: 2026, month: file === 'month-range-picker' ? 10 : 8, day: 1 }, second = { year: 2027, month: 9, day: 1 };
    const app = createApp({ render: () => h(HostProvider, { active }, { default: () => h(Root,
      { defaultHighlightedValue: first, defaultOpen: true, position: false, label: label.value },
      { default: next => { state = next; return [Trigger ? h(Trigger) : null,
        h(Content, {}, { default: () => h(Grid, {}, { default: () => [h(Cell, { value: first }), h(Cell, { value: second }),
          file === 'month-range-picker' ? h(Cell, { value: { year: 2026, month: 9, day: 1 }, 'data-prior-month': '' }) : null] }) })]; } }) }) });
    app.mount(host);
    try {
      await settle(); host.querySelectorAll('[data-part=cell]')[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); await settle();
      assert.equal(host.querySelector('[data-part=cell]').getAttribute('data-selected'), '', prefix);
      assert.equal(host.querySelector('[data-part=cell]').getAttribute('aria-selected'), 'true', prefix);
      assert.equal(state.value, null, prefix); label.value = 'Live replacement'; await settle();
      active.value = false; await settle(); label.value = 'Inactive replacement'; await settle(); active.value = true; await settle();
      assert.equal(host.querySelector('[data-part=cell]').getAttribute('data-selected'), '', prefix);
      host.querySelectorAll('[data-part=cell]')[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); await settle();
      assert.notEqual(state.value, null, prefix);
      if (file === 'month-range-picker') assert.equal(host.querySelector('[data-prior-month]').hasAttribute('data-in-range'), false);
      const start = state.value.start.date ?? state.value.start, end = state.value.end.date ?? state.value.end;
      assert.equal(start.year, 2026, prefix); assert.equal(end.year, 2027, prefix);
    } finally { app.unmount(); host.remove(); }
  }
});

async function settle() {
  await nextTick();
  await nextTick();
}

test('required composite pickers validate without changing native submitted values or persistent associations', async () => {
  const date = { year: 2026, month: 10, day: 14 };
  for (const [file, prefix, range, time, inline] of [
    ['calendar', 'Calendar', false, false, true], ['range-calendar', 'RangeCalendar', true, false, true],
    ['month-picker', 'MonthPicker', false, false, false], ['year-picker', 'YearPicker', false, false, false],
    ['date-range-picker', 'DateRangePicker', true, false, false], ['month-range-picker', 'MonthRangePicker', true, false, false],
    ['year-range-picker', 'YearRangePicker', true, false, false], ['date-time-range-picker', 'DateTimeRangePicker', true, true, false],
  ]) {
    const parts = await import(`../.verification-dist/temporal/${file}.js`);
    const host = document.createElement('div'); document.body.append(host);
    const value = shallowRef(null), disabled = shallowRef(false), readonly = shallowRef(false);
    const external = shallowRef(undefined);
    const fields = range ? [time ? 'StartDateTimeInput' : 'StartInput', time ? 'EndDateTimeInput' : 'EndInput'] : ['Input'];
    const app = createApp({ render: () => [h('form', { id: 'schedule-external' }), h(FormRoot, {}, {
      default: () => h(FormField, { name: 'delivery', required: true }, { default: () => h(parts[prefix + 'Root'], {
        modelValue: value.value, disabled: disabled.value, readonly: readonly.value, referenceDate: date, position: false,
      }, { default: () => [
        ...fields.map(part => h(parts[prefix + part], { form: external.value })),
        !inline ? h(parts[prefix + 'Anchor'], {}, { default: () => h(parts[prefix + 'Trigger']) }) : null,
        h(parts[prefix + 'Content'], {}, { default: () => h(parts[prefix + 'Grid']) }),
      ] }) }),
    })] });
    app.mount(host);
    try {
      await settle();
      const constraint = host.querySelector('select'), input = host.querySelector('input');
      const form = host.querySelectorAll('form')[1];
      const field = host.querySelector('[data-scope="form"][data-part="field"]');
      assert.equal(field.hasAttribute('data-dirty'), false, prefix);
      assert.equal(constraint.name, '', prefix);
      assert.equal(constraint.form === form, true, prefix);
      assert.equal(constraint.required, true, prefix);
      assert.equal(constraint.validity.valueMissing, true, prefix);
      assert.equal(constraint.willValidate, true, prefix);
      assert.equal(form.checkValidity(), false, prefix);
      await settle(); assert.equal(field.hasAttribute('data-invalid'), true, prefix);
      const semantic = host.querySelector('[aria-labelledby]');
      assert.ok(semantic, prefix);
      assert.equal(semantic.hidden, false, prefix);
      const empty = [...new browserWindow.FormData(form).entries()];
      assert.equal(empty.length, range ? 2 : 1, prefix);
      assert.ok(empty.every(([name, value]) => name.startsWith('delivery') && value === ''), prefix);
      readonly.value = true; await settle();
      assert.equal(constraint.willValidate, false, prefix);
      readonly.value = false; disabled.value = true; await settle();
      assert.equal(constraint.willValidate, false, prefix);
      disabled.value = false;
      const scalar = time ? { date, time: { hour: 9, minute: 30 } } : date;
      value.value = range ? { start: scalar, end: scalar } : scalar; await settle();
      assert.equal(field.hasAttribute('data-dirty'), true, prefix);
      assert.equal(field.hasAttribute('data-invalid'), false, prefix);
      assert.equal(form.checkValidity(), true, prefix);
      assert.equal([...new browserWindow.FormData(form).entries()].length, range ? 2 : 1, prefix);
      assert.equal(constraint.hasAttribute('name'), false, prefix);
      value.value = null; await settle();
      assert.equal(field.hasAttribute('data-dirty'), false, prefix);
      assert.equal(form.checkValidity(), false, prefix);
      external.value = 'schedule-external'; await settle();
      // Happy DOM prioritizes its cached ancestor form over an explicit form id;
      // actual external native association is covered by the browser specimen.
      assert.equal(constraint.getAttribute('form'), 'schedule-external', prefix);
      assert.equal(input.getAttribute('form'), 'schedule-external', prefix);
      external.value = undefined; await settle();
      assert.equal(constraint.form === host.querySelectorAll('form')[1], true, prefix);
      assert.ok(input.isConnected, prefix);
    } finally { app.unmount(); host.remove(); }
    assert.equal(document.querySelector('#schedule-external'), null, prefix);
  }
});

test('portaled range selection updates Form metadata only when the controlled value is accepted', async () => {
  const parts = await import('../.verification-dist/temporal/month-range-picker.js');
  const host = document.createElement('div'), portal = document.createElement('div'); document.body.append(host, portal);
  const value = shallowRef(null); let accept = false;
  const app = createApp({ render: () => h(FormRoot, {}, {
    default: () => h(FormField, { name: 'delivery', required: true }, { default: () => h(parts.MonthRangePickerRoot, {
      modelValue: value.value, defaultOpen: true, position: false, referenceDate: { year: 2026, month: 10, day: 14 },
      'onUpdate:modelValue': next => { if (accept) value.value = next; },
    }, { default: () => [h(parts.MonthRangePickerStartInput), h(parts.MonthRangePickerEndInput),
      h(parts.MonthRangePickerAnchor, {}, { default: () => h(parts.MonthRangePickerTrigger) }),
      h(Teleport, { to: portal }, [h(parts.MonthRangePickerContent, {}, {
        default: () => h(parts.MonthRangePickerGrid, {}, { default: () => [10, 11].map(month => h(parts.MonthRangePickerCell,
          { value: { year: 2026, month }, 'data-month': String(month) })) }),
      })]),
    ] }) }),
  }) });
  app.mount(host);
  try {
    await settle(); const form = host.querySelector('form'), field = host.querySelector('[data-part="field"]');
    assert.equal(form.checkValidity(), false); await settle();
    assert.equal(field.hasAttribute('data-invalid'), true);
    const select = async () => { for (const month of [10, 11]) { portal.querySelector(`[data-month="${month}"]`).click(); await settle(); } };
    await select();
    assert.equal(field.hasAttribute('data-dirty'), false);
    assert.equal(field.hasAttribute('data-invalid'), true);
    assert.deepEqual([...new browserWindow.FormData(form).values()], ['', '']);
    accept = true; await select();
    assert.equal(field.hasAttribute('data-dirty'), true);
    assert.equal(field.hasAttribute('data-invalid'), false);
    assert.deepEqual([...new browserWindow.FormData(form).entries()], [['delivery.start', '2026-10'], ['delivery.end', '2026-11']]);
  } finally { app.unmount(); host.remove(); portal.remove(); }
});

for (const range of [false, true]) test(`date-time ${range ? 'range' : 'scalar'} picker applies request formats without losing precision, drafts or Form reset`, async () => {
  const file = range ? 'date-time-range-picker' : 'date-time-picker', prefix = range ? 'DateTimeRangePicker' : 'DateTimePicker';
  const parts = await import(`../.verification-dist/temporal/${file}.js`);
  const date = { year: 2026, month: 10, day: 14 }, time = { hour: 15, minute: 24, second: 38, millisecond: 125 }, value = { date, time };
  const endValue = { date: { ...date, day: 16 }, time };
  const initial = range ? { start: value, end: endValue } : value, proposals = [];
  const formatting = shallowRef({ locale: 'en-GB', timeZone: 'UTC' }); let form;
  const inputs = range ? ['StartDateTimeInput', 'EndDateTimeInput', 'StartDateInput', 'EndDateInput', 'StartTimeInput', 'EndTimeInput'] : ['DateTimeInput', 'DateInput', 'TimeInput'];
  let inputParts = inputs;
  const Wrapper = { render: () => h(TemporalProvider, { formatting: formatting.value, referenceDate: date }, {
    default: () => h(FormRoot, { ref: value => { if (value) form = value; } }, {
      default: () => h(FormField, { name: 'delivery' }, { default: () => h(parts[prefix + 'Root'], {
        defaultValue: initial, defaultOpen: true, position: false, 'onUpdate:modelValue': value => proposals.push(value),
      }, { default: () => [
        ...inputParts.map(part => h(parts[prefix + part])), h(parts[prefix + 'Trigger']),
        h(parts[prefix + 'Content'], {}, { default: () => h(parts[prefix + 'Grid']) }),
      ] }) }),
    }),
  }) };
  const expected = range ? ['2026-10-14T15:24:38.125', '2026-10-16T15:24:38.125', '14/10/2026', '16/10/2026', '15:24:38.125', '15:24:38.125']
    : ['14/10/2026, 15:24:38.125', '14/10/2026', '15:24:38.125'];
  const html = await renderToString(createSSRApp(Wrapper));
  const initialNames = range ? ['delivery.end', 'delivery.start'] : ['delivery'];
  const parseNames = markup => {
    const element = document.createElement('div'); element.innerHTML = markup;
    return [...new FormData(element.querySelector('form')).keys()].sort();
  };
  assert.deepEqual(parseNames(html), initialNames);
  inputParts = [...inputs].reverse();
  assert.deepEqual(parseNames(await renderToString(createSSRApp(Wrapper))), initialNames);
  inputParts = inputs.filter(part => !part.includes('DateTimeInput'));
  assert.deepEqual(parseNames(await renderToString(createSSRApp(Wrapper))), range
    ? ['delivery.end.date', 'delivery.end.time', 'delivery.start.date', 'delivery.start.time']
    : ['delivery.date', 'delivery.time']);
  inputParts = inputs;
  assert.deepEqual([...html.matchAll(/<input[^>]*value="([^"]*)"/g)].map(match => match[1]), expected);
  const host = document.createElement('div'); document.body.append(host); const app = createApp(Wrapper);
  try {
    app.mount(host); await settle();
    assert.deepEqual([...host.querySelectorAll('input')].map(input => input.value), expected);
    const input = host.querySelector(`[data-part="${range ? 'start-time-input' : 'time-input'}"]`);
    input.focus(); input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
    input.value = '15:'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }));
    formatting.value = { locale: 'en-US', timeZone: 'UTC' }; await settle();
    assert.equal(input.value, '15:'); assert.deepEqual(proposals, []);
    input.dispatchEvent(new Event('compositionend', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); input.blur();
    await new Promise(resolve => setTimeout(resolve, 0)); await settle();
    assert.match(input.value, /^03:24:38\.125.*PM$/u);
    formatting.value = undefined; await settle();
    assert.equal(input.value, '15:24:38.125');
    formatting.value = { locale: 'en-GB', timeZone: 'UTC' }; await settle();
    input.value = '16:25:39.126'; input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await settle();
    const updated = { date, time: { hour: 16, minute: 25, second: 39, millisecond: 126 } };
    assert.deepEqual(proposals.at(-1), range ? { start: updated, end: endValue } : updated);
    if (range) assert.deepEqual([...new browserWindow.FormData(host.querySelector('form')).entries()], [['delivery.start', '2026-10-14T16:25:39.126'], ['delivery.end', '2026-10-16T15:24:38.125']]);
    const count = proposals.length; form.reset(); await settle();
    assert.equal(input.value, '15:24:38.125'); assert.equal(proposals.length, count);
  } finally { app.unmount(); host.remove(); }
});

test('empty date-time picker time inputs use canonical initial times in SSR and after mounting', async () => {
  const referenceDate = { year: 2026, month: 10, day: 14 };
  for (const [Root, Trigger, Content, Grid, inputs, policies, expected] of [
    [DateTimePickerRoot, DateTimePickerTrigger, DateTimePickerContent, DateTimePickerGrid, [DateTimePickerTimeInput], undefined, ['00:00']],
    [DateTimePickerRoot, DateTimePickerTrigger, DateTimePickerContent, DateTimePickerGrid, [DateTimePickerTimeInput], { defaultTime: { hour: 9, minute: 45, second: 0, millisecond: 7 } }, ['09:45:00.007']],
    [DateTimeRangePickerRoot, DateTimeRangePickerTrigger, DateTimeRangePickerContent, DateTimeRangePickerGrid,
      [DateTimeRangePickerStartTimeInput, DateTimeRangePickerEndTimeInput], undefined, ['00:00', '00:00']],
  ]) {
    const proposals = [];
    const Wrapper = { render: () => h(Root, { referenceDate, label: 'Date and time', defaultOpen: true, position: false, policies,
      'onUpdate:modelValue': value => proposals.push(value) }, { default: () => [
      h(Trigger, {}, { default: () => 'Choose' }), ...inputs.map((Input, index) => h(Input, { 'aria-label': 'Time ' + index })),
      h(Content, {}, { default: () => h(Grid) }),
    ] }) };
    const html = await renderToString(createSSRApp(Wrapper));
    assert.deepEqual([...html.matchAll(/<input\b[^>]*\bvalue="([^"]*)"[^>]*>/g)].map(match => match[1]), expected);
    const host = document.createElement('div'); document.body.append(host); const app = createApp(Wrapper);
    try {
      app.mount(host); await settle(); await settle();
      assert.deepEqual([...host.querySelectorAll('input')].map(input => input.value), expected);
      assert.deepEqual(proposals, []);
    } finally { app.unmount(); host.remove(); }
  }
});

test('picker initial view data agrees with the mounted owner projection', async () => {
  const seed = { year: 2026, month: 10, day: 14 };
  for (const [file, prefix, wrapped] of [
    ['calendar', 'Calendar', false], ['range-calendar', 'RangeCalendar', false], ['date-picker', 'DatePicker', false], ['date-range-picker', 'DateRangePicker', false],
    ['date-time-picker', 'DateTimePicker', true], ['date-time-range-picker', 'DateTimeRangePicker', true],
    ['month-picker', 'MonthPicker', false], ['month-range-picker', 'MonthRangePicker', false], ['year-picker', 'YearPicker', false], ['year-range-picker', 'YearRangePicker', false],
  ]) for (const weekStartsOn of [1, 7]) for (const view of ['week', 'month', 'year']) {
    const parts = await import(`../.verification-dist/temporal/${file}.js`);
    const host = document.createElement('div'); document.body.append(host);
    let first, latest;
    const calendar = { weekStartsOn };
    const app = createApp({ render: () => h(parts[prefix + 'Root'], {
      referenceDate: seed, defaultHighlightedValue: seed, defaultView: view, defaultOpen: true, position: false,
      policies: wrapped ? { date: calendar } : calendar,
    }, { default: state => {
      latest = { view: state.viewMode, dates: state.dates, months: state.months };
      first ??= latest;
      return [parts[prefix + 'Trigger'] ? h(parts[prefix + 'Trigger']) : null,
        h(parts[prefix + 'Content'], {}, { default: () => h(parts[prefix + 'Grid']) })];
    } }) });
    app.mount(host);
    try {
      await settle();
      assert.deepEqual(latest, first, `${prefix}:${view}:${weekStartsOn}`);
      assert.equal(first.dates.flat().length, view === 'week' ? 7 : view === 'month' ? 42 : 0);
      assert.equal(first.months.flat().length, view === 'year' ? 12 : 0);
    } finally { app.unmount(); host.remove(); }
  }
});

test('all popup picker families restore initial Form serialization after selection and reset', async () => {
  const date = { year: 2026, month: 10, day: 14 }, time = { hour: 9, minute: 30, second: 0, millisecond: 0 };
  for (const [file, prefix, granularity, range, withTime] of [
    ['date-picker', 'DatePicker', 'day', false, false], ['date-range-picker', 'DateRangePicker', 'day', true, false],
    ['date-time-picker', 'DateTimePicker', 'day', false, true], ['date-time-range-picker', 'DateTimeRangePicker', 'day', true, true],
    ['month-picker', 'MonthPicker', 'month', false, false], ['month-range-picker', 'MonthRangePicker', 'month', true, false],
    ['year-picker', 'YearPicker', 'year', false, false], ['year-range-picker', 'YearRangePicker', 'year', true, false],
  ]) {
    const parts = await import(`../.verification-dist/temporal/${file}.js`);
    const value = withTime ? { date, time } : date, initial = range ? { start: value, end: value } : value;
    const inputParts = range ? [withTime ? 'StartDateTimeInput' : 'StartInput', withTime ? 'EndDateTimeInput' : 'EndInput']
      : [withTime ? 'DateTimeInput' : 'Input'];
    const expectedValue = granularity === 'year' ? '2026' : granularity === 'month' ? '2026-10' : withTime ? '2026-10-14T09:30' : '2026-10-14';
    const expected = range ? [['delivery.start', expectedValue], ['delivery.end', expectedValue]] : [['delivery', expectedValue]];
    const candidates = granularity === 'year' ? [{ year: 2027 }, { year: 2028 }]
      : granularity === 'month' ? [{ year: 2026, month: 11 }, { year: 2026, month: 12 }]
        : [{ year: 2026, month: 10, day: 15 }, { year: 2026, month: 10, day: 16 }];
    const host = document.createElement('div'); document.body.append(host);
    const proposals = []; let form;
    const app = createApp({ render: () => h(FormRoot, { ref: value => { if (value) form = value; } }, {
      default: () => h(FormField, { name: 'delivery' }, { default: () => h(parts[`${prefix}Root`], {
        defaultValue: initial, referenceDate: date, defaultOpen: true, position: false, 'onUpdate:modelValue': value => proposals.push(value),
      }, { default: () => [
        ...inputParts.map(part => h(parts[prefix + part])), h(parts[`${prefix}Trigger`]),
        h(parts[`${prefix}Content`], {}, { default: () => h(parts[`${prefix}Grid`], {}, {
          default: () => candidates.map((value, index) => h(parts[`${prefix}Cell`], { value, 'data-candidate': String(index) })),
        }) }),
      ] }) }),
    }) });
    app.mount(host);
    try {
      await settle();
      const read = () => [...new browserWindow.FormData(host.querySelector('form')).entries()];
      const field = host.querySelector('[data-scope="form"][data-part="field"]');
      assert.deepEqual(read(), expected, prefix);
      assert.equal(field.hasAttribute('data-dirty'), false, prefix);
      host.querySelector('[data-candidate="0"]').click(); await settle();
      if (range) {
        assert.equal(host.querySelector('[data-candidate="0"]').getAttribute('data-selected'), '', prefix);
        form.reset(); await settle();
        assert.equal(host.querySelector('[data-candidate="0"]').hasAttribute('data-selected'), false, prefix);
        assert.deepEqual(read(), expected, prefix);
        host.querySelector('[data-candidate="0"]').click(); await settle();
        host.querySelector('[data-candidate="1"]').click(); await settle();
      }
      assert.notDeepEqual(read(), expected, prefix);
      assert.equal(field.hasAttribute('data-dirty'), true, prefix);
      const count = proposals.length;
      for (let index = 0; index < 20; index++) form.reset();
      await settle();
      assert.deepEqual(read(), expected, prefix);
      assert.equal(field.hasAttribute('data-dirty'), false, prefix);
      assert.equal(proposals.length, count, prefix);
    } finally { app.unmount(); host.remove(); }
  }
});

test('day month and year current markers follow reactive provider and local reference dates', async () => {
  for (const [Root, Cell, attribute, dates, values, expected] of [
    [DatePickerRoot, DatePickerCell, 'date', [{ year: 2026, month: 10, day: 14 }, { year: 2026, month: 10, day: 15 }, { year: 2026, month: 11, day: 14 }],
      [{ year: 2026, month: 10, day: 14 }, { year: 2026, month: 10, day: 15 }, { year: 2026, month: 11, day: 14 }], ['2026-10-14', '2026-10-15', '2026-11-14']],
    [MonthPickerRoot, MonthPickerCell, 'month', [{ year: 2026, month: 10, day: 14 }, { year: 2026, month: 11, day: 14 }, { year: 2027, month: 10, day: 14 }],
      [{ year: 2026, month: 10 }, { year: 2026, month: 11 }, { year: 2027, month: 10 }], ['2026-10', '2026-11', '2027-10']],
    [YearPickerRoot, YearPickerCell, 'year', [{ year: 1999, month: 12, day: 31 }, { year: 2000, month: 1, day: 1 }, { year: 2001, month: 1, day: 1 }],
      [{ year: 1999 }, { year: 2000 }, { year: 2001 }], ['1999', '2000', '2001']],
  ]) {
    const host = document.createElement('div'); document.body.append(host);
    const referenceDate = shallowRef(dates[0]);
    const localReference = shallowRef(undefined);
    const app = createApp({ render: () => h(TemporalProvider, { referenceDate: referenceDate.value }, {
      default: () => h(Root, { referenceDate: localReference.value }, {
        default: () => values.map(value => h(Cell, { value })),
      }),
    }) });
    app.mount(host);
    const current = () => {
      const cells = host.querySelectorAll('[aria-current="date"]'); assert.equal(cells.length, 1);
      return cells[0].getAttribute('data-sectile-picker-' + attribute);
    };
    try {
      await settle(); assert.equal(current(), expected[0]);
      referenceDate.value = dates[1];
      await settle(); assert.equal(current(), expected[1]);
      localReference.value = dates[2];
      await settle(); assert.equal(current(), expected[2]);
      referenceDate.value = dates[0];
      await settle(); assert.equal(current(), expected[2]);
      localReference.value = undefined;
      await settle(); assert.equal(current(), expected[0]);
    } finally { app.unmount(); host.remove(); }
  }
});

test('all picker capabilities suspend cached Portal presentation and retain children and accepted models', async () => {
  for (const [file, prefix] of [
    ['calendar', 'Calendar'], ['range-calendar', 'RangeCalendar'], ['date-picker', 'DatePicker'],
    ['date-range-picker', 'DateRangePicker'], ['month-picker', 'MonthPicker'], ['month-range-picker', 'MonthRangePicker'],
    ['year-picker', 'YearPicker'], ['year-range-picker', 'YearRangePicker'],
    ['date-time-picker', 'DateTimePicker'], ['date-time-range-picker', 'DateTimeRangePicker'],
  ]) {
    const parts = await import(`../.verification-dist/temporal/${file}.js`);
    const Root = parts[`${prefix}Root`], Content = parts[`${prefix}Content`], Grid = parts[`${prefix}Grid`], Trigger = parts[`${prefix}Trigger`];
    const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
    const shown = shallowRef(true), highlighted = shallowRef({ year: 2026, month: 8, day: 18 });
    const civil = { year: 2026, month: 8, day: 18 }, timed = { date: civil, time: { hour: 9, minute: 30 } };
    const value = shallowRef(file.includes('date-time') ? file.includes('range') ? { start: timed, end: timed } : timed
      : file.includes('range') ? { start: civil, end: civil } : civil);
    const requests = []; let state, contentState, constructed = 0;
    const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
    const Child = defineComponent({ setup() { constructed++; return () => h('input', { 'data-retained-picker': '' }); } });
    const Cached = defineComponent({ setup: () => () => h(Root, { modelValue: value.value, highlightedValue: highlighted.value,
      defaultOpen: true, position: false, 'onUpdate:open': next => requests.push(next),
    }, { default: next => { state = next; return [Trigger ? h(Trigger, {}, { default: () => 'Choose' }) : null,
      h(Teleport, { to: target }, [h(Content, {}, { default: next => { contentState = next; return [h(Grid), h(Child),
        h(PopoverRoot, { defaultOpen: true, position: false, autoFocus: false }, { default: () => h(PopoverPortal,
          { to: target }, { default: () => h(PopoverContent, { 'data-picker-nested': '' }) }) }),
      ]; } })])]; } }) });
    const Empty = defineComponent({ render: () => null });
    const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
    const assertOrder = expected => {
      const root = document.createElement('div'); document.body.append(root);
      const witness = createPopover({ root, defaultOpen: true, position: false, autoFocus: false });
      try { assert.equal(witness.getLayerOrder(), expected, prefix); } finally { witness.disconnect(); root.remove(); }
    };
    app.mount(host);
    try {
      await drain(); const panel = target.querySelector('[data-part=content]:not([data-picker-nested])');
      const nested = target.querySelector('[data-picker-nested]'), retained = panel.querySelector('[data-retained-picker]');
      const grid = panel.querySelector('[data-part=grid]'); retained.value = 'Retained';
      assertOrder(file === 'calendar' ? 1 : 2);
      assert.equal(Object.isFrozen(contentState), true);
      assert.deepEqual(contentState.value, state.value);
      if (file === 'calendar') assert.equal(contentState.presentation, undefined);
      else { assert.equal(contentState.presentation.phase, 'active'); assert.equal(Object.isFrozen(contentState.presentation), true); }
      for (let cycle = 0; cycle < 3; cycle++) {
        shown.value = false; await drain(); assert.equal(panel.hidden, true, prefix); assert.equal(panel.inert, true);
        assert.equal(nested.hidden, true); assertOrder(0);
        assert.ok(contentState.presentation === undefined || contentState.presentation.phase === 'closed', prefix);
        const before = state.highlightedValue;
        grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        await drain(); assert.deepEqual(state.highlightedValue, before);
        highlighted.value = { year: 2026, month: 8, day: 19 + cycle }; await drain(); assertOrder(0);
        shown.value = true; await drain(); assert.equal(panel.hidden, false, prefix); assert.equal(panel.inert, false);
        assert.equal(nested.hidden, false); assertOrder(file === 'calendar' ? 1 : 2);
        if (file !== 'calendar') assert.equal(contentState.presentation.phase, 'active');
        assert.deepEqual(state.value, value.value); assert.deepEqual(state.highlightedValue, highlighted.value);
        assert.equal(panel.querySelector('[data-retained-picker]'), retained); assert.equal(retained.value, 'Retained'); assert.equal(constructed, 1);
        assert.deepEqual(requests, []);
      }
      shown.value = false; await drain(); app.unmount(); assertOrder(0);
    } finally { app.unmount(); host.remove(); target.remove(); }
  }
});

test('picker Portal borrows its dialog ancestor and quarantines controlled dismissal refusal', async () => {
  const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
  const parentOpen = shallowRef(false), requests = [];
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const app = createApp({ render: () => h(DialogRoot, { open: parentOpen.value, autoFocus: false }, {
    default: () => h(DialogPortal, { to: target }, { default: () => h(DialogContent, {}, {
      default: () => h(DatePickerRoot, { open: true, position: false, 'onUpdate:open': next => requests.push(next) }, {
        default: () => [h(DatePickerTrigger), h(Teleport, { to: target }, [h(DatePickerContent, {}, { default: () => h(DatePickerGrid) })])],
      }),
    }) }),
  }) });
  app.mount(host);
  try {
    await drain(); const panel = target.querySelector('[data-scope=date][data-part=content]'); assert.equal(panel.hidden, true);
    parentOpen.value = true; await drain(); assert.equal(panel.hidden, false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await drain(); assert.deepEqual(requests, [false]); assert.equal(panel.hidden, false);
    parentOpen.value = false; await drain(); assert.deepEqual(requests, [false, false]); assert.equal(panel.hidden, true); assert.equal(panel.inert, true);
    parentOpen.value = true; await drain(); assert.equal(panel.hidden, false);
  } finally { app.unmount(); host.remove(); target.remove(); }
});

test('cached date picker reconstructs its recorded IME draft after inactive configuration changes', async () => {
  const host = document.createElement('div'); document.body.append(host); const shown = shallowRef(true), label = shallowRef('Date');
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const Cached = defineComponent({ render: () => h(DatePickerRoot, { position: false, label: label.value }, { default: () => [
    h(DatePickerInput), h(DatePickerTrigger), h(DatePickerContent, {}, { default: () => h(DatePickerGrid) }),
  ] }) });
  const Empty = defineComponent({ render: () => null });
  const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
  app.mount(host);
  try {
    await drain(); const input = host.querySelector('input'); input.focus();
    input.dispatchEvent(new browserWindow.CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '2026-08-'; input.setSelectionRange(8, 8);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' }));
    shown.value = false; await drain(); label.value = 'Updated date'; await drain(); input.value = 'unobserved';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    shown.value = true; await drain(); assert.equal(host.querySelector('input'), input); assert.equal(input.value, '2026-08-');
    assert.equal(input.selectionStart, 8); assert.equal(input.getAttribute('aria-label'), 'Updated date');
  } finally { app.unmount(); host.remove(); }
});

test('compound picker fields preserve recorded drafts through inactive configuration replacement', async () => {
  const { HostProvider } = await import('../.verification-dist/host-provider.js');
  for (const [Root, Content, Grid, Trigger, fields, drafts] of [
    [DateTimePickerRoot, DateTimePickerContent, DateTimePickerGrid, DateTimePickerTrigger,
      [DateTimePickerDateTimeInput, DateTimePickerDateInput, DateTimePickerTimeInput], ['2026-08-18T10:', '2026-08-', '10:']],
    [DateTimeRangePickerRoot, DateTimeRangePickerContent, DateTimeRangePickerGrid, DateTimeRangePickerTrigger,
      [DateTimeRangePickerStartDateInput, DateTimeRangePickerEndDateInput, DateTimeRangePickerStartTimeInput, DateTimeRangePickerEndTimeInput],
      ['2026-08-', '2026-09-', '10:', '11:']],
  ]) {
    const host = document.createElement('div'); document.body.append(host); const active = shallowRef(true), label = shallowRef('Original'), updates = [];
    const app = createApp({ render: () => h(HostProvider, { active }, { default: () => h(Root,
      { position: false, label: label.value, 'onUpdate:modelValue': value => updates.push(value) },
      { default: () => [...fields.map(Field => h(Field)), h(Trigger), h(Content, {}, { default: () => h(Grid) })] }) }) });
    app.mount(host);
    try {
      await settle(); const inputs = [...host.querySelectorAll('input')]; assert.equal(inputs.length, fields.length);
      inputs.forEach((input, index) => { input.setSelectionRange(0, input.value.length); input.dispatchEvent(new browserWindow.CompositionEvent('compositionstart', { bubbles: true }));
        input.value = drafts[index]; input.setSelectionRange(drafts[index].length, drafts[index].length);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' })); });
      active.value = false; await settle(); label.value = 'Updated'; await settle(); inputs.forEach(input => { input.value = 'unobserved'; });
      active.value = true; for (let turn = 0; turn < 8; turn++) await nextTick();
      inputs.forEach((input, index) => { assert.equal(input.value, drafts[index]); assert.equal(input.selectionStart, drafts[index].length); });
      assert.deepEqual(updates, []);
    } finally { app.unmount(); host.remove(); }
  }
});

test('ISSUE-138: declarative date-picker policy changes preserve a keyboard grid entry', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const blocked = ref(true);
  const highlighted = Object.freeze({ year: 2026, month: 9, day: 15 });
  const sibling = Object.freeze({ year: 2026, month: 9, day: 16 });
  const app = createApp({
    render() {
      const unavailable = blocked.value;
      return h(DatePickerRoot, {
        highlightedValue: highlighted,
        defaultOpen: true,
        position: false,
        policies: {
          unavailable: (value) => unavailable
            && value.year === highlighted.year
            && value.month === highlighted.month
            && value.day === highlighted.day,
        },
      }, {
        default: ({ highlightedValue }) => [
          h(DatePickerTrigger),
          h(DatePickerContent, null, {
            default: () => h(DatePickerGrid, null, {
              default: () => [
                h(DatePickerCell, { value: highlighted }, { default: () => '15' }),
                h(DatePickerCell, { value: sibling }, { default: () => '16' }),
                h('output', { 'data-highlight': true }, `${highlightedValue.year}-${highlightedValue.month}-${highlightedValue.day}`),
              ],
            }),
          }),
        ],
      });
    },
  });

  app.mount(host);
  await settle();
  const grid = host.querySelector('[data-scope="date"][data-part="grid"]');
  const highlightedCell = host.querySelector('[data-sectile-picker-date="2026-09-15"]');
  const siblingCell = host.querySelector('[data-sectile-picker-date="2026-09-16"]');
  assert.equal(grid?.getAttribute('tabindex'), '0');
  assert.equal(highlightedCell?.disabled, true);
  assert.equal(highlightedCell?.getAttribute('tabindex'), '-1');
  assert.equal(siblingCell?.getAttribute('tabindex'), '-1');
  assert.equal(host.querySelector('[data-highlight]')?.textContent, '2026-9-15');

  blocked.value = false;
  await settle();
  assert.equal(grid?.getAttribute('tabindex'), '-1');
  assert.equal(highlightedCell?.disabled, false);
  assert.equal(highlightedCell?.getAttribute('tabindex'), '0');
  assert.equal(siblingCell?.getAttribute('tabindex'), '-1');
  assert.equal(host.querySelector('[data-highlight]')?.textContent, '2026-9-15');

  app.unmount();
  host.remove();
});

test('ISSUE-139: mounted day-cell slot and native availability stay synchronized across policy changes', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const blocked = ref(false);
  const value = Object.freeze({ year: 2026, month: 9, day: 15 });
  const app = createApp({
    render() {
      const unavailable = blocked.value;
      return h(DatePickerRoot, {
        highlightedValue: value,
        defaultOpen: true,
        position: false,
        policies: {
          unavailable: (candidate) => unavailable
            && candidate.year === value.year
            && candidate.month === value.month
            && candidate.day === value.day,
        },
      }, {
        default: () => [h(DatePickerTrigger), h(DatePickerContent, null, {
          default: () => h(DatePickerGrid, null, {
            default: () => h(DatePickerCell, { value }, {
              default: ({ disabled }) => disabled ? 'slot-disabled' : 'slot-enabled',
            }),
          }),
        })],
      });
    },
  });

  app.mount(host);
  await settle();
  const cell = () => host.querySelector('[data-sectile-picker-date="2026-09-15"]');
  assert.equal(cell()?.textContent, 'slot-enabled');
  assert.equal(cell()?.disabled, false);
  assert.equal(cell()?.getAttribute('aria-disabled'), 'false');

  blocked.value = true;
  await settle();
  assert.equal(cell()?.textContent, 'slot-disabled');
  assert.equal(cell()?.disabled, true);
  assert.equal(cell()?.getAttribute('aria-disabled'), 'true');

  blocked.value = false;
  await settle();
  assert.equal(cell()?.textContent, 'slot-enabled');
  assert.equal(cell()?.disabled, false);
  assert.equal(cell()?.getAttribute('aria-disabled'), 'false');

  app.unmount();
  host.remove();
});

test('Vue date picker defers reactive reconfiguration until native editing settles', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const label = ref('Pick a date');
  const value = Object.freeze({ year: 2026, month: 9, day: 13 });
  const app = createApp({
    render: () => h(DatePickerRoot, {
      defaultValue: value,
      defaultOpen: true,
      position: false,
      label: label.value,
    }, {
      default: () => [
        h(DatePickerInput),
        h(DatePickerTrigger),
        h(DatePickerContent, null, {
          default: () => h(DatePickerGrid),
        }),
      ],
    }),
  });

  app.mount(host);
  await settle();
  const input = host.querySelector('[data-scope="date"][data-part="input"]');
  assert.ok(input instanceof HTMLInputElement);
  assert.equal(input.value, '2026-09-13');

  input.dispatchEvent(new Event('focus'));
  input.setSelectionRange(0, input.value.length);
  input.dispatchEvent(new Event('compositionstart'));
  input.value = '2026-09-1';
  input.setSelectionRange(9, 9);
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertCompositionText',
    data: '1',
  }));

  label.value = 'Updated picker';
  await settle();
  assert.equal(input.value, '2026-09-1');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [9, 9]);

  input.dispatchEvent(new Event('compositionend'));
  await settle();
  assert.equal(input.value, '2026-09-1');

  input.dispatchEvent(new Event('blur'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settle();

  assert.equal(input.value, '2026-09-13');
  assert.equal(input.getAttribute('aria-label'), 'Updated picker');

  app.unmount();
  host.remove();
});

test('ISSUE-139: hydration preserves unavailable day-cell slot and native semantics', async () => {
  const host = document.createElement('div');
  const value = Object.freeze({ year: 2026, month: 9, day: 15 });
  const component = {
    render: () => h(DatePickerRoot, {
      highlightedValue: value,
      defaultOpen: true,
      position: false,
      policies: {
        unavailable: (candidate) => candidate.year === value.year
          && candidate.month === value.month
          && candidate.day === value.day,
      },
    }, {
      default: () => [h(DatePickerTrigger), h(DatePickerContent, null, {
        default: () => h(DatePickerGrid, null, {
          default: () => h(DatePickerCell, { value }, {
            default: ({ disabled }) => disabled ? 'slot-disabled' : 'slot-enabled',
          }),
        }),
      })],
    }),
  };

  host.innerHTML = await renderToString(createSSRApp(component));
  document.body.append(host);
  const cell = () => host.querySelector('[data-sectile-picker-date="2026-09-15"]');
  assert.equal(cell()?.textContent, 'slot-disabled');
  assert.equal(cell()?.disabled, true);
  assert.equal(cell()?.getAttribute('aria-disabled'), 'true');

  const app = createSSRApp(component);
  app.mount(host);
  await settle();
  assert.equal(cell()?.textContent, 'slot-disabled');
  assert.equal(cell()?.disabled, true);
  assert.equal(cell()?.getAttribute('aria-disabled'), 'true');

  app.unmount();
  host.remove();
});

test('Vue period pickers keep granularity-specific text and keyboard movement', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const monthUpdates = [];
  const yearUpdates = [];
  const app = createApp({
    render: () => h('div', [
      h(MonthPickerRoot, {
        defaultValue: { year: 2026, month: 8, day: 1 },
        defaultOpen: true,
        'onUpdate:modelValue': (value) => monthUpdates.push(value),
      }, {
        default: ({ months }) => [
          h(MonthPickerInput),
          h(MonthPickerTrigger),
          h(MonthPickerContent, null, {
            default: () => h(MonthPickerGrid, null, {
              default: () => months.flat().map((value) => h(MonthPickerCell, { value }, { default: () => String(value.month) })),
            }),
          }),
        ],
      }),
      h(YearPickerRoot, { defaultValue: { year: 2028, month: 8, day: 15 }, defaultOpen: true, 'onUpdate:modelValue': (value) => yearUpdates.push(value) }, {
        default: ({ years }) => [
          h(YearPickerInput),
          h(YearPickerTrigger),
          h(YearPickerContent, null, {
            default: () => h(YearPickerGrid, null, {
              default: () => years.flat().map((value) => h(YearPickerCell, { value }, { default: () => String(value.year) })),
            }),
          }),
        ],
      }),
    ]),
  });

  app.mount(host);
  await settle();

  const monthInput = host.querySelector('input[data-scope="month-picker"][data-part="input"]:not([type="hidden"])');
  const yearInput = host.querySelector('input[data-scope="year-picker"][data-part="input"]:not([type="hidden"])');
  assert.equal(monthInput?.value, '2026-08');
  assert.equal(monthInput?.readOnly, true);
  assert.equal(yearInput?.value, '2028');
  assert.equal(yearInput?.readOnly, true);

  const monthGrid = host.querySelector('[data-scope="month-picker"][data-part="grid"]');
  monthGrid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  assert.equal(host.querySelector('[data-sectile-picker-month="2026-09"]')?.getAttribute('tabindex'), '0');

  monthGrid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await settle();
  assert.deepEqual(monthUpdates.at(-1), { year: 2026, month: 9, day: 1 });

  const yearGrid = host.querySelector('[data-scope="year-picker"][data-part="grid"]');
  const initialYearPage = Array.from(yearGrid?.querySelectorAll('[data-sectile-picker-year]') ?? [], (cell) => cell.dataset.sectilePickerYear);
  host.querySelector('[data-sectile-picker-year="2023"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
  assert.deepEqual(yearUpdates.at(-1), { year: 2023, month: 1, day: 1 });
  assert.deepEqual(Array.from(yearGrid?.querySelectorAll('[data-sectile-picker-year]') ?? [], (cell) => cell.dataset.sectilePickerYear), initialYearPage);

  yearGrid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  await settle();
  assert.equal(host.querySelector('[data-sectile-picker-year="2027"]')?.getAttribute('tabindex'), '0');

  const currentYear = String(new Date().getFullYear());
  assert.equal(host.querySelector(`[data-sectile-picker-year="${currentYear}"]`)?.hasAttribute('data-current'), true);
  assert.equal(host.querySelector(`[data-sectile-picker-year="${currentYear}"]`)?.getAttribute('aria-current'), 'date');

  app.unmount();
  host.remove();
});

test('Vue month roots retain their twelve-cell projection across initial disabled or readonly state', async () => {
  for (const [path, prefix, range] of [['month-picker', 'MonthPicker', false], ['month-range-picker', 'MonthRangePicker', true]]) {
    const family = await import(packageManifest.exports[`./temporal/${path}`].import.replace('./dist/', '../.verification-dist/'));
    for (const flag of ['disabled', 'readonly']) {
      const host = document.createElement('div'); document.body.append(host);
      const flags = shallowRef({ [flag]: true }), proposals = [], initial = { year: 2026, month: 10, day: 1 };
      let state;
      const app = createApp({ render: () => h(family[`${prefix}Root`], {
        defaultValue: range ? { start: initial, end: initial } : initial, referenceDate: initial,
        open: true, position: false, ...flags.value, 'onUpdate:modelValue': value => proposals.push(value),
      }, { default: current => { state = current; return [h(family[`${prefix}Trigger`]),
        h(family[`${prefix}Content`], {}, { default: () => h(family[`${prefix}Grid`], {}, {
          default: () => current.months.flat().map(value => h(family[`${prefix}Cell`], { value, key: value.month }, () => String(value.month))),
        }) }),
      ]; } }) });
      try {
        app.mount(host); await settle();
        const cells = [...host.querySelectorAll(`[data-scope="${path}"][data-part="cell"]`)];
        assert.equal(state.months.flat().length, 12); assert.equal(cells.length, 12);
        cells[10].click(); await settle(); if (range) { cells[11].click(); await settle(); } assert.deepEqual(proposals, []);
        flags.value = { disabled: false, readonly: false }; await settle();
        assert.equal(state.months.flat().length, 12);
        assert.deepEqual([...host.querySelectorAll(`[data-scope="${path}"][data-part="cell"]`)], cells);
        cells[10].click(); await settle(); if (range) { cells[11].click(); await settle(); }
        const start = { year: 2026, month: 11, day: 1 }, end = { year: 2026, month: 12, day: 1 };
        assert.deepEqual(proposals, [range ? { start, end } : start]);
        app.unmount(); host.remove(); cells[10].click(); await nextTick(); assert.equal(proposals.length, 1);
      } finally { if (host.isConnected) { app.unmount(); host.remove(); } }
    }
  }
});

test('Vue period cells expose the availability of their canonical scalar and range commits', async () => {
  for (const [path, prefix, unit, range] of [
    ['month-picker', 'MonthPicker', 'month', false],
    ['year-picker', 'YearPicker', 'year', false],
    ['month-range-picker', 'MonthRangePicker', 'month', true],
    ['year-range-picker', 'YearRangePicker', 'year', true],
  ]) {
    const family = await import(packageManifest.exports[`./temporal/${path}`].import.replace('./dist/', '../.verification-dist/'));
    const cellValue = unit === 'month' ? { year: 2026, month: 9 } : { year: 2026 };
    const canonical = { year: 2026, month: unit === 'month' ? 9 : 1, day: 1 };
    const midpoint = { year: 2026, month: unit === 'month' ? 9 : 7, day: 15 };
    for (const [policies, available] of [
      [{ min: midpoint }, false],
      [{ unavailable: (value) => value.day === 1 }, false],
      [{ max: { year: 2025, month: 12, day: 31 } }, false],
      [{ min: canonical, max: midpoint }, true],
    ]) {
      const host = document.createElement('div');
      document.body.append(host);
      const changes = [];
      const app = createApp({ render: () => h(family[`${prefix}Root`], {
        defaultHighlightedValue: midpoint, defaultOpen: true, position: false, policies,
        'onUpdate:modelValue': (value) => changes.push(value),
      }, { default: () => [
        h(family[`${prefix}Trigger`]),
        h(family[`${prefix}Content`], null, { default: () => h(family[`${prefix}Grid`], null, {
          default: () => h(family[`${prefix}Cell`], { value: cellValue }, () => 'period'),
        }) }),
      ] }) });
      try {
        app.mount(host);
        await settle();
        const cell = host.querySelector(`[data-scope="${path}"][data-part="cell"]`);
        const grid = host.querySelector(`[data-scope="${path}"][data-part="grid"]`);
        assert.ok(cell, path);
        assert.equal(cell.disabled, !available, path);
        assert.equal(cell.getAttribute('aria-disabled'), String(!available), path);
        cell.click();
        await settle();
        grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await settle();
        grid.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        await settle();
        if (available) assert.deepEqual(changes.at(-1), range ? { start: canonical, end: canonical } : canonical);
        else assert.deepEqual(changes, [], path);
      } finally {
        app.unmount();
        host.remove();
      }
    }
  }
});

test('Vue period paging controls match canonical navigation and publish one highlight', async () => {
  for (const [path, prefix, unit, range] of [
    ['month-picker', 'MonthPicker', 'month', false],
    ['year-picker', 'YearPicker', 'year', false],
    ['month-range-picker', 'MonthRangePicker', 'month', true],
    ['year-range-picker', 'YearRangePicker', 'year', true],
  ]) {
    const family = await import(packageManifest.exports[`./temporal/${path}`].import.replace('./dist/', '../.verification-dist/'));
    const temporal = await import(`@sectile/temporal/${path}`);
    for (const direction of [-1, 1]) {
      const reference = { year: 2026, month: 8, day: 15 };
      const target = { year: 2026 + direction * (unit === 'month' ? 1 : 12), month: unit === 'month' ? 8 : 1, day: 1 };
      const cases = [
        ['unrestricted', reference, {}, false],
        ['controlled highlight', reference, {}, true],
        ['exact canonical bounds', reference, { min: target, max: target }, false],
        ['mid-period boundary', reference, direction > 0
          ? { min: { ...target, day: 15 } }
          : { max: { year: target.year - 1, month: 12, day: 31 } }, false],
        ['canonical dates unavailable', reference, { unavailable: (value) => value.day === 1, maxScan: 3 }, false],
        ['civil-date boundary', { ...reference, year: direction > 0 ? 9999 : 1 }, {}, false],
      ];
      for (const [scenario, initial, policies, controlled] of cases) {
        const value = range ? { start: initial, end: initial } : initial;
        const calendar = { highlighted: initial, open: true, viewMode: 'year' };
        const state = temporal[`create${prefix}State`](range ? { value, calendar } : { value, ...calendar });
        const expected = temporal[`apply${prefix}Event`](state, {
          type: 'navigate-period', unit, direction: direction > 0 ? 'next-page' : 'previous-page', referenceYear: initial.year,
        }, policies);
        const host = document.createElement('div');
        document.body.append(host);
        const highlighted = ref(initial);
        const highlights = [];
        const changes = [];
        const opens = [];
        let snapshot;
        const control = `${prefix}${direction > 0 ? 'Next' : 'Previous'}${unit === 'month' ? 'Year' : 'Page'}`;
        const app = createApp({ render: () => h(family[`${prefix}Root`], {
          defaultValue: value, defaultOpen: true, position: false, policies,
          ...(controlled ? { highlightedValue: highlighted.value } : { defaultHighlightedValue: initial }),
          'onUpdate:highlightedValue': (next) => highlights.push(next),
          'onUpdate:modelValue': (next) => changes.push(next),
          'onUpdate:open': (next) => opens.push(next),
        }, { default: (current) => {
          snapshot = current;
          return [
            h(family[`${prefix}Trigger`]),
            h(family[`${prefix}Content`], null, { default: () => [
              h(family[control]),
              h(family[`${prefix}Grid`], null, { default: () => (unit === 'month' ? current.months : current.years).flat()
                .map((cell) => h(family[`${prefix}Cell`], { key: `${cell.year}-${cell.month ?? ''}`, value: cell })) }),
            ] }),
          ];
        } }) });
        const label = `${path} ${direction} ${scenario}`;
        try {
          app.mount(host);
          await settle();
          highlights.length = changes.length = opens.length = 0;
          const before = JSON.parse(JSON.stringify(snapshot));
          const part = `${direction > 0 ? 'next' : 'previous'}-${unit === 'month' ? 'year' : 'page'}`;
          const button = host.querySelector(`[data-scope="${path}"][data-part="${part}"]`);
          assert.ok(button, label);
          button.click();
          await settle();
          if (expected.ok) {
            const next = range ? expected.value.state.calendar : expected.value.state;
            assert.deepEqual(highlights, [next.highlighted], label);
            if (controlled) {
              assert.deepEqual(snapshot.highlightedValue, initial, label);
              highlighted.value = next.highlighted;
              await settle();
            }
            assert.deepEqual(snapshot.highlightedValue, next.highlighted, label);
            assert.deepEqual(snapshot.view, next.view, label);
            const cell = host.querySelector(`[data-scope="${path}"][data-part="cell"][data-highlighted]`);
            assert.ok(cell, label);
            assert.equal(cell.disabled, false, label);
            assert.equal(cell.getAttribute('aria-disabled'), 'false', label);
            assert.equal(cell.getAttribute('tabindex'), '0', label);
            assert.deepEqual(snapshot.value, before.value, label);
            assert.equal(snapshot.open, before.open, label);
          } else {
            assert.deepEqual(highlights, [], label);
            assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), before, label);
          }
          assert.deepEqual(changes, [], label);
          assert.deepEqual(opens, [], label);
        } finally {
          app.unmount();
          host.remove();
        }
      }
    }
  }
});

test('Vue day picker year controls preserve date-based movement', async () => {
  const family = await import('../.verification-dist/temporal/date-picker.js');
  for (const direction of [-1, 1]) {
    const host = document.createElement('div');
    document.body.append(host);
    const reference = { year: 2026, month: 8, day: 15 };
    const highlights = [];
    const changes = [];
    const app = createApp({ render: () => h(family.DatePickerRoot, {
      defaultValue: reference, defaultHighlightedValue: reference, defaultOpen: true, position: false,
      policies: { unavailable: (value) => value.day === 1 },
      'onUpdate:highlightedValue': (value) => highlights.push(value),
      'onUpdate:modelValue': (value) => changes.push(value),
    }, { default: () => [
      h(family.DatePickerTrigger),
      h(family.DatePickerContent, null, { default: () => [
        h(family[`DatePicker${direction > 0 ? 'Next' : 'Previous'}Year`]), h(family.DatePickerGrid),
      ] }),
    ] }) });
    try {
      app.mount(host);
      await settle();
      highlights.length = changes.length = 0;
      host.querySelector(`[data-part="${direction > 0 ? 'next' : 'previous'}-year"]`).click();
      await settle();
      assert.deepEqual(highlights, [{ ...reference, year: reference.year + direction }]);
      assert.deepEqual(changes, []);
    } finally {
      app.unmount();
      host.remove();
    }
  }
});

test('Vue calendar reprojects cells after month navigation', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(CalendarRoot, { defaultHighlightedValue: { year: 2026, month: 8, day: 31 } }, {
      default: ({ dates }) => h(CalendarContent, null, {
        default: () => [
          h(CalendarNextMonth),
          h(CalendarGrid, null, {
            default: () => dates.flat().map((value) => h(CalendarCell, { key: `${value.year}-${value.month}-${value.day}`, value }, { default: () => String(value.day) })),
          }),
        ],
      }),
    }),
  });

  app.mount(host);
  await settle();
  host.querySelector('[data-part="next-month"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();

  assert.equal(host.querySelector('[data-calendar-id="2026-09-30"]')?.getAttribute('tabindex'), '0');
  assert.equal(host.querySelector('[data-calendar-id="2026-08-24"]'), null);

  app.unmount();
  host.remove();
});

test('Vue calendar proposes controlled date state across month boundaries', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref({ year: 2026, month: 8, day: 31 });
  const highlighted = ref({ year: 2026, month: 8, day: 31 });
  const valueUpdates = [];
  const highlightUpdates = [];
  const app = createApp({
    render: () => h(CalendarRoot, {
      modelValue: value.value,
      highlightedValue: highlighted.value,
      'onUpdate:modelValue': (next) => { valueUpdates.push(next); value.value = next; },
      'onUpdate:highlightedValue': (next) => { highlightUpdates.push(next); highlighted.value = next; },
    }, {
      default: ({ dates }) => h(CalendarContent, null, {
        default: () => h(CalendarGrid, null, {
          default: () => dates.flat().map((item) => h(CalendarCell, { key: `${item.year}-${item.month}-${item.day}`, value: item }, () => String(item.day))),
        }),
      }),
    }),
  });

  app.mount(host);
  await settle();
  const grid = host.querySelector('[data-scope="calendar"][data-part="grid"]');
  grid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  grid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await settle();

  assert.deepEqual(valueUpdates, [{ year: 2026, month: 9, day: 1 }]);
  assert.deepEqual(highlightUpdates, [{ year: 2026, month: 9, day: 1 }]);
  assert.deepEqual(value.value, { year: 2026, month: 9, day: 1 });
  assert.deepEqual(highlighted.value, { year: 2026, month: 9, day: 1 });

  app.unmount();
  host.remove();
});

test('Vue controlled date and date-time pickers preserve every stepped input segment', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const dateValue = ref({ year: 2026, month: 8, day: 18 });
  const dateTimeValue = ref({
    date: { year: 2026, month: 8, day: 18 },
    time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  });
  const rangeValue = ref({
    start: {
      date: { year: 2026, month: 8, day: 18 },
      time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
    },
    end: {
      date: { year: 2026, month: 12, day: 21 },
      time: { hour: 17, minute: 45, second: 0, millisecond: 0 },
    },
  });
  const app = createApp({
    render: () => h('div', [
      h(DatePickerRoot, {
        modelValue: dateValue.value,
        defaultOpen: true,
        position: false,
        'onUpdate:modelValue': (value) => { dateValue.value = value; },
      }, { default: () => [
        h(DatePickerInput), h(DatePickerTrigger),
        h(DatePickerContent, null, { default: () => h(DatePickerGrid) }),
      ] }),
      h(DateTimePickerRoot, {
        modelValue: dateTimeValue.value,
        defaultOpen: true,
        position: false,
        'onUpdate:modelValue': (value) => { dateTimeValue.value = value; },
      }, { default: () => [
        h(DateTimePickerDateTimeInput), h(DateTimePickerDateInput), h(DateTimePickerTimeInput),
        h(DateTimePickerTrigger),
        h(DateTimePickerContent, null, { default: () => h(DateTimePickerGrid) }),
      ] }),
      h(DateTimeRangePickerRoot, {
        modelValue: rangeValue.value,
        defaultOpen: true,
        position: false,
        'onUpdate:modelValue': (value) => { rangeValue.value = value; },
      }, { default: () => [
        h(DateTimeRangePickerStartDateInput), h(DateTimeRangePickerStartTimeInput),
        h(DateTimeRangePickerEndDateInput), h(DateTimeRangePickerEndTimeInput),
        h(DateTimeRangePickerTrigger),
        h(DateTimeRangePickerContent, null, { default: () => h(DateTimeRangePickerGrid) }),
      ] }),
    ]),
  });

  app.mount(host);
  await settle();
  const step = async (selector, selection) => {
    const input = host.querySelector(selector);
    assert.ok(input, selector);
    input.focus();
    input.setSelectionRange(selection[0], selection[1]);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await settle();
    assert.deepEqual([input.selectionStart, input.selectionEnd], selection, selector);
  };

  await step('[data-part="input"]', [5, 7]);
  await step('[data-part="date-time-input"]', [5, 7]);
  await step('[data-part="date-input"]', [5, 7]);
  await step('[data-part="time-input"]', [0, 2]);
  await step('[data-part="start-date-input"]', [5, 7]);
  await step('[data-part="start-time-input"]', [0, 2]);
  await step('[data-part="end-date-input"]', [5, 7]);
  await step('[data-part="end-time-input"]', [0, 2]);

  app.unmount();
  host.remove();
});

test('Vue controlled picker retains a pending field proposal until delayed owner sync', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref({ year: 2026, month: 8, day: 18 });
  const open = ref(true);
  let proposal;
  const app = createApp({
    render: () => h(DatePickerRoot, {
      modelValue: value.value,
      open: open.value,
      position: false,
      'onUpdate:modelValue': (next) => { proposal = next; },
    }, { default: () => [
      h(DatePickerInput), h(DatePickerTrigger),
      h(DatePickerContent, null, { default: () => h(DatePickerGrid) }),
    ] }),
  });

  app.mount(host);
  await settle();
  const input = host.querySelector('[data-part="input"]');
  input.setSelectionRange(5, 7);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  await settle();
  assert.equal(input.value, '2026-09-18');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [5, 7]);
  assert.deepEqual(value.value, { year: 2026, month: 8, day: 18 });

  open.value = false;
  await settle();
  assert.equal(input.value, '2026-09-18');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [5, 7]);

  value.value = proposal;
  await settle();
  assert.equal(input.value, '2026-09-18');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [5, 7]);
  app.unmount();
  host.remove();
});

test('Vue picker keeps an editable field session stable across reactive reconfiguration', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const label = ref('Appointment');
  const app = createApp({
    render: () => h(DateTimePickerRoot, {
      defaultValue: {
        date: { year: 2026, month: 8, day: 18 },
        time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
      },
      defaultOpen: true,
      position: false,
      label: label.value,
    }, { default: () => [
      h(DateTimePickerDateInput),
      h(DateTimePickerTrigger),
      h(DateTimePickerContent, null, { default: () => h(DateTimePickerGrid) }),
    ] }),
  });

  app.mount(host);
  await settle();
  const input = host.querySelector('[data-part="date-input"]');
  assert.ok(input instanceof HTMLInputElement);
  input.focus();
  input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
  input.value = '2026-09-';
  input.setSelectionRange(8, 8);
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertCompositionText',
    data: '2026-09-',
  }));

  label.value = 'Updated appointment';
  await settle();

  assert.equal(input.value, '2026-09-');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [8, 8]);
  assert.equal(document.activeElement, input);

  input.dispatchEvent(new Event('compositionend', { bubbles: true }));
  await settle();

  assert.equal(input.value, '2026-09-');
  assert.deepEqual([input.selectionStart, input.selectionEnd], [8, 8]);
  assert.equal(document.activeElement, input);

  app.unmount();
  host.remove();
});

test('Vue range picker display inputs remain read-only after DOM connection refresh', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h('div', [
      h(DateRangePickerRoot, {
        defaultValue: { start: { year: 2026, month: 8, day: 18 }, end: { year: 2026, month: 8, day: 21 } },
        defaultOpen: true,
        position: false,
      }, { default: () => [
        h(DateRangePickerStartInput), h(DateRangePickerEndInput), h(DateRangePickerTrigger),
        h(DateRangePickerContent, null, { default: () => h(DateRangePickerGrid) }),
      ] }),
      h(DateTimeRangePickerRoot, {
        defaultValue: { start, end },
        defaultOpen: true,
        position: false,
      }, { default: () => [
        h(DateTimeRangePickerStartDateTimeInput), h(DateTimeRangePickerEndDateTimeInput),
        h(DateTimeRangePickerTrigger),
        h(DateTimeRangePickerContent, null, { default: () => h(DateTimeRangePickerGrid) }),
      ] }),
    ]),
  });

  app.mount(host);
  await settle();
  for (const input of host.querySelectorAll('[data-part="start-input"], [data-part="end-input"], [data-part="start-date-time-input"], [data-part="end-date-time-input"]')) {
    assert.equal(input.readOnly, true, input.dataset.part);
    assert.equal(input.getAttribute('aria-readonly'), 'true', input.dataset.part);
  }
  app.unmount();
  host.remove();
});

test('Vue date picker routes direct cell clicks to the date selection event', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(DatePickerRoot, {
      defaultValue: { year: 2026, month: 8, day: 18 },
      defaultHighlightedValue: { year: 2026, month: 8, day: 18 },
      defaultOpen: true,
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: ({ dates }) => [
        h(DatePickerTrigger),
        h(DatePickerContent, null, {
          default: () => h(DatePickerGrid, null, {
            default: () => dates.flat().map((value) => h(DatePickerCell, {
              key: `${value.year}-${value.month}-${value.day}`,
              value,
            }, { default: () => String(value.day) })),
          }),
        }),
      ],
    }),
  });

  app.mount(host);
  await settle();
  host.querySelector('[data-sectile-picker-date="2026-08-13"]')?.click();
  await settle();

  assert.deepEqual(updates, [{ year: 2026, month: 8, day: 13 }]);
  assert.equal(host.querySelector('[data-sectile-picker-date="2026-08-13"]')?.hasAttribute('data-selected'), true);

  app.unmount();
  host.remove();
});

test('Vue date range picker commits a new range from direct cell clicks', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(DateRangePickerRoot, {
      defaultValue: {
        start: { year: 2026, month: 8, day: 18 },
        end: { year: 2026, month: 8, day: 21 },
      },
      defaultHighlightedValue: { year: 2026, month: 8, day: 18 },
      defaultOpen: true,
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: ({ dates }) => [
        h(DateRangePickerTrigger),
        h(DateRangePickerStartInput),
        h(DateRangePickerEndInput),
        h(DateRangePickerContent, null, {
          default: () => h(DateRangePickerGrid, null, {
            default: () => dates.flat().map((value) => h(DateRangePickerCell, {
              key: `${value.year}-${value.month}-${value.day}`,
              value,
            }, { default: () => String(value.day) })),
          }),
        }),
      ],
    }),
  });

  app.mount(host);
  await settle();
  host.querySelector('[data-sectile-picker-date="2026-08-03"]')?.click();
  await settle();
  host.querySelector('[data-sectile-picker-date="2026-08-13"]')?.click();
  await settle();

  assert.deepEqual(updates, [{
    start: { year: 2026, month: 8, day: 3 },
    end: { year: 2026, month: 8, day: 13 },
  }]);
  assert.equal(host.querySelectorAll('[data-selected]').length, 2);
  assert.equal(host.querySelectorAll('[data-in-range]').length, 11);

  app.unmount();
  host.remove();
});

test('Vue date-time picker routes direct cell clicks to the date-time selection event', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(DateTimePickerRoot, {
      defaultValue: start,
      defaultHighlightedValue: start.date,
      defaultOpen: true,
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: ({ dates }) => [
        h(DateTimePickerTrigger),
        h(DateTimePickerContent, null, {
          default: () => h(DateTimePickerGrid, null, {
            default: () => dates.flat().map((value) => h(DateTimePickerCell, {
              key: `${value.year}-${value.month}-${value.day}`,
              value,
            }, { default: () => String(value.day) })),
          }),
        }),
      ],
    }),
  });

  app.mount(host);
  await settle();
  host.querySelector('[data-sectile-picker-date="2026-08-13"]')?.click();
  await settle();

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0]?.date, { year: 2026, month: 8, day: 13 });
  assert.equal(updates[0]?.time.hour, 9);
  assert.equal(updates[0]?.time.minute, 30);
  assert.equal(host.querySelector('[data-sectile-picker-date="2026-08-13"]')?.hasAttribute('data-selected'), true);

  app.unmount();
  host.remove();
});

test('Vue date-time range picker selects a month-view range after changing views', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const updates = [];
  const app = createApp({
    render: () => h(DateTimeRangePickerRoot, {
      defaultValue: { start, end },
      defaultHighlightedValue: start.date,
      defaultOpen: true,
      defaultView: 'week',
      'onUpdate:modelValue': (value) => updates.push(value),
    }, {
      default: ({ dates }) => [
        h(DateTimeRangePickerTrigger),
        h(DateTimeRangePickerStartDateInput),
        h(DateTimeRangePickerEndDateInput),
        h(DateTimeRangePickerMonthViewTrigger, null, { default: () => 'Month' }),
        h(DateTimeRangePickerContent, null, {
          default: () => h(DateTimeRangePickerGrid, null, {
            default: () => dates.flat().map((value) => h(DateTimeRangePickerCell, {
              key: `${value.year}-${value.month}-${value.day}`,
              value,
            }, { default: () => String(value.day) })),
          }),
        }),
      ],
    }),
  });

  app.mount(host);
  await settle();
  host.querySelector('[data-part="month-view-trigger"]')?.click();
  await settle();

  host.querySelector('[data-sectile-picker-date="2026-08-03"]')?.click();
  await settle();
  host.querySelector('[data-sectile-picker-date="2026-08-13"]')?.click();
  await settle();

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0]?.start.date, { year: 2026, month: 8, day: 3 });
  assert.deepEqual(updates[0]?.end.date, { year: 2026, month: 8, day: 13 });
  assert.equal(host.querySelectorAll('[data-selected]').length, 2);
  assert.equal(host.querySelectorAll('[data-in-range]').length, 11);

  app.unmount();
  host.remove();
});
