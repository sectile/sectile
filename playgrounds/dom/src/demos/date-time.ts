import { createDateField, type DateFieldConnection } from '@sectile/dom/date-field';
import { createDateTimeField, type DateTimeFieldConnection } from '@sectile/dom/date-time-field';
import { createTimeField, type TimeFieldConnection } from '@sectile/dom/time-field';
import { createDatePicker, type DatePickerConnection } from '@sectile/dom/date-picker';
import { createDateRangePicker, type DateRangePickerConnection } from '@sectile/dom/date-range-picker';
import { unwrap } from '@sectile/core/result';
import { compareDateValues, createDateRange, createDateValue, dateDayOfWeek, formatDateValue, type DateRange, type DateValue } from '@sectile/core/date-field';
import { createTimeValue, formatTimeValue, type TimeValue } from '@sectile/core/time-field';
import { createDateTimeValue, formatDateTimeValue, type DateTimeValue } from '@sectile/core/date-time-field';
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Clock3, createElement } from 'lucide';
import { type DemoContext, type DemoDefinition, type DemoSession } from '../playground.js';

const date = (year: number, month: number, day: number): DateValue => unwrap(createDateValue(year, month, day));
const time = (hour: number, minute: number): TimeValue => unwrap(createTimeValue(hour, minute));
const dateTime = (year: number, month: number, day: number, hour: number, minute: number): DateTimeValue =>
  unwrap(createDateTimeValue(date(year, month, day), time(hour, minute)));
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export const dateFieldDemo: DemoDefinition = {
  id: 'date-field', label: 'Date field', title: 'Date field', description: 'Edit a calendar date without attaching a time zone or instant.',
  shortcuts: [{ keys: ['↑', '↓'], label: 'adjust caret segment' }, { keys: ['Enter'], label: 'commit' }, { keys: ['Escape'], label: 'cancel draft' }],
  cases: [
    { id: 'iso-date', title: 'Calendar date', mount: (context) => mountDateField(context, { initial: date(2026, 8, 22) }) },
    { id: 'bounded', title: 'Booking deadline', mount: (context) => mountDateField(context, { initial: date(2026, 8, 22), min: date(2026, 8, 18), max: date(2026, 9, 30) }) },
    { id: 'controlled', title: 'Controlled date', mount: (context) => mountDateField(context, { initial: date(2026, 8, 22), controlled: true }) },
  ],
};

export const timeFieldDemo: DemoDefinition = {
  id: 'time-field', label: 'Time field', title: 'Time field', description: 'Edit a 24-hour wall-clock time with segment-aware adjustment.',
  shortcuts: [{ keys: ['↑', '↓'], label: 'adjust caret segment' }, { keys: ['Enter'], label: 'commit' }, { keys: ['Escape'], label: 'cancel draft' }],
  cases: [
    { id: 'wall-clock', title: 'Wall-clock time', mount: (context) => mountTimeField(context, { initial: time(9, 30) }) },
    { id: 'stepped', title: '15-minute schedule', mount: (context) => mountTimeField(context, { initial: time(10, 15), step: 15 }) },
    { id: 'controlled', title: 'Controlled time', mount: (context) => mountTimeField(context, { initial: time(14, 0), controlled: true }) },
  ],
};

export const dateTimeFieldDemo: DemoDefinition = {
  id: 'date-time-field', label: 'Date-time field', title: 'Date-time field', description: 'Edit one timezone-free calendar date and wall-clock time with civil boundary carry.',
  shortcuts: [{ keys: ['↑', '↓'], label: 'adjust caret segment' }, { keys: ['Enter'], label: 'commit' }, { keys: ['Escape'], label: 'cancel draft' }],
  cases: [
    { id: 'local-schedule', title: 'Local schedule', mount: (context) => mountDateTimeField(context, { initial: dateTime(2026, 8, 22, 16, 30) }) },
    { id: 'cross-midnight', title: 'Cross-midnight stepping', mount: (context) => mountDateTimeField(context, { initial: dateTime(2026, 8, 22, 23, 45), step: 30 }) },
    { id: 'controlled', title: 'Controlled date-time', mount: (context) => mountDateTimeField(context, { initial: dateTime(2026, 8, 22, 14, 0), controlled: true }) },
  ],
};

