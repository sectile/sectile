import { catalogCodeFor } from './catalog-code.js';
import { coreExampleCodeFor } from './core-example-code.js';
import { domExampleCodeFor } from './dom-demo-code.js';
import { prepareExampleSource } from './example-source-format.js';
import type { Host } from './host-preference.js';
import { numberFieldExampleSources } from './number-field-examples.js';
import { hasSpecializedVueCode, specializedVueCodeFor } from './specialized-example-code.js';

const terminalIntegrationNames: Readonly<Record<string, string>> = Object.freeze({
  accordion: 'Accordion',
  'alert-dialog': 'AlertDialog',
  calendar: 'Calendar',
  carousel: 'Carousel',
  'cascade-select': 'CascadeSelect',
  checkbox: 'Checkbox',
  'checkbox-group': 'CheckboxGroup',
  'color-picker': 'ColorPicker',
  combobox: 'Combobox',
  'date-field': 'DateField',
  'date-picker': 'DatePicker',
  'date-range-field': 'DateRangeField',
  'date-range-picker': 'DateRangePicker',
  'date-time-field': 'DateTimeField',
  'date-time-picker': 'DateTimePicker',
  'date-time-range-picker': 'DateTimeRangePicker',
  dialog: 'Dialog',
  drawer: 'Drawer',
  disclosure: 'Disclosure',
  editable: 'Editable',
  feed: 'Feed',
  grid: 'Grid',
  listbox: 'Listbox',
  menu: 'Menu',
  'menu-button': 'MenuButton',
  menubar: 'Menubar',
  meter: 'Meter',
  'month-picker': 'MonthPicker',
  'month-range-picker': 'MonthRangePicker',
  'multi-thumb-slider': 'MultiThumbSlider',
  'navigation-menu': 'NavigationMenu',
  pagination: 'Pagination',
  popover: 'Popover',
  'quantity-field': 'QuantityField',
  'radio-group': 'RadioGroup',
  'range-calendar': 'RangeCalendar',
  rating: 'Rating',
  select: 'Select',
  slider: 'Slider',
  'spin-button': 'SpinButton',
  stepper: 'Stepper',
  switch: 'Switch',
  tabs: 'Tabs',
  'tags-input': 'TagsInput',
  text: 'Text',
  'time-field': 'TimeField',
  'time-range-field': 'TimeRangeField',
  timer: 'Timer',
  toast: 'Toast',
  'toggle-button': 'ToggleButton',
  'toggle-group': 'ToggleGroup',
  toolbar: 'Toolbar',
  tooltip: 'Tooltip',
  'tree-grid': 'TreeGrid',
  'tree-view': 'TreeView',
  'window-splitter': 'WindowSplitter',
  'year-picker': 'YearPicker',
  'year-range-picker': 'YearRangePicker',
});

