import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick } = await import('vue');
const {
  DatePickerCell,
  DatePickerContent,
  DatePickerGrid,
  DatePickerRoot,
  DatePickerTrigger,
} = await import('../dist/date-picker.js');
const {
  DateRangePickerCell,
  DateRangePickerContent,
  DateRangePickerEndInput,
  DateRangePickerGrid,
  DateRangePickerRoot,
  DateRangePickerStartInput,
  DateRangePickerTrigger,
} = await import('../dist/date-range-picker.js');
const {
  DateTimePickerCell,
  DateTimePickerContent,
  DateTimePickerGrid,
  DateTimePickerRoot,
  DateTimePickerTrigger,
} = await import('../dist/date-time-picker.js');
const {
  DateTimeRangePickerCell,
  DateTimeRangePickerContent,
  DateTimeRangePickerEndDateInput,
  DateTimeRangePickerGrid,
  DateTimeRangePickerMonthViewTrigger,
  DateTimeRangePickerRoot,
  DateTimeRangePickerStartDateInput,
  DateTimeRangePickerTrigger,
} = await import('../dist/date-time-range-picker.js');

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
