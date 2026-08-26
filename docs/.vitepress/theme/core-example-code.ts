const CODE_LINE_LIMIT = 88;

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let quote: "'" | '"' | '`' | null = null;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') roundDepth += 1;
    else if (character === ')') roundDepth -= 1;
    else if (character === '[') squareDepth += 1;
    else if (character === ']') squareDepth -= 1;
    else if (character === '{') curlyDepth += 1;
    else if (character === '}') curlyDepth -= 1;
    else if (character === ',' && roundDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function topLevelColon(value: string): number {
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let quote: "'" | '"' | '`' | null = null;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') quote = character;
    else if (character === '(') roundDepth += 1;
    else if (character === ')') roundDepth -= 1;
    else if (character === '[') squareDepth += 1;
    else if (character === ']') squareDepth -= 1;
    else if (character === '{') curlyDepth += 1;
    else if (character === '}') curlyDepth -= 1;
    else if (character === ':' && roundDepth === 0 && squareDepth === 0 && curlyDepth === 0) return index;
  }
  return -1;
}

function appendComma(lines: string[]): string[] {
  const result = [...lines];
  const lastIndex = result.length - 1;
  const lastLine = result[lastIndex];
  if (lastLine !== undefined) result[lastIndex] = `${lastLine},`;
  return result;
}

function formatCompositeValue(value: string, indent: number): string[] {
  const opening = value[0];
  const closing = value.at(-1);
  if (!((opening === '{' && closing === '}') || (opening === '[' && closing === ']'))) {
    return [`${' '.repeat(indent)}${value}`];
  }

  const entries = splitTopLevel(value.slice(1, -1));
  if (entries.length < 2) return [`${' '.repeat(indent)}${value}`];

  const lines = [`${' '.repeat(indent)}${opening}`];
  for (const entry of entries) {
    const colon = opening === '{' ? topLevelColon(entry) : -1;
    if (colon >= 0) {
      const key = entry.slice(0, colon + 1);
      const nested = entry.slice(colon + 1).trim();
      const nestedLines = formatCompositeValue(nested, indent + 2);
      const firstNestedLine = nestedLines[0];
      if (nestedLines.length > 1 && firstNestedLine !== undefined) {
        nestedLines[0] = `${' '.repeat(indent + 2)}${key} ${firstNestedLine.trimStart()}`;
        lines.push(...appendComma(nestedLines));
        continue;
      }
    }
    lines.push(`${' '.repeat(indent + 2)}${entry},`);
  }
  lines.push(`${' '.repeat(indent)}${closing}`);
  return lines;
}

function formatNamedImport(line: string): string[] | null {
  const match = /^import \{ (.+) \} from ('.+')$/u.exec(line);
  if (match === null || line.length <= CODE_LINE_LIMIT) return null;
  const namesSource = match[1];
  const moduleSpecifier = match[2];
  if (namesSource === undefined || moduleSpecifier === undefined) return null;
  const names = splitTopLevel(namesSource);
  return [
    'import {',
    ...names.map((name) => `  ${name},`),
    `} from ${moduleSpecifier}`,
  ];
}

function formatCallLine(line: string): string[] | null {
  if (line.length <= CODE_LINE_LIMIT) return null;
  const match = /^(.*?[\w$])\((.*)\)(\.value)?;?$/u.exec(line);
  if (match === null) return null;
  const prefix = match[1];
  const argsSource = match[2];
  if (prefix === undefined || argsSource === undefined) return null;
  if (!/^(?:const \w+ = )?[\w$.]+$/u.test(prefix)) return null;
  const args = splitTopLevel(argsSource);
  const firstArgument = args[0];
  const singleComposite = args.length === 1
    && firstArgument !== undefined
    && /^[\[{].*[\]}]$/u.test(firstArgument);
  if (args.length < 2 && !singleComposite) return null;

  const indent = prefix.match(/^\s*/u)?.[0].length ?? 0;
  const lines = [`${prefix}(`];
  for (const argument of args) {
    lines.push(...appendComma(formatCompositeValue(argument, indent + 2)));
  }
  lines.push(`${' '.repeat(indent)})${match[3] ?? ''}`);
  return lines;
}

function formatObjectPropertyLine(line: string): string[] | null {
  if (line.length <= CODE_LINE_LIMIT) return null;
  const match = /^(\s*)([\w$]+:)\s+([\[{].*[\]}]),?$/u.exec(line);
  if (match === null) return null;
  const indent = match[1];
  const property = match[2];
  const value = match[3];
  if (indent === undefined || property === undefined || value === undefined) return null;
  const valueLines = formatCompositeValue(value, indent.length + 2);
  const firstLine = valueLines[0];
  if (firstLine === undefined) return null;
  valueLines[0] = `${indent}${property} ${firstLine.trimStart()}`;
  return line.trimEnd().endsWith(',') ? appendComma(valueLines) : valueLines;
}

function formatCompositeLine(line: string): string[] | null {
  if (line.length <= CODE_LINE_LIMIT) return null;
  const assignment = /^(\s*const \w+ = )([\[{].*[\]}])$/u.exec(line);
  if (assignment !== null) {
    const assignmentPrefix = assignment[1];
    const value = assignment[2];
    if (assignmentPrefix === undefined || value === undefined) return null;
    const indent = assignmentPrefix.match(/^\s*/u)?.[0].length ?? 0;
    const valueLines = formatCompositeValue(value, indent);
    const firstLine = valueLines[0];
    if (firstLine === undefined) return null;
    valueLines[0] = `${assignmentPrefix}${firstLine.trimStart()}`;
    return valueLines;
  }

  const array = /^(\s*)(\[.*\]),?$/u.exec(line);
  if (array === null) return null;
  const indent = array[1];
  const value = array[2];
  if (indent === undefined || value === undefined) return null;
  const valueLines = formatCompositeValue(value, indent.length);
  if (line.trimEnd().endsWith(',')) return appendComma(valueLines);
  return valueLines;
}