function terminalSource(component: string, scenario: string): string {
  if (component === 'form') {
    const formExamples: Readonly<Record<string, string>> = {
      profile: `import { createForm } from '@sectile/terminal/form'

const fields = [
  { id: 'display-name', name: ['profile', 'displayName'], label: 'Display name', required: true },
  { id: 'email', name: ['profile', 'email'], label: 'Email address', required: true },
] as const

const form = createForm({
  fields,
  onSubmit: ({ state }) => console.log('profile saved', state.valid),
  onAnnounceSummary: (issues) => console.log(issues.map(issue => issue.message)),
})

form.handleKeyboardInput({ key: 'tab' })
form.handleKeyboardInput({ key: 'enter' })`,
      notifications: `import { createForm } from '@sectile/terminal/form'

const fields = [
  { id: 'channel', name: ['notifications', 'channel'], label: 'Activity emails', required: true },
  { id: 'digest', name: ['notifications', 'digest'], label: 'Weekly digest' },
] as const

const form = createForm({
  fields,
  onSubmit: ({ state }) => console.log('preferences saved', state.valid),
})

form.handleKeyboardInput({ key: 'tab' })
form.handleKeyboardInput({ key: 'enter' })`,
      'team-invite': `import { createForm } from '@sectile/terminal/form'

const fields = [
  { id: 'invite-email', name: ['invitation', 'email'], label: 'Email address', required: true },
  { id: 'invite-role', name: ['invitation', 'role'], label: 'Role', required: true },
] as const

const form = createForm({
  fields,
  onSubmit: ({ state }) => console.log('invitation sent', state.valid),
})

form.handleKeyboardInput({ key: 'tab' })
form.handleKeyboardInput({ key: 'enter' })`,
    };
    return formExamples[scenario] ?? formExamples['profile'] ?? '';
  }
  if (component === 'pin-input') return pinInputTerminalSource(scenario);
  const name = terminalIntegrationNames[component];
  if (name === undefined) throw new Error(`Missing exact Terminal example: ${component}/${scenario}`);
  const specifier = `@sectile/terminal/${component}`;
  return `import { create${name} } from '${specifier}'

type Control = ReturnType<typeof create${name}>
type State = ReturnType<Control['getSnapshot']>['state']

// Sectile owns state and input semantics; the application owns the terminal UI.
export function draw${name}(control: Control, render: (state: State) => string) {
  const frame = render(control.getSnapshot().state)
  process.stdout.write('\\u001B[2J\\u001B[H' + frame)
}`;
}

function pinInputTerminalSource(scenario: string): string {
  const length = scenario === 'custom-length' ? 4 : 6;
  const masked = scenario === 'masked';
  const placeholder = scenario === 'placeholders' ? '○' : '·';
  const controlled = scenario === 'controlled';
  return `import { createPinInput } from '@sectile/terminal/pin-input'

const length = ${length}
let value = ''
const pinInput = createPinInput({
  length,
${scenario === 'readonly' ? "  defaultValue: '246810',\n" : ''}${scenario === 'disabled' ? "  defaultValue: '593174',\n" : ''}  disabled: ${scenario === 'disabled'},
  readOnly: ${scenario === 'readonly'},
${controlled ? `  value,
  onValueChange: (nextValue) => {
    value = nextValue
    pinInput.syncControlledValue(value)
  },
` : ''}  onUpdate: draw,
})

function draw() {
  const { values, current } = pinInput.getSnapshot().state
  const cells = values.map((character, index) => {
    const visible = character === '' ? '${placeholder}' : ${masked ? "'•'" : 'character'}
    return index === current ? '[' + visible + ']' : ' ' + visible + ' '
  })
  process.stdout.write('\\u001B[2J\\u001B[HVerification code\\n\\n' + cells.join(' '))
}

${scenario === 'otp' ? "// Terminal hosts do not expose browser OTP autocomplete.\nprocess.stdout.write('OTP autocomplete is available only in browser hosts.\\n')\n" : ''}
draw()`;
}

function exactVueSource(component: string, scenario: string): string {
  const source = hasSpecializedVueCode(component)
    ? specializedVueCodeFor(component, scenario)
    : catalogCodeFor(component, scenario);
  if (source === '') throw new Error(`Missing exact Vue example: ${component}/${scenario}`);
  return source;
}

export function componentExampleSources(component: string, scenario: string): Partial<Record<Host, string>> {
  if (component === 'number-field') {
    const numberField = numberFieldExampleSources(scenario);
    return Object.fromEntries(Object.entries({
      ...numberField,
      core: coreExampleCodeFor(component, scenario),
    }).map(([host, source]) => [host, prepareExampleSource(source, host as Host, component, scenario)]));
  }
  const sources: Record<Host, string> = {
    vue: exactVueSource(component, scenario),
    core: coreExampleCodeFor(component, scenario),
    dom: domExampleCodeFor(component, scenario),
    terminal: terminalSource(component, scenario),
  };
  return Object.fromEntries(Object.entries(sources).map(([host, source]) => [
    host,
    prepareExampleSource(source, host as Host, component, scenario),
  ]));
}
