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
  MouseEvent: browserWindow.MouseEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref } = await import('vue');
const { CalendarCell, CalendarContent, CalendarGrid, CalendarNextMonth, CalendarRoot } = await import('../.verification-dist/calendar.js');
const {
  DatePickerCell,
  DatePickerContent,
  DatePickerGrid,
  DatePickerInput,
  DatePickerRoot,
  DatePickerTrigger,
} = await import('../.verification-dist/date-picker.js');
const {
  DateRangePickerCell,
  DateRangePickerContent,
  DateRangePickerEndInput,
  DateRangePickerGrid,
  DateRangePickerRoot,
  DateRangePickerStartInput,
  DateRangePickerTrigger,
} = await import('../.verification-dist/date-range-picker.js');
const {
  DateTimePickerCell,
  DateTimePickerContent,
  DateTimePickerDateInput,
  DateTimePickerDateTimeInput,
  DateTimePickerGrid,
  DateTimePickerRoot,
  DateTimePickerTimeInput,
  DateTimePickerTrigger,
} = await import('../.verification-dist/date-time-picker.js');
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
} = await import('../.verification-dist/date-time-range-picker.js');
const {
  MonthPickerCell,
  MonthPickerContent,
  MonthPickerGrid,
  MonthPickerInput,
  MonthPickerRoot,
  MonthPickerTrigger,
} = await import('../.verification-dist/month-picker.js');
const {
  YearPickerCell,
  YearPickerContent,
  YearPickerGrid,
  YearPickerInput,
  YearPickerRoot,
  YearPickerTrigger,
} = await import('../.verification-dist/year-picker.js');

const start = Object.freeze({
  date: Object.freeze({ year: 2026, month: 8, day: 18 }),
  time: Object.freeze({ hour: 9, minute: 30 }),
});
const end = Object.freeze({
  date: Object.freeze({ year: 2026, month: 8, day: 21 }),
  time: Object.freeze({ hour: 17, minute: 30 }),
});

async function settle() {
  await nextTick();
  await nextTick();
}

test('Vue period pickers keep granularity-specific text and keyboard movement', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const monthUpdates = [];
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
      h(YearPickerRoot, { defaultValue: { year: 2028, month: 1, day: 1 }, defaultOpen: true }, {
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