function formatCoreExampleSource(source: string): string {
  return source.split('\n').flatMap((line) => (
    formatNamedImport(line)
    ?? formatCallLine(line)
    ?? formatObjectPropertyLine(line)
    ?? formatCompositeLine(line)
    ?? [line]
  )).join('\n');
}

function sequenceExample(
  component: string,
  createState: string,
  applyEvent: string,
  scenario: string,
  options: {
    ids?: readonly string[];
    input?: string;
    event?: string;
    policies?: string;
    createPolicies?: string;
    result?: string;
  } = {},
): string {
  const ids = options.ids ?? ['alpha', 'beta', 'stable'];
  const input = options.input ?? `{ current: '${ids[0]}', selected: ['${ids[0]}'] }`;
  const event = options.event ?? `'next'`;
  const policies = options.policies === undefined ? '' : `, ${options.policies}`;
  const createPolicies = options.createPolicies === undefined ? '' : `, ${options.createPolicies}`;
  const result = options.result ?? 'update.state';
  return `import { ${applyEvent}, ${createState} } from '@sectile/core/${component}'
import { createSequence } from '@sectile/core/sequence'

const options = createSequence(${JSON.stringify(ids)})
const state = ${createState}(options, ${input}${createPolicies})
const update = ${applyEvent}(options, state, ${event}${policies}).value

// ${scenario}: the host owns the returned state and executes emitted commands.
console.log(${result}, update.commands)`;
}

function openExample(component: string, createState: string, applyEvent: string, scenario: string): string {
  const initiallyOpen = ['open', 'initially-open', 'modal', 'non-modal', 'anchored', 'collision', 'controlled'].includes(scenario);
  const event = initiallyOpen ? 'close' : 'open';
  return `import { ${applyEvent}, ${createState} } from '@sectile/core/${component}'

const state = ${createState}(${initiallyOpen})
const update = ${applyEvent}(state, '${event}').value

console.log(update.state.open, update.commands)`;
}

function checkedExample(component: string, createState: string, applyEvent: string, scenario: string): string {
  const mixed = scenario === 'mixed';
  const initial = mixed ? `'mixed'` : scenario === 'on' ? 'true' : 'false';
  const policies = mixed ? ', { allowMixed: true, mixedToggle: true }' : '';
  return `import { ${applyEvent}, ${createState} } from '@sectile/core/${component}'

const state = ${createState}(${initial}${policies})
const update = ${applyEvent}(state, 'toggle'${policies}).value

console.log(update.state, update.commands)`;
}

function menuExample(component: string, prefix: string, scenario: string): string {
  const disabled = scenario === 'disabled' || scenario === 'disabled-root';
  const nested = scenario === 'nested' || scenario === 'application' || scenario === 'product';
  const items = nested
    ? `[
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'open', parentID: 'file' },
  { id: 'help', parentID: null },
]`
    : `[
  { id: 'new', parentID: null },
  { id: 'open', parentID: null },
  { id: 'save', parentID: null },
]`;
  const current = nested ? 'file' : 'new';
  const event = nested ? `'open-submenu'` : `'invoke'`;
  const policies = disabled ? `, { disabled: (id) => id === '${current}' }` : '';
  return `import { apply${prefix}Event, create${prefix}Model, create${prefix}State } from '@sectile/core/${component}'

const model = create${prefix}Model(${items})
const state = create${prefix}State(model.tree, true, '${current}')
const update = apply${prefix}Event(model.tree, state, ${event}${policies}).value

console.log(update.state.openPath, update.commands)`;
}

function dateValuePrelude(): string {
  return `const date = (year, month, day) =>
  createDateValue(year, month, day)`;
}

function datePickerExample(component: string, prefix: string, scenario: string): string {
  const week = scenario === 'week';
  const disabled = scenario === 'weekdays' || scenario === 'disabled-weekends';
  const event = week ? `'next-week'` : scenario.includes('month') ? `'next-month'` : `'next-day'`;
  const policies = disabled ? `, { unavailable: (value) => dateDayOfWeek(value) >= 6 }` : '';
  const imports = disabled
    ? `createDateValue, dateDayOfWeek`
    : `createDateValue`;
  return `import { ${imports} } from '@sectile/temporal/date-field'
import { apply${prefix}Event, create${prefix}State } from '@sectile/core/${component}'

${dateValuePrelude()}
const selected = date(2026, 8, 22)
const state = create${prefix}State({
  value: selected,
  highlighted: selected,
  viewMode: '${week ? 'week' : scenario.includes('year') ? 'year' : 'month'}',
  open: true,
})
const update = apply${prefix}Event(state, ${event}${policies}).value

console.log(update.state.highlighted, update.commands)`;
}

function dateRangePickerExample(component: string, prefix: string, scenario: string): string {
  const bounded = scenario === 'bounded';
  const endDay = scenario.includes('period') ? 30 : 25;
  const policies = bounded ? `, { min: date(2026, 8, 1), max: date(2026, 9, 30) }` : '';
  return `import { createDateRange, createDateValue } from '@sectile/temporal/date-field'
import { apply${prefix}Event, create${prefix}State } from '@sectile/core/${component}'

${dateValuePrelude()}
const start = date(2026, 8, 22)
const range = createDateRange(start, date(2026, 8, ${endDay}))
const state = create${prefix}State({
  value: range,
  calendar: { highlighted: start, viewMode: '${scenario.includes('year') ? 'year' : scenario.includes('month') ? 'year' : 'month'}', open: true },
})
const update = apply${prefix}Event(state, 'next-day'${policies}).value

console.log(update.state.value, update.state.calendar.highlighted)`;
}