export const datePickerDemo: DemoDefinition = {
  id: 'date-picker', label: 'Date picker', title: 'Date picker', description: 'Compose a date field, popup, complete month grid, and single selection.',
  shortcuts: [{ keys: ['←', '→', '↑', '↓'], label: 'move day or week' }, { keys: ['Page Up', 'Page Down'], label: 'change month' }, { keys: ['Enter'], label: 'select and close' }],
  cases: [
    { id: 'single', title: 'Choose a release date', mount: (context) => mountDatePicker(context, { initial: date(2026, 8, 22) }) },
    { id: 'weekdays', title: 'Weekday booking', mount: (context) => mountDatePicker(context, { initial: date(2026, 8, 21), weekdaysOnly: true }) },
    { id: 'controlled', title: 'Controlled picker', mount: (context) => mountDatePicker(context, { initial: date(2026, 8, 22), controlled: true }) },
  ],
};

export const dateRangePickerDemo: DemoDefinition = {
  id: 'date-range-picker', label: 'Date range picker', title: 'Date range picker', description: 'Choose an inclusive start and end across month boundaries.',
  shortcuts: [{ keys: ['←', '→', '↑', '↓'], label: 'move day or week' }, { keys: ['Page Up', 'Page Down'], label: 'change month' }, { keys: ['Enter'], label: 'set range endpoint' }],
  cases: [
    { id: 'booking', title: 'Deployment window', mount: (context) => mountRangePicker(context, { initial: unwrap(createDateRange(date(2026, 8, 18), date(2026, 8, 22))) }) },
    { id: 'bounded', title: 'Quarter availability', mount: (context) => mountRangePicker(context, { initial: null, min: date(2026, 8, 1), max: date(2026, 10, 31) }) },
    { id: 'controlled', title: 'Controlled range', mount: (context) => mountRangePicker(context, { initial: unwrap(createDateRange(date(2026, 8, 18), date(2026, 8, 22))), controlled: true }) },
  ],
};

