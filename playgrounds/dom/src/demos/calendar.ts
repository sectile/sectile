import { createCalendar, type CalendarConnection } from '@sectile/dom/calendar';
import { unwrap } from '@sectile/core/result';
import { ChevronLeft, ChevronRight, createElement } from 'lucide';
import { effectLabels, eventLabel, type DemoContext, type DemoDefinition, type DemoSession } from '../playground.js';

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});
const shortMonthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface MonthPage {
  readonly date: Date;
  readonly key: string;
  readonly label: string;
  readonly rows: readonly (readonly string[])[];
  readonly ids: ReadonlySet<string>;
}

export const calendarDemo: DemoDefinition = {
  id: 'calendar',
  label: 'Calendar',
  title: 'Calendar',
  description: 'Browse complete months, move by day or week, and choose a date.',
  shortcuts: [
    { keys: ['←', '→', '↑', '↓'], label: 'move by day or week' },
    { keys: ['Enter'], label: 'select date' },
    { keys: ['Page Up', 'Page Down'], label: 'change month' },
  ],
  cases: [
    { id: 'month', title: 'Monthly date picker', mount: (context) => mountCalendar(context, { disabledWeekends: false, controlled: false }) },
    { id: 'disabled-weekends', title: 'Weekday booking', mount: (context) => mountCalendar(context, { disabledWeekends: true, controlled: false }) },
    { id: 'controlled', title: 'Controlled date picker', mount: (context) => mountCalendar(context, { disabledWeekends: false, controlled: true }) },
  ],
};