function rawCoreExampleCodeFor(component: string, scenario: string): string {
  switch (component) {
    case 'accordion': {
      const multiple = scenario === 'multiple';
      const required = scenario === 'required';
      return sequenceExample(component, 'createAccordionState', 'applyAccordionEvent', scenario, {
        ids: ['general', 'deployments', 'danger-zone'],
        input: `{ current: 'general', openIDs: ['general'] }`,
        event: `{ type: 'toggle', id: '${multiple || required ? 'deployments' : 'general'}' }`,
        policies: `{ expansion: '${multiple ? 'multiple' : 'single'}', collapsible: ${!required} }`,
        createPolicies: `{ expansion: '${multiple ? 'multiple' : 'single'}', collapsible: ${!required} }`,
        result: 'update.state.openIDs',
      });
    }
    case 'alert-dialog':
      return openExample(component, 'createAlertDialogState', 'applyAlertDialogEvent', scenario);
    case 'calendar': {
      const disabled = scenario === 'disabled-weekends';
      return `import { applyCalendarEvent, createCalendarState } from '@sectile/core/calendar'
import { createGrid } from '@sectile/core/grid'

const month = createGrid([
  ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09'],
  ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16'],
])
const state = createCalendarState(month, { current: '2026-08-07', selected: ['2026-08-07'] })
const update = applyCalendarEvent(month, state, '${scenario === 'week' ? 'right' : 'down'}'${disabled ? ", { eligible: (id) => !id.endsWith('08') && !id.endsWith('09') }" : ''}).value

console.log(update.state.cursor.current, update.commands)`;
    }
    case 'carousel': {
      const paused = scenario === 'paused';
      const wrap = scenario !== 'bounded';
      return `import { applyCarouselEvent, createCarouselState, getCarouselPosition } from '@sectile/core/carousel'
import { createSequence } from '@sectile/core/sequence'

const slides = createSequence(['welcome', 'features', 'pricing'])
const state = createCarouselState(slides, '${scenario === 'wrapping' ? 'pricing' : 'features'}', ${paused})
const update = applyCarouselEvent(slides, state, '${paused ? 'resume' : 'next'}', { wrap: ${wrap} }).value

console.log(getCarouselPosition(slides, update.state), update.commands)`;
    }
    case 'cascade-select': {
      const disabled = scenario === 'disabled';
      return `import { applyCascadeSelectEvent, createCascadeSelectState, getCascadeSelectColumns } from '@sectile/core/cascade-select'
import { createTree } from '@sectile/core/tree'

const locations = createTree([
  { id: 'korea', parentID: null },
  { id: 'seoul', parentID: 'korea' },
  { id: 'busan', parentID: 'korea' },
  { id: 'jongno', parentID: 'seoul' },
])
const state = createCascadeSelectState(locations, { open: true, highlighted: 'seoul', path: ['korea'] })
const update = applyCascadeSelectEvent(locations, state, 'right'${disabled ? ", { eligible: (id) => id !== 'busan' }" : ''}).value

console.log(getCascadeSelectColumns(locations, update.state), update.commands)`;
    }
    case 'color-picker': {
      const alpha = scenario === 'alpha';
      const event = alpha ? `{ type: 'set-alpha', value: 0.72 }` : scenario === 'native' ? `{ type: 'set-color', value: '#5865f2' }` : `{ type: 'set-coordinate', format: 'hsl', coordinate: 'hue', value: 245 }`;
      return `import { applyColorPickerEvent, createColorPickerState, formatColorValue } from '@sectile/core/color-picker'

const state = createColorPickerState({ value: '#5865f2', format: '${alpha ? 'rgb' : 'hex'}' }, { allowAlpha: ${alpha} })
const update = applyColorPickerEvent(state, ${event}, { allowAlpha: ${alpha} }).value
const display = formatColorValue(update.state.value, update.state.format).value

console.log(display, update.commands)`;
    }
    case 'checkbox':
      return checkedExample(component, 'createCheckboxState', 'applyCheckboxEvent', scenario);
    case 'checkbox-group':
      if (scenario === 'disabled-choice') {
        return sequenceExample(component, 'createCheckboxGroupState', 'applyCheckboxGroupEvent', scenario, {
          ids: ['stable', 'nightly', 'beta'],
          input: `{ current: 'stable', selected: ['stable'] }`,
          event: `'next'`,
          policies: `{ eligible: (id) => id !== 'nightly' }`,
          result: 'update.state.cursor.current',
        });
      }
      return sequenceExample(component, 'createCheckboxGroupState', 'applyCheckboxGroupEvent', scenario, {
        ids: ['stable', 'beta', 'nightly'],
        input: `{ current: 'stable', selected: ['stable'] }`,
        event: `{ type: 'toggle', id: 'beta' }`,
        policies: '{}',
        result: 'update.state.selection.selected',
      });
    case 'combobox': {
      const contains = scenario === 'contains';
      const ime = scenario === 'ime';
      return `import { applyComboboxEvent, createComboboxState } from '@sectile/core/combobox'
import { createSequence } from '@sectile/core/sequence'
import { createTextEditingState } from '@sectile/core/text'

const options = createSequence(['alpha', 'beta', 'stable'])
const labels = new Map([['alpha', 'Alpha'], ['beta', 'Beta'], ['stable', 'Stable']])
const query = '${ime ? '안정' : contains ? 'ta' : 'st'}'
const text = createTextEditingState(query, {
  anchorCodeUnitOffset: query.length,
  focusCodeUnitOffset: query.length,
})
const state = createComboboxState(options, text, { popupOpen: true, current: 'stable' })
const event = ${scenario === 'controlled' ? "{ type: 'accept', id: 'beta' }" : "'next'"}
const update = applyComboboxEvent(options, labels, state, event, {
  matches: (label, value) => label.toLowerCase().${contains ? 'includes' : 'startsWith'}(value.toLowerCase()),
}).value

console.log(update.state.text.snapshot.text, update.state.selection.selected)`;
    }
    case 'date-field': {
      const bounded = scenario === 'bounded';
      return `import { applyDateFieldEvent, createDateFieldState, createDateValue, formatDateValue } from '@sectile/temporal/date-field'

${dateValuePrelude()}
const state = createDateFieldState(date(2026, 8, 22))
const update = applyDateFieldEvent(state, '${scenario === 'controlled' ? 'increment-segment' : 'decrement-segment'}'${bounded ? ', { min: date(2026, 8, 1), max: date(2026, 8, 31) }' : ''}).value

console.log(update.state.value && formatDateValue(update.state.value), update.commands)`;
    }
    case 'date-range-field': {
      const bounded = scenario === 'bounded';
      return `import { applyDateRangeFieldEvent, createDateRangeFieldState } from '@sectile/temporal/date-range-field'
import { createDateRange, createDateValue } from '@sectile/temporal/date-field'

${dateValuePrelude()}
const range = createDateRange(date(2026, 8, 22), date(2026, 8, 25))
const state = createDateRangeFieldState({ value: range, active: 'end' })
const update = applyDateRangeFieldEvent(state, {
  type: 'field', endpoint: 'end', event: '${scenario === 'controlled' ? 'decrement-segment' : 'increment-segment'}',
}${bounded ? ', { min: date(2026, 8, 1), max: date(2026, 9, 30) }' : ''}).value

console.log(update.state.value, update.commands)`;
    }
    case 'date-time-field': {
      return `import { applyDateTimeFieldEvent, createDateTimeFieldState, createDateTimeValue, formatDateTimeValue } from '@sectile/temporal/date-time-field'
import { createDateValue } from '@sectile/temporal/date-field'
import { createTimeValue } from '@sectile/temporal/time-field'

const value = createDateTimeValue(
  createDateValue(2026, 8, 22),
  createTimeValue(${scenario === 'cross-midnight' ? 23 : 9}, 30),
)
const state = createDateTimeFieldState(value)
const update = applyDateTimeFieldEvent(state, '${scenario === 'controlled' ? 'decrement-segment' : 'increment-segment'}').value

console.log(update.state.value && formatDateTimeValue(update.state.value))`;
    }
    case 'date-time-picker': {
      const morning = scenario === 'morning';
      return `import { applyDateTimePickerEvent, createDateTimePickerState } from '@sectile/temporal/date-time-picker'
import { createDateTimeValue } from '@sectile/temporal/date-time-field'
import { createDateValue } from '@sectile/temporal/date-field'
import { createTimeValue } from '@sectile/temporal/time-field'

const date = createDateValue(2026, 8, 22)
const time = createTimeValue(${morning ? 9 : 13}, 30)
const value = createDateTimeValue(date, time)
const state = createDateTimePickerState({ value, time, calendar: { highlighted: date, open: true } })
const update = applyDateTimePickerEvent(state, '${scenario === 'controlled' ? 'next-day' : 'next-month'}'${morning ? ', { time: { min: createTimeValue(8), max: createTimeValue(12) } }' : ''}).value

console.log(update.state.value, update.commands)`;
    }
    case 'date-time-range-picker': {
      const office = scenario === 'office-hours';
      return `import { applyDateTimeRangePickerEvent, createDateTimeRangePickerState } from '@sectile/temporal/date-time-range-picker'
import { createDateTimeRange, createDateTimeValue } from '@sectile/temporal/date-time-field'
import { createDateValue } from '@sectile/temporal/date-field'
import { createTimeValue } from '@sectile/temporal/time-field'

const startDate = createDateValue(2026, 8, 22)
const endDate = createDateValue(2026, 8, ${office ? 22 : 25})
const startTime = createTimeValue(9, 30)
const endTime = createTimeValue(17, 30)
const value = createDateTimeRange(
  createDateTimeValue(startDate, startTime),
  createDateTimeValue(endDate, endTime),
)
const state = createDateTimeRangePickerState({ value, startTime, endTime, calendar: { highlighted: startDate, open: true } })
const update = applyDateTimeRangePickerEvent(state, { type: 'set-end-time', value: createTimeValue(${office ? 18 : 16}, 0) }).value

console.log(update.state.value, update.commands)`;
    }
    case 'date-picker':
      return datePickerExample(component, 'DatePicker', scenario);
    case 'date-range-picker':
      return dateRangePickerExample(component, 'DateRangePicker', scenario);
    case 'range-calendar':
      return dateRangePickerExample(component, 'RangeCalendar', scenario);
    case 'month-picker':
      return datePickerExample(component, 'MonthPicker', scenario);
    case 'month-range-picker':
      return dateRangePickerExample(component, 'MonthRangePicker', scenario);
    case 'year-picker': {
      return `import { applyYearPickerEvent, createYearPickerPage, createYearPickerState } from '@sectile/temporal/year-picker'
import { createDateValue } from '@sectile/temporal/date-field'

const selected = createDateValue(${scenario === 'planning-window' ? 2028 : 2026}, 1, 1)
const page = createYearPickerPage(selected.year, 12)
const state = createYearPickerState({ value: selected, highlighted: selected, viewMode: 'year', open: true })
const update = applyYearPickerEvent(state, 'next-year').value

console.log(page, update.state.highlighted.year)`;
    }
    case 'year-range-picker':
      return dateRangePickerExample(component, 'YearRangePicker', scenario);
    case 'dialog':
      return openExample(component, 'createDialogState', 'applyDialogEvent', scenario);
    case 'drawer': {
      const side = scenario === 'side' ? 'right' : 'bottom';
      return `import { applyDrawerEvent, createDrawerState } from '@sectile/core/drawer'

const state = createDrawerState(false, '${side}')
const opened = applyDrawerEvent(state, 'open').value
const update = applyDrawerEvent(opened.state, { type: 'set-side', side: '${side}' }).value

console.log(update.state, opened.commands)`;
    }
    case 'disclosure':
      return openExample(component, 'createDisclosureState', 'applyDisclosureEvent', scenario);
    case 'editable': {
      const validated = scenario === 'validated';
      return `import { applyEditableEvent, createEditableState } from '@sectile/core/editable'

const state = createEditableState('Release title', '${validated ? '' : 'Release 0.3'}', true)
const update = applyEditableEvent(state, '${validated ? 'commit' : 'input'}'${validated ? ", { validate: (value) => value.trim() === '' ? 'Title is required' : null }" : ''}).value

console.log(update.state, update.commands)`;
    }
    case 'form': {
      return `import { applyFormEvent, createFormState } from '@sectile/core/form'

const state = createFormState({
  fields: [
    { id: 'name', name: 'name', valid: true },
    { id: 'email', name: 'email', valid: true },
  ],
})

const validation = applyFormEvent(state, {
  type: 'update-field',
  id: 'email',
  touched: true,
  dirty: true,
  valid: false,
  issues: [{
    id: 'email-format',
    fieldId: 'email',
    source: 'field',
    message: 'Enter a valid email address.',
  }],
}).value

const started = applyFormEvent(validation.state, {
  type: 'validation-started',
  trigger: 'submit',
  intent: 'submission',
}).value
const submission = applyFormEvent(started.state, {
  type: 'validation-completed',
  trigger: 'submit',
  intent: 'submission',
}).value

console.log(submission.state.validationStatus, submission.commands)`;
    }
    case 'feed': {
      const direction = scenario === 'load-after' ? 'after' : 'before';
      return `import { applyFeedEvent, createFeedState } from '@sectile/core/feed'
import { createSequence } from '@sectile/core/sequence'

const activities = createSequence(['build-complete', 'review-approved', 'release-published'])
const state = createFeedState(activities, 'review-approved', 7)
const update = applyFeedEvent(activities, state, '${scenario === 'finite' ? 'next' : `request-${direction}`}').value

console.log(update.state.pending, update.commands)`;
    }
    case 'grid': {
      const editable = scenario === 'editable';
      const disabled = scenario === 'disabled-wrap';
      return `import { applyGridEvent, createGrid, createGridState } from '@sectile/core/grid'

const releases = createGrid([
  ['production-name', 'production-status', 'production-version'],
  ['preview-name', 'preview-status', 'preview-version'],
])
const state = createGridState(releases, { current: 'production-name', selected: ['production-name'] })
const update = applyGridEvent(releases, state, '${editable ? 'start-edit' : 'right'}'${disabled ? ", { eligible: (id) => id !== 'production-status', boundary: 'wrap-axis' }" : ''}).value

console.log(update.state, update.commands)`;
    }
    case 'listbox': {
      const multiple = scenario === 'multiple';
      const follow = scenario === 'follow-focus';
      return sequenceExample(component, 'createListboxState', 'applyListboxEvent', scenario, {
        ids: ['stable', 'beta', 'nightly', 'legacy'],
        input: `{ current: 'stable', selected: ['stable'] }`,
        event: scenario === 'controlled' ? `{ type: 'activate', id: 'beta' }` : `'next'`,
        policies: `{ selectionMode: '${multiple ? 'multiple' : 'single'}', selectionFollowsFocus: ${follow}, eligible: (id) => id !== 'legacy' }`,
        result: 'update.state.selection.selected',
      });
    }
    case 'menu':
      return menuExample(component, 'Menu', scenario);
    case 'menu-button':
      return menuExample(component, 'MenuButton', scenario);
    case 'menubar':
      return menuExample(component, 'Menubar', scenario);
    case 'navigation-menu':
      return menuExample(component, 'NavigationMenu', scenario);
    case 'multi-thumb-slider': {
      const three = scenario === 'three-thumb-thresholds';
      const crossing = scenario === 'crossing-thumbs';
      const ids = three ? ['minimum', 'target', 'maximum'] : ['minimum', 'maximum'];
      const ticks = three ? [20, 50, 80] : [25, 75];
      return `import { applyMultiThumbSliderEvent, createMultiThumbSliderState } from '@sectile/core/multi-thumb-slider'
import { createBoundedRange } from '@sectile/core/range'
import { createSequence } from '@sectile/core/sequence'

const thumbs = createSequence(${JSON.stringify(ids)})
const range = createBoundedRange({ min: '0', max: '100', step: '1' })
const state = createMultiThumbSliderState(thumbs, range, ${JSON.stringify(ticks)}, '${ids[0]}', {
  minGap: ${crossing ? 0 : 5}, allowCross: ${crossing},
})
const update = applyMultiThumbSliderEvent(thumbs, range, state, '${scenario === 'controlled-range' ? 'increment' : 'next-thumb'}').value

console.log(update.state.ticks, update.commands)`;
    }
    case 'number-field': {
      const calculator = ['calculator', 'exponent', 'controlled'].includes(scenario);
      const expression = scenario === 'exponent' ? '2^3^2' : scenario === 'calculator' ? '50-20%' : '40.25';
      return `import { applyNumberFieldEvent, ${calculator ? 'createCalculatorExpression, ' : ''}createNumberFieldState } from '@sectile/core/number-field'
import { createTextEditingState } from '@sectile/core/text'

const input = createTextEditingState('${expression}', {
  anchorCodeUnitOffset: ${expression.length}, focusCodeUnitOffset: ${expression.length},
})
const state = createNumberFieldState('${scenario === 'exact-decimal' ? '0.1' : '40.25'}', input)
${calculator ? "const evaluator = createCalculatorExpression({ precision: 12, rounding: 'half-even' })\n" : ''}const update = applyNumberFieldEvent(state, 'commit', {${calculator ? ' evaluator,' : ''}${scenario === 'bounded' ? " min: '0', max: '100'," : ''} }).value

console.log(update.state.value, update.commands)`;
    }
    case 'pagination': {
      const total = scenario === 'long-range' ? 2500 : scenario === 'page-size' ? 347 : 64;
      const items = scenario === 'page-size' ? 25 : 8;
      const event = scenario === 'page-size' ? `{ type: 'set-items-per-page', itemsPerPage: 50 }` : scenario === 'controlled' ? `{ type: 'go-to-page', page: 4 }` : `'next-page'`;
      return `import { applyPaginationEvent, createPaginationModel, createPaginationState, getPaginationItemRange, getPaginationItems } from '@sectile/core/pagination'

const model = createPaginationModel({
  total: ${total}, itemsPerPage: ${items}, siblingCount: ${scenario === 'compact' ? 0 : 1},
  showEdges: ${scenario !== 'pages-only'}, showControls: true,
})
const state = createPaginationState(model, ${scenario === 'long-range' ? 48 : 3})
const update = applyPaginationEvent(model, state, ${event}).value

console.log(getPaginationItemRange(model, update.state).value)
console.log(getPaginationItems(model, update.state).value)`;
    }
    case 'popover':
      return openExample(component, 'createPopoverState', 'applyPopoverEvent', scenario);
    case 'pin-input': {
      const length = scenario === 'custom-length' ? 4 : 6;
      const disabled = scenario === 'disabled';
      const readOnly = scenario === 'readonly';
      const mask = scenario === 'masked';
      const placeholder = scenario === 'placeholders' ? '○' : '·';
      const controlled = scenario === 'controlled';
      const initialValue = readOnly ? '246810' : disabled ? '593174' : '';
      return `import { applyPinInputEvent, createPinInputState } from '@sectile/core/pin-input'

const length = ${length}
const presentation = {
  mask: ${mask},
  placeholder: '${placeholder}',
  autocomplete: '${scenario === 'otp' ? 'one-time-code' : 'off'}',
}
const interaction = { disabled: ${disabled}, readOnly: ${readOnly} }
const state = createPinInputState(length, '${initialValue}')
const accepted = interaction.disabled || interaction.readOnly
  ? state
  : applyPinInputEvent(length, state, { type: 'input', value: '7' }, {
      accept: (value) => /^[0-9]$/.test(value),
    }).value.state
${controlled ? `
// A controlled host accepts the requested value, then recreates Core state.
let value = state.values.join('')
value = accepted.values.join('')
const renderedState = createPinInputState(length, value)
` : '\nconst renderedState = accepted\n'}
const cells = renderedState.values.map((character) => {
  if (character === '') return presentation.placeholder
  return presentation.mask ? '•' : character
})

console.log(cells.join(' '), presentation.autocomplete)`;
    }
    case 'quantity-field': {
      const unit = scenario === 'temperature' ? 'kelvin' : 'metre';
      const displayUnit = scenario === 'temperature' ? 'celsius' : scenario === 'compound' ? 'centimetre' : 'metre';
      return `import { applyQuantityFieldEvent, createQuantityFieldState } from '@sectile/core/quantity-field'
import { createStandardUnitRegistry } from '@sectile/core/units'

const registry = createStandardUnitRegistry()
const policies = { registry, canonicalUnit: '${unit}' }
const state = createQuantityFieldState(policies, { value: '${scenario === 'calculator' ? '12' : scenario === 'temperature' ? '293.15' : '2.5'}', unit: '${unit}' }, '${displayUnit}')
const update = applyQuantityFieldEvent(state, ${scenario === 'controlled' ? "{ type: 'set-display-unit', unit: 'centimetre' }" : "'commit'"}, policies).value

console.log(update.state.quantity, update.commands)`;
    }
    case 'radio-group':
      return sequenceExample(component, 'createRadioGroupState', 'applyRadioGroupEvent', scenario, {
        ids: ['starter', 'team', 'enterprise'],
        input: `{ current: 'starter', selected: ['starter'] }`,
        event: `'next'`,
        policies: scenario === 'horizontal-disabled' ? `{ eligible: (id) => id !== 'enterprise', boundary: 'wrap' }` : `{ boundary: 'stop' }`,
        result: 'update.state.selection.selected',
      });
    case 'rating':
      return sequenceExample(component, 'createRatingState', 'applyRatingEvent', scenario, {
        ids: ['one', 'two', 'three', 'four', 'five'],
        input: scenario === 'required' ? `'three'` : `'four'`,
        event: scenario === 'controlled' ? `{ type: 'set', id: 'five' }` : scenario === 'required' ? `'increase'` : `'clear'`,
        policies: scenario === 'required' ? `{ required: true }` : '{}',
        result: 'update.state.value',
      });
    case 'select':
      return sequenceExample(component, 'createSelectState', 'applySelectEvent', scenario, {
        ids: ['production', 'preview', 'development'],
        input: `{ open: true, value: 'production', current: '${scenario === 'disabled-option' ? 'preview' : 'production'}' }`,
        event: `'next'`,
        policies: scenario === 'disabled-option' ? `{ eligible: (id) => id !== 'preview' }` : '{}',
        result: 'update.state.choice.selection.selected',
      });
    case 'slider':
    case 'window-splitter': {
      const prefix = component === 'slider' ? 'Slider' : 'WindowSplitter';
      const vertical = scenario === 'vertical';
      return `import { apply${prefix}Event, create${prefix}State } from '@sectile/core/${component}'
import { createBoundedRange } from '@sectile/core/range'

const range = createBoundedRange({ min: '0', max: '100', step: '${component === 'window-splitter' ? '5' : '1'}' })
const state = create${prefix}State(range, ${component === 'window-splitter' ? (vertical ? 12 : 8) : (vertical ? 60 : 40)})
const update = apply${prefix}Event(range, state, '${scenario === 'controlled-value' || scenario === 'controlled' ? 'increment' : vertical ? 'decrement' : 'page-up'}', 10).value

console.log(range.valueAt(update.state.tick), update.commands)`;
    }
    case 'spin-button': {
      const invalid = scenario === 'invalid-draft';
      return `import { applySpinButtonEvent, createSpinButtonState } from '@sectile/core/spin-button'
import { createBoundedRange } from '@sectile/core/range'

const range = createBoundedRange({ min: '0', max: '100', step: '1' })
const state = createSpinButtonState(range, '10'${invalid ? ", 'ten'" : ''})
const update = applySpinButtonEvent(range, state, '${invalid ? 'cancel' : 'increment'}').value

console.log(update.state.value, update.state.draft, update.commands)`;
    }
    case 'stepper':
      return sequenceExample(component, 'createStepperState', 'applyStepperEvent', scenario, {
        ids: ['account', 'delivery', 'payment', 'review'],
        input: `'${scenario === 'gated-step' ? 'delivery' : 'account'}', '${scenario === 'gated-step' ? 'delivery' : 'account'}'`,
        event: scenario === 'controlled' ? `{ type: 'activate-step', id: 'delivery' }` : `'next-step'`,
        policies: scenario === 'gated-step' ? `{ eligible: (id) => id !== 'payment' }` : '{}',
        result: 'update.state.value',
      });
    case 'switch':
      return checkedExample(component, 'createSwitchState', 'applySwitchEvent', scenario);
    case 'tabs':
      return sequenceExample(component, 'createTabsState', 'applyTabsEvent', scenario, {
        ids: ['overview', 'changes', 'checks'],
        input: `{ current: 'overview', selected: ['overview'] }`,
        event: `'next'`,
        policies: `{ activation: '${scenario === 'automatic' ? 'automatic' : 'manual'}'${scenario === 'vertical-disabled' ? ", eligible: (id) => id !== 'checks'" : ''} }`,
        result: 'update.state.selection.selected',
      });
    case 'tags-input': {
      const limited = scenario === 'limited';
      return `import { applyTagsInputEvent, createTagsInputState } from '@sectile/core/tags-input'

const state = createTagsInputState(['TypeScript', 'Accessibility'], '${scenario === 'controlled' ? 'Vue' : 'Design systems'}')
const update = applyTagsInputEvent(state, { type: 'add' }, {
  maxTags: ${limited ? 3 : 8}, normalize: (value) => value.trim(), allowDuplicate: false,
}).value

console.log(update.state.tags, update.commands)`;
    }
    case 'text': {
      const text = scenario === 'multiline' ? 'Release notes\nReady to publish' : scenario === 'ime-mixed' ? '한국어 input' : 'Accessible text';
      return `import { applyTextEvent, createTextEditingState } from '@sectile/core/text'

const state = createTextEditingState(${JSON.stringify(text)}, {
  anchorCodeUnitOffset: 0, focusCodeUnitOffset: ${text.length},
})
const replacement = ${scenario === 'controlled' ? "'Published'" : scenario === 'ime-mixed' ? "'한국어와 English'" : scenario === 'multiline' ? "'Release notes\\nPublished'" : "'Text selected by code unit'"}
const update = applyTextEvent(state, {
  type: 'replace',
  startCodeUnitOffset: 0,
  endCodeUnitOffset: ${text.length},
  text: replacement,
  selection: { anchorCodeUnitOffset: replacement.length, focusCodeUnitOffset: replacement.length },
}).value

console.log(update.state.snapshot.text, update.state.snapshot.selection)`;
    }
    case 'time-field': {
      const stepped = scenario === 'stepped';
      return `import { applyTimeFieldEvent, createTimeFieldState, createTimeValue, formatTimeValue } from '@sectile/temporal/time-field'

const state = createTimeFieldState(createTimeValue(9, 30))
const update = applyTimeFieldEvent(state, '${scenario === 'controlled' ? 'decrement-segment' : 'increment-segment'}'${stepped ? ", { step: { minute: 15 } }" : ''}).value

console.log(update.state.value && formatTimeValue(update.state.value), update.commands)`;
    }
    case 'time-range-field': {
      const stepped = scenario === 'stepped';
      return `import { applyTimeRangeFieldEvent, createTimeRange, createTimeRangeFieldState } from '@sectile/temporal/time-range-field'
import { createTimeValue } from '@sectile/temporal/time-field'

const range = createTimeRange(createTimeValue(9, 30), createTimeValue(17, 30))
const state = createTimeRangeFieldState({ value: range, active: 'end' })
const update = applyTimeRangeFieldEvent(state, {
  type: 'field', endpoint: 'end', event: '${scenario === 'controlled' ? 'decrement-segment' : 'increment-segment'}',
}${stepped ? ", { step: { minute: 15 } }" : ''}).value

console.log(update.state.value, update.commands)`;
    }
    case 'timer': {
      const countdown = scenario === 'countdown';
      const target = scenario === 'target';
      const policies = countdown
        ? `{ countdown: true, startMs: 25 * 60_000, targetMs: 0 }`
        : target ? `{ startMs: 0, targetMs: 60 * 60_000 }` : `{ startMs: 0 }`;
      return `import { applyTimerEvent, createTimerState, getTimerParts, getTimerProgress } from '@sectile/core/timer'

const policies = ${policies}
const state = createTimerState(policies, ${countdown ? '25 * 60_000' : '0'}, true)
const update = applyTimerEvent(state, { type: 'tick', elapsedMs: 1_000 }, policies).value

console.log(getTimerParts(update.state.valueMs).value)
console.log(getTimerProgress(update.state, policies).value, update.commands)`;
    }
    case 'toast': {
      const persistent = scenario === 'persistent';
      const limited = scenario === 'limited';
      return `import { applyToastEvent, createToastState } from '@sectile/core/toast'

const policies = { defaultDurationMs: ${persistent ? 'null' : '5_000'}, maxVisible: ${limited ? 2 : 4} }
const state = createToastState([], false, policies)
const update = applyToastEvent(state, {
  type: 'push', toast: {
    id: 'release-saved', title: 'Release saved', kind: 'success',
    description: 'Version 0.3 is ready to publish.', durationMs: ${persistent ? 'null' : '5_000'},
  },
}, policies).value

console.log(update.state.items, update.commands)`;
    }
    case 'toggle-button': {
      const initial = scenario === 'alert';
      return `import { applyToggleButtonEvent, createToggleButtonState } from '@sectile/core/toggle-button'

const state = createToggleButtonState(${initial})
const update = applyToggleButtonEvent(state, 'toggle').value

console.log(update.state.pressed, update.commands)`;
    }
    case 'toggle-group':
      return sequenceExample(component, 'createToggleGroupState', 'applyToggleGroupEvent', scenario, {
        ids: ['left', 'center', 'right'],
        input: `{ current: 'left', selected: ['left'] }`,
        event: `{ type: 'press', id: '${scenario === 'controlled' ? 'right' : 'center'}' }`,
        policies: `{ deselectable: ${scenario === 'multiple'} }`,
        result: 'update.state.selection.selected',
      });
    case 'toolbar':
      return sequenceExample(component, 'createToolbarState', 'applyToolbarEvent', scenario, {
        ids: ['bold', 'italic', 'link'],
        input: `{ current: '${scenario === 'vertical' ? 'italic' : 'bold'}' }`,
        event: scenario === 'controlled-focus' ? `{ type: 'focus', id: 'link' }` : `'next'`,
        policies: `{ boundary: 'wrap' }`,
        result: 'update.state.cursor.current',
      });
    case 'tooltip':
      return openExample(component, 'createTooltipState', 'applyTooltipEvent', scenario);
    case 'tree-grid': {
      const editable = scenario === 'editable';
      return `import { applyTreeGridEvent, createTreeGridModelFromRows, createTreeGridState } from '@sectile/core/tree-grid'

const model = createTreeGridModelFromRows([
  { id: 'workspace', parentID: null, cells: ['workspace-name', 'workspace-status'] },
  { id: 'source', parentID: 'workspace', cells: ['source-name', 'source-status'] },
  { id: 'tests', parentID: 'workspace', cells: ['tests-name', 'tests-status'] },
])
const state = createTreeGridState(model, {
  expanded: ['workspace'], current: '${editable ? 'source-name' : 'workspace-name'}', selected: ['workspace-name'],
})
const update = applyTreeGridEvent(model, state, '${editable ? 'start-edit' : scenario === 'controlled' ? 'select' : 'down'}').value

console.log(update.state, update.commands)`;
    }
    case 'tree-view': {
      const multiple = scenario === 'multiple';
      const unavailable = scenario === 'unavailable';
      return `import { applyTreeViewEvent, createTreeViewState } from '@sectile/core/tree-view'
import { createTree } from '@sectile/core/tree'

const files = createTree([
  { id: 'workspace', parentID: null },
  { id: 'src', parentID: 'workspace' },
  { id: 'components', parentID: 'src' },
  { id: 'tests', parentID: 'workspace' },
])
const state = createTreeViewState(files, {
  expanded: ${scenario === 'collapsed' ? '[]' : "['workspace', 'src']"},
  current: '${unavailable ? 'tests' : 'workspace'}', selected: ${multiple ? "['components', 'tests']" : "['workspace']"},
}, '${multiple ? 'multiple' : 'single'}')
const update = applyTreeViewEvent(files, state, '${scenario === 'collapsed' ? 'right' : multiple ? 'toggle-select' : 'next'}', {
  selectionMode: '${multiple ? 'multiple' : 'single'}',${unavailable ? "\n  eligible: (id) => id !== 'tests'," : ''}
}).value

console.log(update.state.expansion.ids, update.state.selection.selected)`;
    }
    default:
      throw new Error(`Missing Core example for ${component}/${scenario}`);
  }
}

export function coreExampleCodeFor(component: string, scenario: string): string {
  return formatCoreExampleSource(rawCoreExampleCodeFor(component, scenario));
}