function mountDateField(context: DemoContext, scenario: { initial: DateValue; min?: DateValue; max?: DateValue; controlled?: boolean }): DemoSession {
  const shell = fieldShell('Release date', 'YYYY-MM-DD', CalendarDays, 'Use ↑ or ↓ on the year, month, or day segment.', 'Enter a real calendar date using YYYY-MM-DD.'); const input = shell.querySelector('input') as HTMLInputElement; const output = shell.querySelector('output') as HTMLOutputElement; context.surface.append(shell);
  let controlled = scenario.initial; let connection: DateFieldConnection;
  connection = createDateField({ input, ...context.interaction, policies: { ...(scenario.min === undefined ? {} : { min: scenario.min }), ...(scenario.max === undefined ? {} : { max: scenario.max }) }, ...(scenario.controlled ? { value: controlled } : { defaultValue: controlled }), onValueChange: (value) => { if (value !== null) controlled = value; if (scenario.controlled) queueMicrotask(() => connection.syncControlledValues({ value: controlled })); }, onUpdate: render });
  function render(): void { const snapshot = connection.getSnapshot(); output.value = snapshot.state.value === null ? 'No committed date' : `Committed ${formatDateValue(snapshot.state.value)}`; context.showState(snapshot.revision, { value: snapshot.state.value, segment: snapshot.state.inputState.snapshot.selection, ownership: scenario.controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}

function mountTimeField(context: DemoContext, scenario: { initial: TimeValue; step?: number; controlled?: boolean }): DemoSession {
  const shell = fieldShell('Start time', 'HH:mm', Clock3, 'Use ↑ or ↓ on the hour, minute, second, or millisecond segment.', 'Enter a 24-hour time using HH:mm.'); const input = shell.querySelector('input') as HTMLInputElement; const output = shell.querySelector('output') as HTMLOutputElement; context.surface.append(shell);
  let controlled = scenario.initial; let connection: TimeFieldConnection;
  connection = createTimeField({ input, ...context.interaction, policies: scenario.step === undefined ? {} : { step: { minute: scenario.step } }, ...(scenario.controlled ? { value: controlled } : { defaultValue: controlled }), onValueChange: (value) => { if (value !== null) controlled = value; if (scenario.controlled) queueMicrotask(() => connection.syncControlledValues({ value: controlled })); }, onUpdate: render });
  function render(): void { const snapshot = connection.getSnapshot(); output.value = snapshot.state.value === null ? 'No committed time' : `Committed ${formatTimeValue(snapshot.state.value)}`; context.showState(snapshot.revision, { value: snapshot.state.value, segment: snapshot.state.inputState.snapshot.selection, ownership: scenario.controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}

function mountDateTimeField(context: DemoContext, scenario: { initial: DateTimeValue; step?: number; controlled?: boolean }): DemoSession {
  const shell = fieldShell('Local date and time', 'YYYY-MM-DDTHH:mm', CalendarClock, 'Use ↑ or ↓ on the date or time segment. Time changes carry across midnight.', 'Enter a real date and 24-hour time using YYYY-MM-DDTHH:mm.'); const input = shell.querySelector('input') as HTMLInputElement; const output = shell.querySelector('output') as HTMLOutputElement; context.surface.append(shell);
  let controlled = scenario.initial; let connection: DateTimeFieldConnection;
  connection = createDateTimeField({ input, ...context.interaction, policies: scenario.step === undefined ? {} : { step: { minute: scenario.step } }, ...(scenario.controlled ? { value: controlled } : { defaultValue: controlled }), onValueChange: (value) => { if (value !== null) controlled = value; if (scenario.controlled) queueMicrotask(() => connection.syncControlledValues({ value: controlled })); }, onUpdate: render });
  function render(): void { const snapshot = connection.getSnapshot(); output.value = snapshot.state.value === null ? 'No committed date-time' : `Committed ${formatDateTimeValue(snapshot.state.value)}`; context.showState(snapshot.revision, { value: snapshot.state.value, segment: snapshot.state.inputState.snapshot.selection, ownership: scenario.controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}

function mountDatePicker(context: DemoContext, scenario: { initial: DateValue; weekdaysOnly?: boolean; controlled?: boolean }): DemoSession {
  const ui = pickerShell(false); context.surface.append(ui.shell); let controlledValue: DateValue | null = scenario.initial; let controlledHighlight = scenario.initial; let controlledOpen = true; let connection: DatePickerConnection;
  connection = createDatePicker({ root: ui.popup, grid: ui.grid, trigger: ui.trigger, input: ui.startInput, ...context.interaction, policies: scenario.weekdaysOnly ? { unavailable: (value) => [6, 7].includes(isoWeekday(value)) } : {}, ...(scenario.controlled ? { value: controlledValue, highlightedValue: controlledHighlight, open: controlledOpen } : { defaultValue: controlledValue, defaultHighlightedValue: controlledHighlight, defaultOpen: true }), onValueChange: (value) => { controlledValue = value; }, onHighlightedValueChange: (value) => { controlledHighlight = value; }, onOpenChange: (open) => { controlledOpen = open; }, onUpdate: () => { if (scenario.controlled) queueMicrotask(sync); render(); } });
  ui.previous.addEventListener('click', previous); ui.next.addEventListener('click', next); render();
  function previous(): void { connection.handleEvent('previous-month'); } function next(): void { connection.handleEvent('next-month'); }
  function sync(): void { connection.syncControlledValues({ value: controlledValue, highlightedValue: controlledHighlight, open: controlledOpen }); }
  function render(): void { const snapshot = connection.getSnapshot(); renderMonth(ui, connection.getMonth(), snapshot.state.view, snapshot.state.value, snapshot.state.highlighted, (cell, value) => connection.setCellAttributes(cell, value)); connection.refresh(); context.showState(snapshot.revision, { value: snapshot.state.value, highlighted: snapshot.state.highlighted, view: snapshot.state.view, open: snapshot.state.open, ownership: scenario.controlled ? 'controlled' : 'uncontrolled' }); }
  return { focus: () => ui.trigger.focus(), disconnect: () => { ui.previous.removeEventListener('click', previous); ui.next.removeEventListener('click', next); connection.disconnect(); } };
}

function mountRangePicker(context: DemoContext, scenario: { initial: DateRange | null; min?: DateValue; max?: DateValue; controlled?: boolean }): DemoSession {
  const ui = pickerShell(true); context.surface.append(ui.shell); let controlledValue = scenario.initial; let controlledHighlight = scenario.initial?.end ?? date(2026, 8, 22); let controlledOpen = true; let connection: DateRangePickerConnection;
  connection = createDateRangePicker({ root: ui.popup, grid: ui.grid, trigger: ui.trigger, startInput: ui.startInput, ...(ui.endInput === undefined ? {} : { endInput: ui.endInput }), ...context.interaction, policies: { ...(scenario.min === undefined ? {} : { min: scenario.min }), ...(scenario.max === undefined ? {} : { max: scenario.max }) }, ...(scenario.controlled ? { value: controlledValue, highlightedValue: controlledHighlight, open: controlledOpen } : { defaultValue: controlledValue, defaultHighlightedValue: controlledHighlight, defaultOpen: true }), onValueChange: (value) => { controlledValue = value; }, onOpenChange: (open) => { controlledOpen = open; }, onUpdate: () => { const state = connection.getSnapshot().state; controlledHighlight = state.calendar.highlighted; if (scenario.controlled) queueMicrotask(sync); render(); } });
  ui.previous.addEventListener('click', previous); ui.next.addEventListener('click', next); render();
  function previous(): void { connection.handleEvent('previous-month'); } function next(): void { connection.handleEvent('next-month'); }
  function sync(): void { connection.syncControlledValues({ value: controlledValue, highlightedValue: controlledHighlight, open: controlledOpen }); }
  function render(): void { const snapshot = connection.getSnapshot(); const state = snapshot.state; renderMonth(ui, connection.getMonth(), state.calendar.view, state.value, state.calendar.highlighted, (cell, value) => connection.setCellAttributes(cell, value)); connection.refresh(); context.showState(snapshot.revision, { value: state.value, anchor: state.anchor, highlighted: state.calendar.highlighted, view: state.calendar.view, open: state.calendar.open, ownership: scenario.controlled ? 'controlled' : 'uncontrolled' }); }
  return { focus: () => ui.trigger.focus(), disconnect: () => { ui.previous.removeEventListener('click', previous); ui.next.removeEventListener('click', next); connection.disconnect(); } };
}

let fieldID = 0;
function fieldShell(labelText: string, placeholder: string, icon: typeof CalendarDays, hintText: string, errorText: string): HTMLElement { const shell = document.createElement('div'); shell.className = 'temporal-field-shell'; const inputID = `temporal-field-${fieldID += 1}`; const hintID = `${inputID}-hint`; const errorID = `${inputID}-error`; const label = document.createElement('label'); label.htmlFor = inputID; label.textContent = labelText; const control = document.createElement('div'); control.className = 'temporal-field-control'; control.append(createElement(icon)); const input = document.createElement('input'); input.id = inputID; input.placeholder = placeholder; input.setAttribute('aria-describedby', `${hintID} ${errorID}`); control.append(input); const hint = document.createElement('p'); hint.id = hintID; hint.className = 'temporal-field-hint'; hint.textContent = hintText; const error = document.createElement('p'); error.id = errorID; error.className = 'temporal-field-error'; error.setAttribute('role', 'alert'); error.textContent = errorText; const output = document.createElement('output'); shell.append(label, control, hint, error, output); return shell; }

function pickerShell(range: boolean): { shell: HTMLElement; popup: HTMLElement; grid: HTMLElement; trigger: HTMLButtonElement; startInput: HTMLInputElement; endInput?: HTMLInputElement; previous: HTMLButtonElement; next: HTMLButtonElement; title: HTMLElement } {
  const shell = document.createElement('div'); shell.className = 'date-picker-shell'; const fieldRow = document.createElement('div'); fieldRow.className = 'date-picker-fields'; const startInput = document.createElement('input'); startInput.setAttribute('aria-label', range ? 'Range start' : 'Selected date'); fieldRow.append(startInput); let endInput: HTMLInputElement | undefined; if (range) { const separator = document.createElement('span'); separator.textContent = 'to'; endInput = document.createElement('input'); endInput.setAttribute('aria-label', 'Range end'); fieldRow.append(separator, endInput); } const trigger = document.createElement('button'); trigger.className = 'date-picker-trigger secondary'; trigger.append(createElement(CalendarDays)); trigger.setAttribute('aria-label', range ? 'Choose date range' : 'Choose date'); fieldRow.append(trigger);
  const popup = document.createElement('div'); popup.className = 'date-picker-popup'; const nav = document.createElement('div'); nav.className = 'date-picker-navigation'; const previous = iconButton(ChevronLeft, 'Previous month'); const title = document.createElement('h3'); const next = iconButton(ChevronRight, 'Next month'); nav.append(previous, title, next); const weekdaysRow = document.createElement('div'); weekdaysRow.className = 'date-picker-weekdays'; for (const weekday of weekdays) { const cell = document.createElement('span'); cell.textContent = weekday; cell.setAttribute('role', 'columnheader'); weekdaysRow.append(cell); } const grid = document.createElement('div'); grid.className = 'date-picker-grid'; popup.append(nav, weekdaysRow, grid); shell.append(fieldRow, popup); return { shell, popup, grid, trigger, startInput, ...(endInput === undefined ? {} : { endInput }), previous, next, title };
}

function renderMonth(ui: ReturnType<typeof pickerShell>, month: readonly (readonly DateValue[])[], view: { year: number; month: number }, selected: DateValue | DateRange | null, highlighted: DateValue, attributes: (cell: HTMLElement, value: DateValue) => void): void { ui.title.textContent = `${monthNames[view.month - 1]} ${view.year}`; ui.grid.replaceChildren(); for (const week of month) for (const value of week) { const cell = document.createElement('button'); cell.className = ['date-picker-cell', value.month !== view.month ? 'outside' : '', compareDateValues(value, highlighted) === 0 ? 'highlighted' : '', isSelected(selected, value) ? 'selected' : ''].filter(Boolean).join(' '); cell.textContent = String(value.day); cell.setAttribute('aria-label', formatDateValue(value)); attributes(cell, value); ui.grid.append(cell); } }
function isSelected(selected: DateValue | DateRange | null, value: DateValue): boolean { if (selected === null) return false; return 'start' in selected ? compareDateValues(selected.start, value) <= 0 && compareDateValues(value, selected.end) <= 0 : compareDateValues(selected, value) === 0; }
function isoWeekday(value: DateValue): number { return dateDayOfWeek(value); }
function iconButton(icon: typeof ChevronLeft, label: string): HTMLButtonElement { const button = document.createElement('button'); button.className = 'date-picker-nav-button secondary'; button.append(createElement(icon)); button.setAttribute('aria-label', label); return button; }