function mountCalendar(context: DemoContext, scenario: { readonly disabledWeekends: boolean; readonly controlled: boolean }): DemoSession {
    const today = new Date();
    const todayID = dateID(today);
    let page = createMonthPage(today);
    let selectedDate: string | null = todayID;
    let highlightedDate: string | null = todayID;
    let connection: CalendarConnection<string>;

    const wrap = document.createElement('div');
    wrap.className = 'calendar-wrap';

    const navigation = document.createElement('div');
    navigation.className = 'calendar-navigation';
    const previousButton = monthButton(ChevronLeft, 'Previous month');
    const monthTitle = document.createElement('h3');
    monthTitle.className = 'calendar-title';
    monthTitle.setAttribute('aria-live', 'polite');
    const nextButton = monthButton(ChevronRight, 'Next month');
    previousButton.disabled = context.interaction.disabled ?? false;
    nextButton.disabled = context.interaction.disabled ?? false;
    navigation.append(previousButton, monthTitle, nextButton);

    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'weekdays';
    weekdayRow.setAttribute('role', 'row');
    for (const weekday of weekdays) {
      const label = document.createElement('span');
      label.setAttribute('role', 'columnheader');
      label.textContent = weekday;
      weekdayRow.append(label);
    }

    const root = document.createElement('div');
    root.className = 'calendar-grid';
    wrap.append(navigation, weekdayRow, root);
    context.surface.append(wrap);

    const previousMonth = (): void => { connection.handleEvent('previous-page'); };
    const nextMonth = (): void => { connection.handleEvent('next-page'); };
    previousButton.addEventListener('click', previousMonth);
    nextButton.addEventListener('click', nextMonth);

    mountPage(todayID);

    function mountPage(highlightedValue: string): void {
      connection?.disconnect();
      const visibleValue = selectedDate !== null && page.ids.has(selectedDate)
        ? selectedDate
        : null;
      connection = unwrap(createCalendar({
        rows: page.rows,
        root,
        ...context.interaction,
        policies: { eligible: (id) => !scenario.disabledWeekends || !isWeekend(id) },
        ...(scenario.controlled ? { value: visibleValue, highlightedValue } : { defaultValue: visibleValue, defaultHighlightedValue: highlightedValue }),
        onValueChange: ({ value }) => { selectedDate = value; if (scenario.controlled) queueMicrotask(syncControlled); },
        onHighlightedValueChange: ({ value }) => { highlightedDate = value; if (scenario.controlled) queueMicrotask(syncControlled); },
        onPageRequest: ({ direction, from }) => {
          const target = shiftMonth(page.date, direction, from);
          page = createMonthPage(target);
          mountPage(dateID(target));
          connection.focusCurrent();
        },
        onTransition: ({ event, result }) => context.record({
          revision: result.snapshot.revision,
          event: eventLabel(event),
          accepted: result.ok,
          effects: effectLabels(result.commands),
        }),
        onUpdate: render,
      }));
      render();
    }

    function render(): void {
      const { revision, state } = connection.getSnapshot();
      root.replaceChildren();
      monthTitle.textContent = page.label;
      connection.setCalendarAttributes(page.label);
      page.rows.forEach((week, rowIndex) => week.forEach((id, columnIndex) => {
        const date = dateFromID(id);
        const outsideMonth = date.getMonth() !== page.date.getMonth();
        const disabled = scenario.disabledWeekends && isWeekend(id);
        const cell = document.createElement('div');
        cell.className = [
          'calendar-cell',
          outsideMonth ? 'outside-month' : '',
          id === todayID ? 'today' : '',
          state.cursor.current === id ? 'current' : '',
          state.selection.has(id) ? 'selected' : '',
          disabled ? 'disabled' : '',
        ].filter(Boolean).join(' ');
        cell.setAttribute('aria-label', dateFormatter.format(date));
        if (id === todayID) cell.setAttribute('aria-current', 'date');

        const month = document.createElement('span');
        month.className = 'calendar-month-hint';
        month.textContent = outsideMonth ? shortMonthFormatter.format(date) : '';
        month.setAttribute('aria-hidden', 'true');
        const day = document.createElement('span');
        day.className = 'calendar-day-number';
        day.textContent = String(date.getDate());
        const status = document.createElement('span');
        status.className = 'calendar-day-status';
        status.textContent = id === todayID ? 'Today' : '';
        status.setAttribute('aria-hidden', 'true');
        cell.append(month, day, status);

        connection.setCellAttributes(cell, {
          id,
          rowIndex: rowIndex + 1,
          columnIndex: columnIndex + 1,
          disabled,
        });
        root.append(cell);
      }));
      context.showState(revision, {
        view: page.key,
        current: state.cursor.current,
        selected: selectedDate,
        visibleSelection: state.selection.selected,
        disabledWeekends: scenario.disabledWeekends,
        ownership: scenario.controlled ? 'controlled' : 'uncontrolled',
      });
    }

    function syncControlled(): void {
      connection.syncControlledValues({
        value: selectedDate !== null && page.ids.has(selectedDate) ? selectedDate : null,
        highlightedValue: highlightedDate !== null && page.ids.has(highlightedDate) ? highlightedDate : null,
      });
    }

    return {
      focus: () => connection.focusCurrent(),
      disconnect: () => {
        previousButton.removeEventListener('click', previousMonth);
        nextButton.removeEventListener('click', nextMonth);
        connection.disconnect();
      },
    };
}

function createMonthPage(date: Date): MonthPage {
  const month = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (month.getDay() + 6) % 7;
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - mondayOffset);
  const rows = Array.from({ length: 6 }, (_, row) => Array.from(
    { length: 7 },
    (_, column) => dateID(addDays(firstCell, row * 7 + column)),
  ));
  return Object.freeze({
    date: month,
    key: `${month.getFullYear()}-${pad(month.getMonth() + 1)}`,
    label: monthFormatter.format(month),
    rows: Object.freeze(rows.map((row) => Object.freeze(row))),
    ids: new Set(rows.flat()),
  });
}

function shiftMonth(view: Date, direction: -1 | 1, from: string | null): Date {
  const source = from === null ? view : dateFromID(from);
  const first = new Date(view.getFullYear(), view.getMonth() + direction, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(source.getDate(), lastDay));
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function dateID(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromID(id: string): Date {
  const [year, month, day] = id.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function isWeekend(id: string): boolean {
  const day = dateFromID(id).getDay();
  return day === 0 || day === 6;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function monthButton(
  icon: Parameters<typeof createElement>[0],
  label: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'calendar-month-button secondary';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(createElement(icon, {
    'aria-hidden': 'true',
    focusable: 'false',
    height: 18,
    width: 18,
  }));
  return button;
}
