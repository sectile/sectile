import { unwrap } from '@sectile/core/result';
import { createTextEditingState } from '@sectile/core/text';
import { createCalculatorExpression } from '@sectile/core/number-field';
import { compareDateValues, createDateValue, createDateRange, formatDateValue, parseDateValue } from '@sectile/core/date-field';
import { compareTimeValues, createTimeValue, formatTimeValue, parseTimeValue } from '@sectile/core/time-field';
import { compareDateTimeValues, createDateTimeRange, createDateTimeValue, formatDateTimeRange, formatDateTimeValue, parseDateTimeValue } from '@sectile/core/date-time-field';
import {
  createImperialUnitSystem,
  createMetricUnitSystem,
  createStandardUnitRegistry,
} from '@sectile/core/units';
import { createCalendar } from '@sectile/terminal/calendar';
import { createCombobox } from '@sectile/terminal/combobox';
import { createListbox } from '@sectile/terminal/listbox';
import { createSlider } from '@sectile/terminal/slider';
import { createText } from '@sectile/terminal/text';
import { createNumberField } from '@sectile/terminal/number-field';
import { createQuantityField } from '@sectile/terminal/quantity-field';
import { createDateField } from '@sectile/terminal/date-field';
import { createDateTimeField } from '@sectile/terminal/date-time-field';
import { createTimeField } from '@sectile/terminal/time-field';
import { createDatePicker } from '@sectile/terminal/date-picker';
import { createDateRangePicker } from '@sectile/terminal/date-range-picker';
import { createDateTimePicker } from '@sectile/terminal/date-time-picker';
import { createDateTimeRangePicker } from '@sectile/terminal/date-time-range-picker';
import { createRangeCalendar } from '@sectile/terminal/range-calendar';
import { createMonthPicker } from '@sectile/terminal/month-picker';
import { createMonthRangePicker } from '@sectile/terminal/month-range-picker';
import { createYearPicker } from '@sectile/terminal/year-picker';
import { createYearRangePicker } from '@sectile/terminal/year-range-picker';
import { createTreeGrid } from '@sectile/terminal/tree-grid';
import { createTreeView } from '@sectile/terminal/tree-view';
import { createTabs } from '@sectile/terminal/tabs'; import { createRadioGroup } from '@sectile/terminal/radio-group'; import { createToolbar } from '@sectile/terminal/toolbar'; import { createAccordion } from '@sectile/terminal/accordion'; import { createDisclosure } from '@sectile/terminal/disclosure'; import { createCheckbox } from '@sectile/terminal/checkbox'; import { createSwitch } from '@sectile/terminal/switch'; import { createToggleButton } from '@sectile/terminal/toggle-button'; import { createWindowSplitter } from '@sectile/terminal/window-splitter'; import { createSpinButton } from '@sectile/terminal/spin-button'; import { createDialog } from '@sectile/terminal/dialog'; import { createAlertDialog } from '@sectile/terminal/alert-dialog'; import { createTooltip } from '@sectile/terminal/tooltip'; import { createMultiThumbSlider } from '@sectile/terminal/multi-thumb-slider'; import { createGridControl } from '@sectile/terminal/grid'; import { createMenu } from '@sectile/terminal/menu'; import { createMenubar } from '@sectile/terminal/menubar'; import { createMenuButton } from '@sectile/terminal/menu-button'; import { createCarousel } from '@sectile/terminal/carousel'; import { createFeed } from '@sectile/terminal/feed';
import { createCheckboxGroup } from '@sectile/terminal/checkbox-group'; import { createSelect } from '@sectile/terminal/select'; import { createPagination } from '@sectile/terminal/pagination'; import { createStepper } from '@sectile/terminal/stepper'; import { createRating } from '@sectile/terminal/rating'; import { createPinInput } from '@sectile/terminal/pin-input'; import { createTagsInput } from '@sectile/terminal/tags-input';
import { createCascadeSelect } from '@sectile/terminal/cascade-select';
import { createColorPicker } from '@sectile/terminal/color-picker';
import { createDateRangeField } from '@sectile/terminal/date-range-field';
import { createEditable } from '@sectile/terminal/editable';
import { createNavigationMenu } from '@sectile/terminal/navigation-menu';
import { createPopover } from '@sectile/terminal/popover';
import { createTimeRangeField } from '@sectile/terminal/time-range-field';
import { createTimer } from '@sectile/terminal/timer';
import { createToast } from '@sectile/terminal/toast';
import { createToggleGroup } from '@sectile/terminal/toggle-group';
import { createForm } from '@sectile/terminal/form';
import { ansi, plain, styled, terminalCell, terminalInputCursor } from './terminal-demo-ui.mjs';

const terminalCalendarMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});
const terminalCalendarShortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
});
const terminalStandardUnits = createStandardUnitRegistry();
const terminalMetricUnits = createMetricUnitSystem(terminalStandardUnits);
const terminalImperialUnits = createImperialUnitSystem(terminalStandardUnits);

export const demos = Object.freeze([
  { id: 'listbox', label: 'Listbox', description: 'move · typeahead · single/multiple · [/] cases', readOnly: true, create: createListboxDemo },
  { id: 'slider', label: 'Slider', description: 'horizontal · vertical · controlled · [/] cases', readOnly: true, create: createSliderDemo },
  { id: 'calendar', label: 'Calendar', description: 'arrows move · enter select · page up/down', create: createCalendarDemo },
  { id: 'tree-view', label: 'Tree view', description: 'up/down move · left/right collapse/expand · space select', create: createTreeViewDemo },
  { id: 'text', label: 'Text', description: 'type text · backspace/delete edit', readOnly: true, create: createTextDemo },
  { id: 'combobox', label: 'Combobox', description: 'type filter · up/down move · enter accept · esc close', readOnly: true, create: createComboboxDemo },
  { id: 'tree-grid', label: 'Tree grid', description: 'arrows move · alt+left/right or c/o fold · enter edit', readOnly: true, create: createTreeGridDemo },
  { id: 'tabs', label: 'Tabs', description: 'manual · automatic · vertical · [/] cases', create: (host) => createLinearDemo(host, 'tabs') },
  { id: 'radio-group', label: 'Radio group', description: 'orientation · disabled · controlled · [/] cases', readOnly: true, create: (host) => createLinearDemo(host, 'radio-group') },
  { id: 'toolbar', label: 'Toolbar', description: 'focus · invoke · disabled · [/] cases', create: (host) => createLinearDemo(host, 'toolbar') },
  { id: 'accordion', label: 'Accordion', description: 'single · multiple · required · controlled · [/] cases', create: (host) => createAccordionDemo(host) },
  { id: 'disclosure', label: 'Disclosure', description: 'closed · open · controlled · [/] cases', create: (host) => createDisclosureDemo(host) },
  { id: 'checkbox', label: 'Checkbox', description: 'binary · mixed · controlled · [/] cases', readOnly: true, create: (host) => createCheckedDemo(host, 'checkbox') },
  { id: 'switch', label: 'Switch', description: 'off · on · controlled · [/] cases', create: (host) => createCheckedDemo(host, 'switch') },
  { id: 'toggle-button', label: 'Toggle button', description: 'pressed state · controlled · [/] cases', create: (host) => createCheckedDemo(host, 'toggle-button') },
  { id: 'window-splitter', label: 'Window splitter', description: 'horizontal · vertical · controlled · [/] cases', create: createWindowSplitterDemo },
  { id: 'spin-button', label: 'Spin Button', description: 'decimal step · invalid draft · controlled · [/] cases', readOnly: true, create: createSpinButtonDemo },
  { id: 'number-field', label: 'Number field', description: 'exact decimal · expressions · caret · controlled · [/] cases', readOnly: true, create: createNumberFieldDemo },
  { id: 'quantity-field', label: 'Quantity field', description: 'units · affine conversion · expressions · { } cases', readOnly: true, create: createQuantityFieldDemo },
  { id: 'date-field', label: 'Date field', description: 'calendar value · segment focus · commit · [/] cases', readOnly: true, create: createDateFieldDemo },
  { id: 'date-time-field', label: 'Date-time field', description: 'civil date-time · midnight carry · commit · [/] cases', readOnly: true, create: createDateTimeFieldDemo },
  { id: 'time-field', label: 'Time field', description: 'wall-clock value · segment focus · commit · [/] cases', readOnly: true, create: createTimeFieldDemo },
  { id: 'date-picker', label: 'Date picker', description: 'month grid · bounds · single selection · [/] cases', readOnly: true, create: createDatePickerDemo },
  { id: 'date-range-picker', label: 'Date range picker', description: 'range anchor · inclusive selection · [/] cases', readOnly: true, create: createDateRangePickerDemo },
  { id: 'date-time-picker', label: 'Date-time picker', description: 'civil date-time · calendar · wall clock · [/] cases', readOnly: true, create: createDateTimePickerDemo },
  { id: 'date-time-range-picker', label: 'Date-time range picker', description: 'civil range · endpoint times · [/] cases', readOnly: true, create: createDateTimeRangePickerDemo },
  { id: 'range-calendar', label: 'Range calendar', description: 'inclusive range · calendar grid · [/] cases', readOnly: true, create: createRangeCalendarDemo },
  { id: 'month-picker', label: 'Month picker', description: 'month grid · year paging · [/] cases', readOnly: true, create: createMonthPickerDemo },
  { id: 'month-range-picker', label: 'Month range picker', description: 'inclusive month span · year paging · [/] cases', readOnly: true, create: createMonthRangePickerDemo },
  { id: 'year-picker', label: 'Year picker', description: 'year grid · page navigation · [/] cases', readOnly: true, create: createYearPickerDemo },
  { id: 'year-range-picker', label: 'Year range picker', description: 'inclusive year span · page navigation · [/] cases', readOnly: true, create: createYearRangePickerDemo },
  { id: 'dialog', label: 'Dialog', description: 'modal · non-modal · controlled · [/] cases', create: (host) => createPopupDemo(host, 'dialog') },
  { id: 'alert-dialog', label: 'Alert dialog', description: 'destructive · unsaved · controlled · [/] cases', create: (host) => createPopupDemo(host, 'alert-dialog') },
  { id: 'tooltip', label: 'Tooltip', description: 'closed · open · controlled · [/] cases', create: (host) => createPopupDemo(host, 'tooltip') },
  { id: 'multi-thumb-slider', label: 'Multi-thumb slider', description: 'bounded · multi · crossing · controlled · [/] cases', readOnly: true, create: createMultiThumbSliderDemo },
  { id: 'grid', label: 'Grid', description: 'selection · disabled · edit · controlled · [/] cases', readOnly: true, readOnlyCase: 2, create: createGridDemo },
  { id: 'menu', label: 'Menu', description: 'commands · disabled · nested · [/] cases', create: (host) => createMenuDemo(host, 'menu') },
  { id: 'menubar', label: 'Menubar', description: 'application · disabled · typeahead · [/] cases', create: (host) => createMenuDemo(host, 'menubar') },
  { id: 'menu-button', label: 'Menu button', description: 'actions · nested · controlled · [/] cases', create: (host) => createMenuDemo(host, 'menu-button') },
  { id: 'carousel', label: 'Carousel', description: 'wrap · bounded · autoplay · direct select · [/] cases', create: createCarouselDemo },
  { id: 'feed', label: 'Feed', description: 'finite · before/after windows · [/] cases', create: createFeedDemo },
  { id: 'form', label: 'Form', description: 'field focus · validation · submit · reset', create: createFormDemo },
  { id: 'checkbox-group', label: 'Checkbox group', description: 'multiple values · disabled · controlled · [/] cases', readOnly: true, create: createCheckboxGroupDemo },
  { id: 'select', label: 'Select', description: 'open · move · choose · controlled · [/] cases', readOnly: true, create: createSelectDemo },
  { id: 'pagination', label: 'Pagination', description: 'totals · windows · ellipsis · controls · [/] cases', readOnly: true, create: createPaginationDemo },
  { id: 'stepper', label: 'Stepper', description: 'focus steps · activate · disabled · [/] cases', create: createStepperDemo },
  { id: 'rating', label: 'Rating', description: 'ordered score · clearable · controlled · [/] cases', readOnly: true, create: createRatingDemo },
  { id: 'pin-input', label: 'Pin input', description: 'cells · validation · completion · [/] cases', readOnly: true, create: createPinInputDemo },
  { id: 'tags-input', label: 'Tags input', description: 'draft · add/remove · limits · [/] cases', readOnly: true, create: createTagsInputDemo },
  { id: 'cascade-select', label: 'Cascade select', description: 'columns · hierarchy · selection · [/] cases', readOnly: true, create: createCascadeSelectDemo },
  { id: 'color-picker', label: 'Color picker', description: 'channels · formats · text input · [/] cases', readOnly: true, create: createColorPickerDemo },
  { id: 'date-range-field', label: 'Date range field', description: 'start/end · text editing · commit · [/] cases', readOnly: true, create: (host) => createRangeFieldDemo(host, 'date') },
  { id: 'editable', label: 'Editable', description: 'start · type · commit/cancel · [/] cases', readOnly: true, create: createEditableDemo },
  { id: 'navigation-menu', label: 'Navigation menu', description: 'horizontal navigation · nested items · [/] cases', create: createNavigationMenuDemo },
  { id: 'popover', label: 'Popover', description: 'open · close · focus restore · [/] cases', create: (host) => createPopupDemo(host, 'popover') },
  { id: 'time-range-field', label: 'Time range field', description: 'start/end · text editing · commit · [/] cases', readOnly: true, create: (host) => createRangeFieldDemo(host, 'time') },
  { id: 'timer', label: 'Timer', description: 'start · pause · reset · [/] cases', create: createTimerDemo },
  { id: 'toast', label: 'Toast', description: 'push · dismiss · timeout · [/] cases', create: createToastDemo },
  { id: 'toggle-group', label: 'Toggle group', description: 'single · multiple · horizontal · [/] cases', readOnly: true, create: createToggleGroupDemo },
]);

function stateDemo(host, title, result) {
  const connection = unwrap(result);
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines() {
      const { state } = connection.getSnapshot();
      return [`${ansi.bold}${title}${ansi.reset}`, '', ...JSON.stringify(state, null, 2).split('\n')];
    },
  };
}

function createFormDemo(host) {
  const values = { name: 'Mina Kim', email: 'mina@sectile.dev' };
  let notice = 'Tab moves between fields · Enter submits · Backspace edits';
  let connection;
  const issue = (id, message) => ({
    id: `${id}-invalid`,
    fieldId: id,
    source: 'field',
    message,
  });
  const fields = [
    {
      id: 'name',
      name: 'name',
      label: 'Display name',
      validate: () => values.name.trim().length >= 2
        ? { valid: true, issues: [] }
        : { valid: false, issues: [issue('name', 'Enter at least two characters.')] },
      reset: () => { values.name = 'Mina Kim'; },
    },
    {
      id: 'email',
      name: 'email',
      label: 'Email address',
      validate: () => values.email.includes('@')
        ? { valid: true, issues: [] }
        : { valid: false, issues: [issue('email', 'Enter a valid email address.')] },
      reset: () => { values.email = 'mina@sectile.dev'; },
    },
  ];
  connection = createForm({
    fields,
    onSubmit: () => { notice = 'Account settings submitted.'; },
    onAnnounceSummary: (issues) => { notice = issues.map(({ message }) => message).join(' '); },
    onUpdate: host.render,
  });
  return {
    handle(input) {
      if (input.key === 'backspace') {
        const id = connection.currentFieldId;
        if (id === null) return false;
        values[id] = values[id].slice(0, -1);
        return connection.refreshField(id, { dirty: true, touched: true });
      }
      if (input.key.length === 1 && !input.ctrlKey && !input.metaKey) {
        const id = connection.currentFieldId;
        if (id === null) return false;
        values[id] += input.key;
        return connection.refreshField(id, { dirty: true });
      }
      return connection.handleKeyboardInput(input);
    },
    lines(width) {
      const snapshot = connection.getSnapshot();
      return [
        `${ansi.bold}Account settings${ansi.reset}`,
        `${ansi.dim}${notice}${ansi.reset}`,
        '',
        ...fields.map((field) => {
          const current = snapshot.currentFieldId === field.id;
          const state = snapshot.state.fields.find(({ id }) => id === field.id);
          const value = `${field.label.padEnd(16)} ${values[field.id]}`;
          return `${terminalCell(value, Math.min(width, 52), { current })}${state?.valid === false ? `  ${ansi.yellow}invalid${ansi.reset}` : ''}`;
        }),
        '',
        `status=${snapshot.state.status}  valid=${snapshot.state.valid}  submitCount=${snapshot.state.submitCount}`,
        'Field values remain outside the form coordinator.',
      ];
    },
    disconnect: () => connection.destroy(),
  };
}

function createGridDemo(host) {
  const rows = [['plan', 'owner', 'status'], ['build', 'review', 'release']];
  return scenarioDemo(host, [
    { title: 'Selectable release matrix', boundary: 'stop', disabled: [], controlled: false, editable: false },
    { title: 'Wrapping unavailable cells', boundary: 'wrap-axis', disabled: ['review'], controlled: false, editable: false },
    { title: 'Editable ownership matrix', boundary: 'stop', disabled: [], controlled: false, editable: true },
    { title: 'Controlled grid state', boundary: 'stop', disabled: [], controlled: true, editable: true },
  ], (scenario) => {
    let value = null; let highlightedValue = 'plan'; let editMode = 'navigation'; let notice = scenario.editable ? 'Enter starts editing.' : 'Space selects.'; let connection;
    connection = createGridControl({
      ...scenario.interaction,
      rows, policies: { boundary: scenario.boundary }, disabledItems: scenario.disabled,
      ...(scenario.controlled ? {
        value, highlightedValue, editMode,
        onValueChange: (next) => { value = next; queueMicrotask(sync); },
        onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); },
        onEditModeChange: (next) => { editMode = next; queueMicrotask(sync); },
      } : { defaultHighlightedValue: highlightedValue }),
      onEditStart: (id) => { notice = `editing ${id}`; }, onEditCommit: (id) => { notice = `committed ${id}`; }, onEditCancel: (id) => { notice = `cancelled ${id}`; }, onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ value, highlightedValue, editMode }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot(); const cellWidth = Math.max(10, Math.floor((width - 2) / 3));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`, `${ansi.dim}${notice}${ansi.reset}`, '',
          ...rows.map((row) => row.map((id) => scenario.disabled.includes(id)
            ? `${ansi.dim}${plain(`× ${id}`, cellWidth)}${ansi.reset}`
            : `${terminalCell(id, cellWidth, { current: state.cursor.current === id, selected: state.selection.has(id), editing: state.cursor.current === id && state.editMode === 'editing' })}${state.cursor.current === id && state.editMode === 'editing' ? terminalInputCursor : ''}`).join(' ')),
          '', `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}  mode=${state.editMode}`, `boundary=${scenario.boundary}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createCarouselDemo(host) {
  const slides = [
    ['overview', 'Foundation', 'Primitive state and laws'],
    ['adapters', 'Adapters', 'DOM and terminal ownership'],
    ['verification', 'Verification', 'Cross-host parity and examples'],
  ];
  return scenarioDemo(host, [
    { title: 'Wrapping release tour', wrap: true, controlled: false, orientation: 'horizontal' },
    { title: 'Bounded onboarding', wrap: false, controlled: false, orientation: 'horizontal' },
    { title: 'Automatic release tour', wrap: true, controlled: false, orientation: 'horizontal', autoplayDelayMs: 2800 },
    { title: 'Controlled vertical tour', wrap: true, controlled: true, orientation: 'vertical' },
  ], (scenario) => {
    let value = 'overview'; let paused = false; let announced = null; let connection;
    connection = createCarousel({
      ...scenario.interaction,
      slides: slides.map(([id]) => id), policies: { wrap: scenario.wrap }, orientation: scenario.orientation,
      ...(scenario.autoplayDelayMs === undefined ? {} : { autoplay: { delayMs: scenario.autoplayDelayMs, stopOnInteraction: false } }),
      ...(scenario.controlled ? { value, paused, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onPausedChange: (next) => { paused = next; queueMicrotask(sync); } } : { defaultValue: value, defaultPaused: paused }),
      onAnnounce: (id) => { announced = id; }, onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ value, paused }); }
    return {
      handle: (input) => /^[1-3]$/.test(input.key)
        ? connection.handleEvent({ type: 'focus', id: slides[Number(input.key) - 1][0] })
        : connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot(); const slide = slides.find(([id]) => id === state.cursor.current) ?? slides[0]; const position = connection.getPosition();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}${scenario.orientation === 'vertical' ? 'up/down' : 'left/right'} · 1/2/3 select · space pause${ansi.reset}`, '',
          `${ansi.cyan}${ansi.bold}${slide[1]}${ansi.reset}`, plain(slide[2], width), '',
          `${slides.map(([id], index) => id === state.cursor.current ? `●${index + 1}` : `○${index + 1}`).join(' ')}  ${position.index === null ? 0 : position.index + 1}/${position.count}`,
          `current=${state.cursor.current ?? '−'}  wrap=${scenario.wrap}  paused=${state.paused || state.pauseReasons.length > 0}`,
          `autoplay=${scenario.autoplayDelayMs === undefined ? 'off' : `${scenario.autoplayDelayMs}ms`}  announced=${announced ?? '−'}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
      disconnect: () => connection.disconnect(),
    };
  });
}

function createFeedDemo(host) {
  const items = [
    ['r1', 'Primitive laws verified'], ['r2', 'DOM adapter published'], ['r3', 'Terminal adapter published'], ['r4', 'Playground refreshed'], ['r5', 'Cross-host checks passed'],
  ];
  return scenarioDemo(host, [
    { title: 'Finite activity feed', start: 0, size: 5, load: false },
    { title: 'Load newer window', start: 0, size: 3, load: true },
    { title: 'Load earlier window', start: 2, size: 3, load: true },
  ], (scenario) => {
    let start = scenario.start; let revision = 1; let windowIDs = getWindow(); let request = null; let connection;
    connection = createFeed({ ...scenario.interaction, items: windowIDs, revision, onRequestWindow: (direction, anchor) => { request = `${direction} from ${anchor ?? 'none'}`; if (!scenario.load) { connection.handleEvent('clear-request'); return; } start = Math.max(0, Math.min(items.length - scenario.size, start + (direction === 'after' ? 1 : -1))); windowIDs = getWindow(); revision += 1; queueMicrotask(() => connection.syncWindow({ items: windowIDs, revision, highlightedValue: (direction === 'after' ? windowIDs.at(-1) : windowIDs[0]) ?? null })); }, onUpdate: host.render });
    function getWindow() { return items.slice(start, start + scenario.size).map(([id]) => id); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const snapshot = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`, `${ansi.dim}up/down · load-before/load-after${ansi.reset}`, '',
          ...windowIDs.map((id) => terminalCell(items.find(([candidate]) => candidate === id)?.[1] ?? id, Math.min(58, width), { current: snapshot.state.cursor.current === id, selected: false })),
          '', `window=${windowIDs.join(',')}  current=${snapshot.state.cursor.current ?? '−'}`, `revision=${snapshot.state.revision}  pending=${snapshot.state.pending ?? '−'}  request=${request ?? '−'}`,
        ];
      },
    };
  });
}

function createListboxDemo(host) {
  const items = [
    ['alpha', 'Alpha release', 'Stable channel'],
    ['beta', 'Beta release', 'Preview channel'],
    ['nightly', 'Nightly build', 'Latest changes'],
    ['legacy', 'Legacy build', 'Maintenance only'],
  ];
  return scenarioDemo(host, [
    {
      title: 'Single selection & typeahead',
      description: 'one value · Legacy unavailable',
      options: { selectionMode: 'single', defaultValue: ['alpha'], disabledItems: ['legacy'] },
    },
    {
      title: 'Multiple selection',
      description: 'space toggles independent values',
      options: { selectionMode: 'multiple', defaultValue: ['alpha', 'nightly'] },
    },
    {
      title: 'Selection follows focus',
      description: 'movement immediately selects',
      options: { selectionMode: 'single', defaultValue: ['beta'], policies: { selectionFollowsFocus: true } },
    },
    {
      title: 'Controlled selection',
      description: 'application accepts each proposal',
      options: { selectionMode: 'multiple', value: ['beta'], controlled: true },
    },
  ], (scenario) => createListboxScenario(host, items, scenario));
}

function createListboxScenario(host, items, scenario) {
  let activated = null;
  let externalValue = [...(scenario.options.value ?? [])];
  const connection = createListbox({
    ...scenario.interaction,
    items: items.map(([id]) => id),
    selectionMode: scenario.options.selectionMode,
    ...(scenario.options.defaultValue === undefined ? {} : { defaultValue: scenario.options.defaultValue }),
    ...(scenario.options.disabledItems === undefined ? {} : { disabledItems: scenario.options.disabledItems }),
    ...(scenario.options.policies === undefined ? {} : { policies: scenario.options.policies }),
    ...(scenario.options.controlled ? {
      value: externalValue,
      onValueChange: ({ value }) => {
        externalValue = [...value];
        queueMicrotask(() => connection.syncControlledValues({ value: externalValue }));
      },
    } : {}),
    typeahead: { textValue: (id) => items.find(([itemID]) => itemID === id)?.[1] ?? id },
    defaultHighlightedValue: 'alpha',
    onActivate: (id) => { activated = id; },
    onTransition: host.record,
    onUpdate: host.render,
  });
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { state } = connection.getSnapshot();
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}`,
        `${ansi.dim}${scenario.description}${ansi.reset}`,
        '',
        ...items.map(([id, label, detail]) => scenario.options.disabledItems?.includes(id)
          ? `${ansi.dim}${plain(` × ${label}  ${detail}`, Math.min(58, width))}${ansi.reset}`
          : terminalCell(`${label}  ${detail}`, Math.min(58, width), {
            current: state.cursor.current === id,
            selected: state.selection.has(id),
          })),
        '',
        `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}  activated=${activated ?? '−'}`,
      ];
    },
  };
}

function createCheckboxGroupDemo(host) {
  const items = [['stable', 'Stable', 'Production releases'], ['preview', 'Preview', 'Release candidates'], ['nightly', 'Nightly', 'Latest changes']];
  return scenarioDemo(host, [
    { title: 'Release channels', selected: ['stable'], disabled: [], controlled: false },
    { title: 'Unavailable channel', selected: ['stable', 'preview'], disabled: ['nightly'], controlled: false },
    { title: 'Controlled subscriptions', selected: ['preview'], disabled: [], controlled: true },
  ], (scenario) => {
    let value = [...scenario.selected]; let highlightedValue = 'stable'; let connection;
    connection = createCheckboxGroup({ ...scenario.interaction, items: items.map(([id]) => id), disabledItems: scenario.disabled,
      ...(scenario.controlled ? { value, highlightedValue, onValueChange: (change) => { value = [...change.value]; queueMicrotask(sync); }, onHighlightedValueChange: (change) => { highlightedValue = change.value; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ value, highlightedValue }); }
    return { handle: (input) => connection.handleKeyboardInput(input), lines(width) { const { state } = connection.getSnapshot(); return [`${ansi.bold}${scenario.title}${ansi.reset}`, `${ansi.dim}up/down · space toggles independent choices${ansi.reset}`, '', ...items.map(([id, label, detail]) => scenario.disabled.includes(id) ? `${ansi.dim}${plain(`× ${label} — ${detail}`, Math.min(58, width))}${ansi.reset}` : terminalCell(`${state.selection.has(id) ? '☑' : '☐'} ${label} — ${detail}`, Math.min(58, width), { current: state.cursor.current === id, selected: state.selection.has(id) })), '', `selected=${state.selection.selected.join(',') || '−'}  current=${state.cursor.current ?? '−'}`, `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createSelectDemo(host) {
  const items = [['stable', 'Stable'], ['preview', 'Preview'], ['nightly', 'Nightly']];
  return scenarioDemo(host, [
    { title: 'Deployment environment', value: 'stable', disabled: [], controlled: false },
    { title: 'Restricted environment', value: 'preview', disabled: ['nightly'], controlled: false },
    { title: 'Controlled environment', value: 'nightly', disabled: [], controlled: true },
  ], (scenario) => {
    let value = scenario.value; let highlightedValue = scenario.value; let open = false; let connection;
    connection = createSelect({ ...scenario.interaction, items: items.map(([id]) => id), disabledItems: scenario.disabled,
      ...(scenario.controlled ? { value, highlightedValue, open, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); }, onOpenChange: (next) => { open = next; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ value, highlightedValue, open }); }
    return { handle: (input) => connection.handleKeyboardInput(input), lines(width) { const { state } = connection.getSnapshot(); const selected = state.choice.selection.selected[0] ?? null; return [`${ansi.bold}${scenario.title}${ansi.reset}`, `${ansi.dim}up/down opens · enter selects · escape closes${ansi.reset}`, '', `${state.open ? '▾' : '▸'} ${items.find(([id]) => id === selected)?.[1] ?? 'Choose environment'}`, ...(state.open ? items.map(([id, label]) => scenario.disabled.includes(id) ? `${ansi.dim}  × ${label}${ansi.reset}` : terminalCell(`  ${label}`, Math.min(44, width), { current: state.choice.cursor.current === id, selected: state.choice.selection.has(id) })) : []), '', `open=${state.open}  value=${selected ?? '−'}  current=${state.choice.cursor.current ?? '−'}`, `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createPaginationDemo(host) {
  return scenarioDemo(host, [
    { title: 'Compact results', total: 42, itemsPerPage: 10, page: 2, controlled: false },
    { title: 'Long result set', total: 247, itemsPerPage: 10, page: 13, siblingCount: 1, showEdges: true, controlled: false },
    { title: 'Adjustable page size', total: 92, itemsPerPage: 25, page: 2, pageSizes: [10, 25, 50], showEdges: true, controlled: false },
    { title: 'Pages without controls', total: 120, itemsPerPage: 10, page: 6, siblingCount: 1, showEdges: true, showControls: false, controlled: false },
    { title: 'Controlled page', total: 137, itemsPerPage: 20, page: 3, pageSizes: [10, 20, 50], showEdges: true, controlled: true },
  ], (scenario) => {
    let page = scenario.page; let itemsPerPage = scenario.itemsPerPage; let connection;
    connection = createPagination({
      ...scenario.interaction,
      total: scenario.total,
      siblingCount: scenario.siblingCount,
      showEdges: scenario.showEdges,
      showControls: scenario.showControls,
      ...(scenario.controlled
        ? {
            page,
            itemsPerPage,
            onPageChange: (next) => { page = next; queueMicrotask(sync); },
            onItemsPerPageChange: (next) => { itemsPerPage = next; queueMicrotask(sync); },
          }
        : { defaultPage: page, defaultItemsPerPage: itemsPerPage }),
      onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ page, itemsPerPage }); }
    function renderItem(item) {
      if (item.type === 'ellipsis') return `${ansi.dim} … ${ansi.reset}`;
      if (item.type === 'page') return item.selected ? `${ansi.inverse} ${item.page} ${ansi.reset}` : ` ${item.page} `;
      const label = item.control === 'first-page' ? '|<' : item.control === 'previous-page' ? '<' : item.control === 'next-page' ? '>' : '>|';
      return item.disabled ? `${ansi.dim} ${label} ${ansi.reset}` : ` ${label} `;
    }
    return {
      handle: (input) => {
        if (input.text === 'p' && scenario.pageSizes !== undefined) {
          const current = connection.getSnapshot().state.itemsPerPage;
          const index = scenario.pageSizes.indexOf(current);
          return connection.handleEvent({
            type: 'set-items-per-page',
            itemsPerPage: scenario.pageSizes[(index + 1) % scenario.pageSizes.length],
          });
        }
        return connection.handleKeyboardInput(input);
      },
      lines() {
        const { state } = connection.getSnapshot();
        const range = connection.getItemRange();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}←/→ page · Home/End or Ctrl+A/E edges${scenario.pageSizes === undefined ? '' : ' · P page size'}${ansi.reset}`,
          '',
          connection.getItems().map(renderItem).join(' '),
          '',
          `showing=${range.start}–${range.end} of ${range.total}  page=${state.page}/${connection.getPageCount()}`,
          `perPage=${state.itemsPerPage}  edges=${scenario.showEdges === true ? 'yes' : 'no'}  controls=${scenario.showControls === false ? 'no' : 'yes'}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createStepperDemo(host) {
  const items = [
    ['details', 'Details', 'Add contact and delivery information.'],
    ['verify', 'Verify', 'Confirm payment and shipping details.'],
    ['review', 'Review', 'Check the complete order before placing it.'],
  ];
  return scenarioDemo(host, [
    { title: 'Checkout progress', value: 'details', disabled: [], controlled: false },
    { title: 'Gated verification', value: 'details', disabled: ['verify'], controlled: false },
    { title: 'Controlled onboarding', value: 'review', disabled: [], controlled: true },
  ], (scenario) => {
    let value = scenario.value; let highlightedValue = scenario.value; let connection;
    connection = createStepper({ ...scenario.interaction, items: items.map(([id]) => id), disabledItems: scenario.disabled, ...(scenario.controlled ? { value, highlightedValue, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render });
    function sync() { connection.syncControlledValues({ value, highlightedValue }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const selected = state.selection.selected[0] ?? null;
        const selectedIndex = items.findIndex(([id]) => id === selected);
        const focusedIndex = items.findIndex(([id]) => id === state.cursor.current);
        const stepWidth = Math.max(12, Math.min(18, Math.floor((width - 8) / items.length)));
        const progress = items.map(([id, label], index) => {
          const marker = scenario.disabled.includes(id)
            ? '×'
            : index < selectedIndex
              ? '✓'
              : index === selectedIndex
                ? '●'
                : String(index + 1);
          const content = plain(` ${marker} ${label} `, stepWidth);
          if (scenario.disabled.includes(id)) return `${ansi.disabled}${content}${ansi.reset}`;
          if (index === focusedIndex) return `${ansi.current}${content}${ansi.reset}`;
          if (index < selectedIndex) return `${ansi.cyan}${content}${ansi.reset}`;
          return content;
        }).join(`${ansi.dim}──${ansi.reset}`);
        const active = items[Math.max(0, selectedIndex)] ?? items[0];
        const completed = Math.max(0, selectedIndex);
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}←/→ preview step · Enter makes it current${ansi.reset}`,
          '', progress, '',
          `${ansi.bold}Current task · ${active[1]}${ansi.reset}`,
          plain(active[2], Math.max(1, width - 2)),
          '', `progress=${completed}/${items.length} completed  current=${selected ?? '−'}  focused=${state.cursor.current ?? '−'}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createRatingDemo(host) {
  return scenarioDemo(host, [
    { title: 'Product rating', count: 5, value: '4', clearable: true, controlled: false },
    { title: 'Required feedback', count: 5, value: '3', clearable: false, controlled: false },
    { title: 'Controlled score', count: 10, value: '7', clearable: true, controlled: true },
  ], (scenario) => {
    const items = Array.from({ length: scenario.count }, (_, index) => String(index + 1)); let value = scenario.value; let highlightedValue = scenario.value; let connection;
    connection = createRating({ ...scenario.interaction, items, clearable: scenario.clearable, ...(scenario.controlled ? { value, highlightedValue, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render });
    function sync() { connection.syncControlledValues({ value, highlightedValue }); }
    return { handle: (input) => input.key === 'c' ? connection.handleEvent('clear') : connection.handleKeyboardInput(input), lines() { const { state } = connection.getSnapshot(); const selected = Number(state.selection.selected[0] ?? 0); return [`${ansi.bold}${scenario.title}${ansi.reset}`, `${ansi.dim}left/right changes score${scenario.clearable ? ' · c clears' : ''}${ansi.reset}`, '', items.map((id) => Number(id) <= selected ? `${ansi.yellow}★${ansi.reset}` : `${ansi.dim}☆${ansi.reset}`).join(' '), '', `rating=${selected || '−'} of ${scenario.count}  current=${state.cursor.current ?? '−'}`, `clearable=${scenario.clearable}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createPinInputDemo(host) {
  return scenarioDemo(host, [
    { title: 'Verification code', length: 6, value: '', mode: 'numeric', controlled: false },
    { title: 'Four-digit PIN', length: 4, value: '', mode: 'numeric', controlled: false },
    { title: 'Controlled security key', length: 5, value: '', mode: 'alphanumeric', controlled: true },
  ], (scenario) => {
    let value = scenario.value; let completed = null; let connection;
    connection = createPinInput({ ...scenario.interaction, length: scenario.length, policies: { accept: (part) => scenario.mode === 'numeric' ? /^\d$/.test(part) : /^[a-z0-9]$/i.test(part) }, ...(scenario.controlled ? { value, onValueChange: (next) => { value = next; queueMicrotask(() => connection.syncControlledValue(value)); } } : { defaultValue: value }), onComplete: (next) => { completed = next; host.render(); }, onUpdate: host.render });
    return { handle: (input) => connection.handleKeyboardInput(input), lines() { const { state } = connection.getSnapshot(); return [`${ansi.bold}${scenario.title}${ansi.reset}`, `${ansi.dim}type characters · left/right · backspace/delete${ansi.reset}`, '', state.values.map((part, index) => state.current === index ? `${terminalInputCursor}${ansi.inverse} ${part || '·'} ${ansi.reset}` : `[${part || '·'}]`).join(' '), '', `value=${state.values.join('')}  current=${state.current + 1}/${scenario.length}`, `complete=${completed ?? 'no'}  mode=${scenario.mode}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createTagsInputDemo(host) {
  return scenarioDemo(host, [
    { title: 'Project skills', tags: ['TypeScript', 'Accessibility'], maxTags: 8, controlled: false },
    { title: 'Limited labels', tags: ['Bug', 'Urgent'], maxTags: 3, controlled: false },
    { title: 'Controlled recipients', tags: ['Design', 'Platform'], maxTags: 6, controlled: true },
  ], (scenario) => {
    let value = [...scenario.tags]; let inputValue = ''; let connection;
    connection = createTagsInput({ ...scenario.interaction, policies: { maxTags: scenario.maxTags, normalize: (tag) => tag.trim().replace(/\s+/g, ' ') }, ...(scenario.controlled ? { value, inputValue, onValueChange: (next) => { value = [...next]; queueMicrotask(sync); }, onInputValueChange: (next) => { inputValue = next; queueMicrotask(sync); } } : { defaultValue: value }), onUpdate: host.render });
    function sync() { connection.syncControlledValues({ value, inputValue }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines() {
        const { state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}type · enter/comma adds · backspace removes${ansi.reset}`,
          '',
          state.tags.map((tag, index) => state.current === index ? `${ansi.inverse} ${tag} × ${ansi.reset}` : `[${tag} ×]`).join(' ') || `${ansi.dim}No tags${ansi.reset}`,
          '',
          `${ansi.dim}Draft${ansi.reset}  ${state.draft}${terminalInputCursor}`,
          '',
          `tags=${state.tags.length}/${scenario.maxTags}  current=${state.current ?? 'input'}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createCascadeSelectDemo(host) {
  const labels = new Map([
    ['platform', 'Platform'], ['web', 'Web'], ['terminal', 'Terminal'],
    ['product', 'Product'], ['dashboard', 'Dashboard'], ['settings', 'Settings'],
  ]);
  const nodes = [
    { id: 'platform', parentID: null }, { id: 'web', parentID: 'platform' },
    { id: 'terminal', parentID: 'platform' }, { id: 'product', parentID: null },
    { id: 'dashboard', parentID: 'product' }, { id: 'settings', parentID: 'product' },
  ];
  return scenarioDemo(host, [
    { title: 'Destination', initial: 'web', disabled: [] },
    { title: 'Empty destination', initial: null, disabled: [] },
    { title: 'Unavailable terminal target', initial: 'dashboard', disabled: ['terminal'] },
  ], (scenario) => {
    const connection = createCascadeSelect({
      ...scenario.interaction,
      nodes,
      disabledItems: scenario.disabled,
      defaultValue: scenario.initial,
      defaultHighlightedValue: scenario.initial ?? 'platform',
      defaultOpen: true,
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const columns = connection.getColumns();
        const columnWidth = Math.max(14, Math.min(24, Math.floor((width - columns.length + 1) / columns.length)));
        const height = Math.max(...columns.map((column) => column.length));
        const rows = Array.from({ length: height }, (_, row) => columns.map((column) => {
          const id = column[row];
          if (id === undefined) return plain('', columnWidth);
          if (scenario.disabled.includes(id)) return `${ansi.dim}${plain(`× ${labels.get(id)}`, columnWidth)}${ansi.reset}`;
          return terminalCell(labels.get(id) ?? id, columnWidth, { current: state.highlighted === id, selected: state.value === id });
        }).join(' '));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}←/→ columns · ↑/↓ options · Enter select${ansi.reset}`, '',
          ...rows, '',
          `value=${(connection.getValuePath().map((id) => labels.get(id))).join(' / ') || '−'}  open=${state.open}`,
        ];
      },
    };
  });
}

function createColorPickerDemo(host) {
  const formats = ['hex', 'rgb', 'hsl', 'hsv', 'cmyk', 'oklch'];
  return scenarioDemo(host, [
    { title: 'Accent color', value: '#5e73ff', format: 'hex', allowAlpha: true },
    { title: 'Print color', value: '#e35b63', format: 'cmyk', allowAlpha: false },
    { title: 'Perceptual color', value: '#68d5c4', format: 'oklch', allowAlpha: true },
  ], (scenario) => {
    const connection = createColorPicker({
      ...scenario.interaction,
      defaultValue: scenario.value,
      defaultFormat: scenario.format,
      allowAlpha: scenario.allowAlpha,
      onUpdate: host.render,
    });
    return {
      handle(input) {
        if (input.key === 'f') {
          const current = formats.indexOf(connection.getSnapshot().state.format);
          return connection.handleEvent({ type: 'set-format', format: formats[(current + 1) % formats.length] });
        }
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { state } = connection.getSnapshot();
        const barWidth = Math.max(18, Math.min(48, width - 10));
        const value = state.value[state.channel];
        const max = state.channel === 'alpha' ? 255 : 255;
        const position = Math.round(value / max * (barWidth - 1));
        const bar = Array.from({ length: barWidth }, (_, index) => index === position ? '●' : '─').join('');
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}←/→ channel · ↑/↓ value · F format${ansi.reset}`, '',
          `${state.channel.padEnd(7)} [${bar}] ${value}`,
          '', `format=${state.format}  value=${plain(`${connection.getText()}${terminalInputCursor}`, Math.max(1, width - 22))}`,
          `css=${connection.getCSSColor()}`,
        ];
      },
    };
  });
}

function createRangeFieldDemo(host, kind) {
  const rangeScenarios = kind === 'date'
    ? [
      { title: 'Deployment dates', start: '2026-08-22', end: '2026-08-25' },
      {
        title: 'Bounded booking dates',
        start: '2026-09-08',
        end: '2026-09-18',
        policies: {
          min: createDateValue(2026, 9, 1),
          max: createDateValue(2026, 9, 30),
        },
      },
    ]
    : [
      { title: 'Office hours', start: '09:30', end: '17:45' },
      {
        title: 'Quarter-hour schedule',
        start: '09:30',
        end: '17:45',
        policies: { step: { minute: 15 } },
      },
    ];
  return scenarioDemo(host, rangeScenarios, (scenario) => {
    const makeEditing = (text) => createTextEditingState(text, {
      anchorCodeUnitOffset: text.length,
      focusCodeUnitOffset: text.length,
    });
    const startValue = unwrap(kind === 'date' ? parseDateValue(scenario.start) : parseTimeValue(scenario.start));
    const endValue = unwrap(kind === 'date' ? parseDateValue(scenario.end) : parseTimeValue(scenario.end));
    const defaultValue = kind === 'date'
      ? createDateRange(startValue, endValue)
      : Object.freeze({ start: startValue, end: endValue });
    const create = kind === 'date' ? createDateRangeField : createTimeRangeField;
    const connection = create({
      ...scenario.interaction,
      defaultValue,
      defaultStartInputState: makeEditing(scenario.start),
      defaultEndInputState: makeEditing(scenario.end),
      policies: scenario.policies,
      required: scenario.required,
      onUpdate: host.render,
    });
    const segments = temporalSegments(kind);
    return {
      handle(input) {
        const endpoint = connection.getSnapshot().state.active;
        if (input.key === 'left' || input.key === 'right' || input.key === 'home' || input.key === 'end') {
          return moveTemporalSegment(connection, segments, input.key, endpoint);
        }
        const segmentEdit = editTemporalSegment(connection, segments, input, endpoint);
        if (segmentEdit !== null) return segmentEdit;
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { state } = connection.getSnapshot();
        const line = (endpoint) => {
          const current = state.active === endpoint;
          const text = connection.getText(endpoint);
          const display = current
            ? renderTemporalSegments(text, segments, activeTemporalSegment(connection, segments, endpoint))
            : text.replaceAll(' ', '·');
          return `${current ? '▸' : ' '} ${endpoint === 'start' ? 'Start' : 'End  '}  ${display || '—'}${current ? terminalInputCursor : ''}`;
        };
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}Tab endpoint · ←/→ segment · ↑/↓ adjust · Enter commit${ansi.reset}`, '',
          line('start'), line('end'), '',
          `active=${state.active}  segment=${activeTemporalSegment(connection, segments, state.active).label}`,
          `committed=${state.value === null ? '−' : 'yes'}  required=${scenario.required === true}`,
        ];
      },
    };
  });
}

function createEditableDemo(host) {
  return scenarioDemo(host, [
    { title: 'Project name', value: 'Sectile', allowEmpty: false },
    { title: 'Empty description allowed', value: '', allowEmpty: true },
    { title: 'Trimmed label', value: 'Release candidate', allowEmpty: false, normalize: true },
  ], (scenario) => {
    const connection = createEditable({
      ...scenario.interaction,
      defaultValue: scenario.value,
      policies: { allowEmpty: scenario.allowEmpty, ...(scenario.normalize ? { normalize: (value) => value.trim() } : {}) },
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}Enter edit/commit · Escape cancel · type while editing${ansi.reset}`, '',
          state.editing
            ? `${ansi.editing}${plain(` ${state.draft || 'type a value…'}${terminalInputCursor} `, Math.min(56, width))}${ansi.reset}`
            : plain(state.value || '—', Math.min(56, width)),
          '', `mode=${state.editing ? 'editing' : 'preview'}  value=${state.value || '−'}`,
        ];
      },
    };
  });
}

function createNavigationMenuDemo(host) {
  const labels = new Map([['products', 'Products'], ['docs', 'Docs'], ['company', 'Company'], ['core', 'Core'], ['vue', 'Vue'], ['about', 'About']]);
  const items = [
    { id: 'products', parentID: null }, { id: 'core', parentID: 'products' }, { id: 'vue', parentID: 'products' },
    { id: 'docs', parentID: null }, { id: 'company', parentID: null }, { id: 'about', parentID: 'company' },
  ];
  return scenarioDemo(host, [
    { title: 'Product navigation', disabled: [] },
    { title: 'Compact navigation', disabled: ['company'] },
    { title: 'Documentation navigation', disabled: ['products'] },
  ], (scenario) => {
    let invoked = null;
    const connection = createNavigationMenu({
      ...scenario.interaction,
      items,
      disabledItems: scenario.disabled,
      defaultHighlightedValue: 'products',
      typeahead: { textValue: (id) => labels.get(id) ?? id },
      onInvoke: (id) => { invoked = id; host.render(); },
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const roots = items.filter((item) => item.parentID === null);
        const rootLine = roots.map((item) => scenario.disabled.includes(item.id)
          ? `${ansi.dim}[${labels.get(item.id)}]${ansi.reset}`
          : state.cursor.current === item.id ? `${ansi.current} ${labels.get(item.id)} ${ansi.reset}` : ` ${labels.get(item.id)} `).join('  ');
        const children = items.filter((item) => state.openPath.includes(item.parentID));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}←/→ move · ↓ open · Enter invoke${ansi.reset}`, '', rootLine,
          ...(children.length ? ['', ...children.map((item) => terminalCell(labels.get(item.id), Math.min(40, width), { current: state.cursor.current === item.id }))] : []),
          '', `current=${state.cursor.current ?? '−'}  path=${state.openPath.join('/') || '−'}  invoked=${invoked ?? '−'}`,
        ];
      },
    };
  });
}

function createTimerDemo(host) {
  return scenarioDemo(host, [
    { title: 'Elapsed timer', startMs: 0, targetMs: 60_000, countdown: false },
    { title: 'Countdown', startMs: 90_000, targetMs: 0, countdown: true },
    { title: 'Short timer', startMs: 0, targetMs: 10_000, countdown: false },
  ], (scenario) => {
    const connection = createTimer({ ...scenario.interaction, ...scenario, onUpdate: host.render });
    return {
      handle(input) {
        if (input.key === 'right' || input.key === 'up') return connection.tick(1_000);
        if (input.key === 'left' || input.key === 'down') return connection.tick(100);
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { state } = connection.getSnapshot();
        const parts = connection.getParts();
        const time = `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}:${String(parts.seconds).padStart(2, '0')}.${String(parts.milliseconds).padStart(3, '0')}`;
        const progress = connection.getProgress();
        const barWidth = Math.max(12, Math.min(44, width - 12));
        const filled = progress === null ? 0 : Math.round(progress / 100 * barWidth);
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}Space start/pause · arrows tick · R restart · Esc reset${ansi.reset}`, '',
          `${ansi.bold}${time}${ansi.reset}`,
          `[${'█'.repeat(filled)}${'·'.repeat(barWidth - filled)}]`, '',
          `running=${state.running}  completed=${state.completed}  progress=${progress === null ? 'unbounded' : `${Math.round(progress)}%`}`,
        ];
      },
    };
  });
}

function createToastDemo(host) {
  return scenarioDemo(host, [
    {
      title: 'Release notifications',
      durationMs: 5_000,
      maxVisible: 3,
      initial: [{ id: 'ready', title: 'Deployment complete', description: 'Version 0.2.0 is live.', kind: 'success' }],
    },
    {
      title: 'Persistent alert',
      durationMs: null,
      maxVisible: 3,
      initial: [{ id: 'outage', title: 'Service unavailable', description: 'The alert remains until it is dismissed.', kind: 'error' }],
    },
    {
      title: 'Visible notification limit',
      durationMs: 8_000,
      maxVisible: 2,
      initial: [
        { id: 'saved', title: 'Draft saved', description: 'Your changes are available to reviewers.', kind: 'success' },
        { id: 'review', title: 'Review requested', description: 'A teammate asked for your approval.', kind: 'info' },
      ],
    },
  ], (scenario) => {
    let nextID = 1;
    const messages = [
      { title: 'Release saved', description: 'The draft was saved successfully.', kind: 'success' },
      { title: 'Review requested', description: 'A teammate asked for your approval.', kind: 'info' },
      { title: 'Build needs attention', description: 'Open the build log to review the failure.', kind: 'warning' },
    ];
    const connection = createToast({
      ...scenario.interaction,
      initialToasts: scenario.initial,
      defaultDurationMs: scenario.durationMs,
      maxVisible: scenario.maxVisible,
      onUpdate: host.render,
    });
    return {
      handle(input) {
        if (input.key === 'enter' || input.key === 'space') {
          const message = messages[(nextID - 1) % messages.length];
          return connection.push({ id: `new-${nextID++}`, ...message });
        }
        if (input.key === 'delete') return connection.dismissAll();
        if (input.key === 'right') return connection.tick(1_000);
        if (input.key === 'p') return connection.handleEvent(connection.getSnapshot().state.paused ? 'resume' : 'pause');
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { state } = connection.getSnapshot();
        const notificationCount = state.items.length;
        const countLabel = `${notificationCount} notification${notificationCount === 1 ? '' : 's'}`;
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}Enter add · Esc dismiss newest · Delete clear · → advance 1s · P pause${ansi.reset}`, '',
          ...(state.items.length
            ? state.items.flatMap((item, index) => {
                const symbol = item.kind === 'success' ? '✓' : item.kind === 'warning' ? '!' : item.kind === 'error' ? '×' : 'i';
                const style = item.kind === 'warning' ? ansi.yellow : ansi.cyan;
                const lifetime = item.remainingMs === null
                  ? 'stays until dismissed'
                  : `${state.paused ? 'paused at' : 'closes in'} ${(item.remainingMs / 1_000).toFixed(1)}s`;
                return [
                  `${style}${ansi.bold}${symbol} ${item.kind.toUpperCase()}${ansi.reset}`,
                  `  ${ansi.bold}${plain(item.title, Math.max(1, width - 2))}${ansi.reset}`,
                  ...(item.description === null ? [] : [`  ${ansi.dim}${plain(item.description, Math.max(1, width - 2))}${ansi.reset}`]),
                  `  ${ansi.dim}${lifetime}${ansi.reset}`,
                  ...(index === state.items.length - 1 ? [] : ['']),
                ];
              })
            : [`${ansi.dim}No notifications. Press Enter to add one.${ansi.reset}`]),
          '', `${countLabel} · ${scenario.maxVisible} visible max · ${scenario.durationMs === null ? 'manual dismissal' : state.paused ? 'timers paused' : 'timers running'}`,
        ];
      },
    };
  });
}

function createToggleGroupDemo(host) {
  const labels = new Map([['left', 'Align left'], ['center', 'Align center'], ['right', 'Align right']]);
  return scenarioDemo(host, [
    { title: 'Text alignment', multiple: false, initial: ['left'], disabled: [] },
    { title: 'Formatting choices', multiple: true, initial: ['left', 'right'], disabled: [] },
    { title: 'Unavailable center', multiple: false, initial: ['left'], disabled: ['center'] },
  ], (scenario) => {
    const items = ['left', 'center', 'right'];
    const connection = createToggleGroup({
      ...scenario.interaction,
      items,
      multiple: scenario.multiple,
      defaultValue: scenario.initial,
      defaultHighlightedValue: scenario.initial[0],
      disabledItems: scenario.disabled,
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}←/→ move · Space/Enter toggle${ansi.reset}`, '',
          ...items.map((id) => scenario.disabled.includes(id)
            ? `${ansi.dim}${plain(`× ${labels.get(id)}`, Math.min(44, width))}${ansi.reset}`
            : terminalCell(labels.get(id), Math.min(44, width), { current: state.cursor.current === id, selected: state.selection.has(id) })),
          '', `selected=${state.selection.selected.join(',') || '−'}  multiple=${scenario.multiple}`,
        ];
      },
    };
  });
}

function scenarioDemo(host, scenarios, create, options = {}) {
  const previousCaseKey = options.previousCaseKey ?? '[';
  const nextCaseKey = options.nextCaseKey ?? ']';
  const disabledSource = scenarios[0];
  const readOnlySource = scenarios[host.readOnlyCase ?? 0] ?? disabledSource;
  scenarios = [
    ...scenarios,
    ...(disabledSource === undefined ? [] : [{
      ...disabledSource,
      title: 'Disabled state',
      interaction: { disabled: true },
    }]),
    ...(!host.readOnly || readOnlySource === undefined ? [] : [{
      ...readOnlySource,
      title: 'Read-only state',
      interaction: { readOnly: true },
    }]),
  ];
  let index = Math.max(0, Math.min(host.initialCase ?? 0, scenarios.length - 1));
  let session = create(scenarios[index]);
  function prefixLines() {
    const interaction = scenarios[index]?.interaction?.disabled
      ? 'disabled · input rejected'
      : scenarios[index]?.interaction?.readOnly
        ? 'read-only · navigation allowed, mutation rejected'
        : null;
    return [
      ...(host.documentation ? [] : [`${ansi.dim}case ${index + 1}/${scenarios.length} · ${previousCaseKey} / ${nextCaseKey} change case${ansi.reset}`]),
      ...(interaction === null ? [] : [`${ansi.yellow}${interaction}${ansi.reset}`]),
    ];
  }
  return {
    handle(input) {
      if (!host.documentation && (input.key === previousCaseKey || input.key === nextCaseKey)) {
        session.disconnect?.();
        index = (index + (input.key === nextCaseKey ? 1 : -1) + scenarios.length) % scenarios.length;
        session = create(scenarios[index]);
        host.render();
        return true;
      }
      return session.handle(input);
    },
    lines(width) {
      return [
        ...prefixLines(),
        ...session.lines(width),
      ];
    },
    disconnect() { session.disconnect?.(); },
  };
}

function createCheckedDemo(host, kind) {
  const scenarios = kind === 'checkbox'
    ? [
      { title: 'Binary checkbox', initial: false, controlled: false },
      { title: 'Mixed checkbox', initial: 'mixed', controlled: false },
      { title: 'Controlled checkbox', initial: true, controlled: true },
    ]
    : [
      { title: kind === 'switch' ? 'Deployment notifications' : 'Bold formatting', initial: false, controlled: false },
      { title: kind === 'switch' ? 'Deployment notifications' : 'Bold formatting', initial: true, controlled: false },
      { title: kind === 'switch' ? 'Controlled notifications' : 'Controlled formatting', initial: true, controlled: true },
    ];
  return scenarioDemo(host, scenarios, (scenario) => createCheckedScenario(host, kind, scenario));
}

function createLinearDemo(host, kind) {
  const scenarios = kind === 'tabs'
    ? [
      { title: 'Manual activation', orientation: 'horizontal', activation: 'manual', disabledItems: [] },
      { title: 'Automatic activation', orientation: 'horizontal', activation: 'automatic', disabledItems: [] },
      { title: 'Vertical disabled tab', orientation: 'vertical', activation: 'manual', disabledItems: ['changes'] },
    ]
    : kind === 'radio-group'
      ? [
        { title: 'Vertical density', orientation: 'vertical', disabledItems: [], controlled: false },
        { title: 'Horizontal disabled choice', orientation: 'horizontal', disabledItems: ['spacious'], controlled: false },
        { title: 'Controlled density', orientation: 'vertical', disabledItems: [], controlled: true },
      ]
      : [
        { title: 'Formatting toolbar', orientation: 'horizontal', disabledItems: [], controlled: false },
        { title: 'Vertical disabled tool', orientation: 'vertical', disabledItems: ['code'], controlled: false },
        { title: 'Controlled focus', orientation: 'horizontal', disabledItems: [], controlled: true },
      ];
  return scenarioDemo(host, scenarios, (scenario) => createLinearScenario(host, kind, scenario));
}

function createAccordionDemo(host) {
  const scenarios = [
    { title: 'Single collapsible', expansion: 'single', collapsible: true, disabledItems: [], controlled: false },
    { title: 'Multiple sections', expansion: 'multiple', collapsible: true, disabledItems: [], controlled: false },
    { title: 'One section required', expansion: 'single', collapsible: false, disabledItems: ['danger'], controlled: false },
    { title: 'Controlled expansion', expansion: 'multiple', collapsible: true, disabledItems: [], controlled: true },
  ];
  return scenarioDemo(host, scenarios, (scenario) => {
    const sections = [
      { id: 'general', label: 'General', content: 'Workspace defaults and account settings.' },
      { id: 'deployments', label: 'Deployments', content: 'Build targets and release protection.' },
      { id: 'danger', label: 'Danger zone', content: 'Destructive actions and recovery controls.' },
    ];
    const items = sections.map(({ id }) => id);
    let external = ['general'];
    let connection;
    connection = createAccordion({
      ...scenario.interaction,
      items,
      policies: { expansion: scenario.expansion, collapsible: scenario.collapsible },
      disabledItems: scenario.disabledItems,
      ...(scenario.controlled ? {
        openIDs: external,
        onOpenChange: (openIDs) => {
          external = [...openIDs];
          queueMicrotask(() => connection.syncControlledValues({ openIDs: external }));
        },
      } : { defaultOpenIDs: external }),
      defaultHighlightedValue: 'general',
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}${scenario.expansion} · collapsible=${scenario.collapsible}${ansi.reset}`,
          '',
          ...sections.flatMap(({ id, label, content }) => scenario.disabledItems.includes(id)
            ? [`${ansi.dim}${plain(` × ${label}`, Math.min(48, width))}${ansi.reset}`]
            : [
              terminalCell(`${state.has(id) ? '▾' : '▸'} ${label}`, Math.min(48, width), {
                current: state.cursor.current === id,
                selected: state.has(id),
              }),
              ...(state.has(id)
                ? [`${ansi.dim}${plain(`    ${content}`, Math.min(48, width))}${ansi.reset}`]
                : []),
            ]),
          '',
          `current=${state.cursor.current ?? '−'}  open=${state.openIDs.join(',') || '−'}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createDisclosureDemo(host) {
  const scenarios = [
    { title: 'Initially closed', initial: false, controlled: false },
    { title: 'Initially open', initial: true, controlled: false },
    { title: 'Controlled details', initial: false, controlled: true },
  ];
  return scenarioDemo(host, scenarios, (scenario) => {
    let external = scenario.initial;
    let connection;
    connection = createDisclosure({
      ...scenario.interaction,
      ...(scenario.controlled ? {
        open: external,
        onOpenChange: (open) => {
          external = open;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultOpen: scenario.initial }),
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          '',
          `${state.open ? '▾' : '▸'} Advanced deployment options`,
          ...(state.open ? [plain('  Retry limits, rollout windows, health checks.', width)] : []),
          '',
          `open=${state.open}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createLinearScenario(host, kind, scenario) {
  if (kind === 'tabs') {
    const items = ['overview', 'changes', 'checks'];
    const connection = createTabs({
      ...scenario.interaction,
      items,
      defaultValue: 'overview',
      defaultHighlightedValue: 'overview',
      orientation: scenario.orientation,
      disabledItems: scenario.disabledItems,
      policies: { activation: scenario.activation },
      onUpdate: host.render,
    });
    return tabsSession(connection, scenario, items);
  }
  if (kind === 'radio-group') {
    const items = ['compact', 'comfortable', 'spacious'];
    let external = 'comfortable';
    let connection;
    connection = createRadioGroup({
      ...scenario.interaction,
      items,
      orientation: scenario.orientation,
      disabledItems: scenario.disabledItems,
      ...(scenario.controlled ? {
        value: external,
        onValueChange: (value) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValues({ value: external }));
        },
      } : { defaultValue: external }),
      defaultHighlightedValue: external,
      onUpdate: host.render,
    });
    return linearSession(connection, scenario, items, (state, id) => state.selection.has(id));
  }
  const items = ['bold', 'italic', 'code', 'list'];
  let external = 'bold';
  let invoked = null;
  let connection;
  connection = createToolbar({
    ...scenario.interaction,
    items,
    orientation: scenario.orientation,
    disabledItems: scenario.disabledItems,
    ...(scenario.controlled ? {
      highlightedValue: external,
      onHighlightedValueChange: (value) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValue(external));
      },
    } : { defaultHighlightedValue: external }),
    onInvoke: (id) => { invoked = id; },
    onUpdate: host.render,
  });
  return linearSession(connection, scenario, items, () => false, () => `invoked=${invoked ?? '−'}`);
}

const tabContent = Object.freeze({
  overview: Object.freeze({
    label: 'Overview',
    description: 'Release status and rollout summary.',
  }),
  changes: Object.freeze({
    label: 'Changes',
    description: 'Commits, files, and reviewers in this release.',
  }),
  checks: Object.freeze({
    label: 'Checks',
    description: 'Build, test, and accessibility verification.',
  }),
});

function tabsSession(connection, scenario, items) {
  const renderTab = (state, id, cellWidth) => {
    const content = tabContent[id];
    const current = state.cursor.current === id;
    const selected = state.selection.has(id);
    const label = plain(`${current ? '›' : ' '} ${selected ? '●' : ' '} ${content.label}`, cellWidth);
    if (scenario.disabledItems.includes(id)) return `${ansi.disabled}${label}${ansi.reset}`;
    if (current) return `${ansi.current}${label}${ansi.reset}`;
    if (selected) return `${ansi.cyan}${ansi.bold}${label}${ansi.reset}`;
    return label;
  };

  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { state } = connection.getSnapshot();
      const active = state.selection.selected[0] ?? items[0];
      const panel = tabContent[active];
      const frameWidth = Math.max(1, Math.min(64, width));
      const innerWidth = Math.max(1, frameWidth - 2);
      const vertical = scenario.orientation === 'vertical' || frameWidth < 36;
      const controls = vertical
        ? verticalTabs(state, items, innerWidth, renderTab, panel)
        : horizontalTabs(state, items, innerWidth, renderTab, panel);
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}`,
        `${ansi.dim}${scenario.activation} activation · arrows move${scenario.activation === 'manual' ? ' · Enter selects' : ''}${ansi.reset}`,
        '',
        ...controls,
        '',
        `focused=${state.cursor.current ?? '−'}  active=${active}`,
      ];
    },
  };
}

function horizontalTabs(state, items, innerWidth, renderTab, panel) {
  const separators = items.length - 1;
  const available = Math.max(items.length, innerWidth - separators);
  const baseWidth = Math.floor(available / items.length);
  const widths = items.map((_, index) => index === items.length - 1
    ? available - baseWidth * (items.length - 1)
    : baseWidth);
  return [
    `┌${widths.map((cellWidth) => '─'.repeat(cellWidth)).join('┬')}┐`,
    `│${items.map((id, index) => renderTab(state, id, widths[index])).join('│')}│`,
    `├${'─'.repeat(innerWidth)}┤`,
    `│${ansi.bold}${plain(panel.label, innerWidth)}${ansi.reset}│`,
    `│${ansi.dim}${plain(panel.description, innerWidth)}${ansi.reset}│`,
    `└${'─'.repeat(innerWidth)}┘`,
  ];
}

function verticalTabs(state, items, innerWidth, renderTab, panel) {
  const tabWidth = Math.max(10, Math.min(18, Math.floor((innerWidth - 1) / 3)));
  const panelWidth = Math.max(1, innerWidth - tabWidth - 1);
  const panelLines = [panel.label, panel.description, ''];
  return [
    `┌${'─'.repeat(tabWidth)}┬${'─'.repeat(panelWidth)}┐`,
    ...items.map((id, index) => `│${renderTab(state, id, tabWidth)}│${index === 0 ? ansi.bold : ansi.dim}${plain(panelLines[index], panelWidth)}${ansi.reset}│`),
    `└${'─'.repeat(tabWidth)}┴${'─'.repeat(panelWidth)}┘`,
  ];
}

function linearSession(connection, scenario, items, selected, footer = () => '') {
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { state } = connection.getSnapshot();
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}`,
        `${ansi.dim}${scenario.orientation} · disabled=${scenario.disabledItems.join(',') || '−'}${ansi.reset}`,
        '',
        ...items.map((id) => scenario.disabledItems.includes(id)
          ? `${ansi.dim}${plain(` × ${id}`, Math.min(44, width))}${ansi.reset}`
          : terminalCell(id, Math.min(44, width), {
            current: state.cursor.current === id,
            selected: selected(state, id),
          })),
        '',
        `current=${state.cursor.current ?? '−'}${state.selection === undefined ? '' : `  value=${state.selection.selected[0] ?? '−'}`}`,
        footer(),
      ].filter((line) => line.length > 0);
    },
  };
}

function createCheckedScenario(host, kind, scenario) {
  let external = scenario.initial;
  let connection;
  if (kind === 'checkbox') {
    connection = createCheckbox({
      ...scenario.interaction,
      policies: { allowMixed: true },
      ...(scenario.controlled ? {
        value: external,
        onValueChange: (value) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultValue: scenario.initial }),
      onUpdate: host.render,
    });
  } else if (kind === 'switch') {
    connection = createSwitch({
      ...scenario.interaction,
      ...(scenario.controlled ? {
        checked: external,
        onCheckedChange: (value) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultChecked: scenario.initial }),
      onUpdate: host.render,
    });
  } else {
    connection = createToggleButton({
      ...scenario.interaction,
      ...(scenario.controlled ? {
        pressed: external,
        onPressedChange: (value) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultPressed: scenario.initial }),
      onUpdate: host.render,
    });
  }
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { state } = connection.getSnapshot();
      const value = kind === 'toggle-button' ? state.pressed : state.checked;
      const valueName = kind === 'toggle-button' ? 'pressed' : kind === 'switch' ? 'checked' : 'value';
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}`,
        '',
        ...checkedControlLines(kind, value, width),
        '',
        `${valueName}=${String(value)}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
      ];
    },
  };
}

function checkedControlLines(kind, value, width) {
  if (kind === 'checkbox') {
    const marker = value === true ? '[x]' : value === 'mixed' ? '[-]' : '[ ]';
    return [`${marker} ${plain('Include analytics', Math.max(1, width - 4))}`];
  }

  if (kind === 'switch') {
    const checked = value === true;
    const track = checked
      ? `${ansi.cyan}[──●] ON${ansi.reset}`
      : `${ansi.dim}[●──] OFF${ansi.reset}`;
    return [`Deployment notifications  ${track}`];
  }

  const pressed = value === true;
  const innerWidth = Math.max(16, Math.min(28, width - 4));
  const content = plain(' B  Bold formatting', innerWidth);
  return [
    `┌${'─'.repeat(innerWidth)}┐`,
    pressed
      ? `${ansi.inverse}│${content}│${ansi.reset}  pressed`
      : `│${content}│  released`,
    `└${'─'.repeat(innerWidth)}┘`,
  ];
}

function createSliderDemo(host) {
  return scenarioDemo(host, [
    { title: 'Deployment traffic', min: '0', max: '100', step: '5', initial: 8, orientation: 'horizontal', suffix: '%', controlled: false },
    { title: 'Vertical temperature', min: '-10', max: '30', step: '5', initial: 4, orientation: 'vertical', suffix: '°', controlled: false },
    { title: 'Controlled volume', min: '0', max: '10', step: '1', initial: 6, orientation: 'horizontal', suffix: '0%', controlled: true },
  ], (scenario) => createSliderScenario(host, scenario));
}

function createSliderScenario(host, scenario) {
  let external = scenario.initial;
  let connection;
  connection = createSlider({
    ...scenario.interaction,
    min: scenario.min, max: scenario.max, step: scenario.step, page: 4,
    ...(scenario.controlled ? {
      value: external,
      onValueChange: ({ value }) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValues({ value: external }));
      },
    } : { defaultValue: scenario.initial }),
    onTransition: host.record,
    onUpdate: host.render,
  });
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { state } = connection.getSnapshot();
      const barWidth = Math.max(10, Math.min(48, width - 4));
      const fill = connection.range.count === 0 ? 0 : Math.round(barWidth * state.tick / connection.range.count);
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}`,
        `${ansi.dim}${scenario.orientation} · ${scenario.controlled ? 'controlled' : 'uncontrolled'}${ansi.reset}`,
        '', styled(ansi.cyan, `${connection.getValue()}${scenario.suffix}`, Math.min(width, 16)),
        `[${'█'.repeat(fill)}${'·'.repeat(barWidth - fill)}]`,
        `${connection.range.lower}`.padEnd(barWidth - String(connection.range.upper).length + 2) + connection.range.upper,
        '', `tick=${state.tick}  value=${connection.getValue()}`,
      ];
    },
  };
}

function createWindowSplitterDemo(host) {
  return scenarioDemo(host, [
    { title: 'Editor split', orientation: 'horizontal', initial: 55, controlled: false },
    { title: 'Console split', orientation: 'vertical', initial: 62, controlled: false },
    { title: 'Controlled sidebar', orientation: 'horizontal', initial: 32, controlled: true },
  ], (scenario) => {
    let external = scenario.initial;
    let connection;
    connection = createWindowSplitter({
      ...scenario.interaction,
      min: '0', max: '100', step: '1',
      ...(scenario.controlled ? {
        value: external,
        onValueChange: ({ value }) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValues({ value: external }));
        },
      } : { defaultValue: scenario.initial }),
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const barWidth = Math.max(12, Math.min(48, width - 4));
        const first = Math.round(barWidth * state.tick / 100);
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}${scenario.orientation} · ${scenario.controlled ? 'controlled' : 'uncontrolled'}${ansi.reset}`,
          '', `[${'A'.repeat(first)}│${'B'.repeat(barWidth - first)}]`, '', `first=${connection.getValue()}%  second=${100 - Number(connection.getValue())}%`,
        ];
      },
    };
  });
}

function createSpinButtonDemo(host) {
  return scenarioDemo(host, [
    { title: 'Guest count', min: '1', max: '12', step: '1', initial: '1', draft: null, controlled: false },
    { title: 'Invalid draft', min: '0', max: '10', step: '1', initial: '4', draft: '4.5', controlled: false },
    { title: 'Controlled precision', min: '0', max: '10', step: '0.25', initial: '6.5', draft: null, controlled: true },
  ], (scenario) => {
    let externalValue = scenario.initial;
    let externalDraft = scenario.draft;
    let connection;
    connection = createSpinButton({
      ...scenario.interaction,
      min: scenario.min, max: scenario.max, step: scenario.step, policies: { page: 3 },
      ...(scenario.controlled ? {
        value: externalValue, draft: externalDraft,
        onValueChange: (value) => { externalValue = value; queueMicrotask(sync); },
        onDraftChange: (draft) => { externalDraft = draft; queueMicrotask(sync); },
      } : { defaultValue: scenario.initial, defaultDraft: scenario.draft }),
      onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ value: externalValue, draft: externalDraft }); }
    return {
      handle(input) {
        if (input.key.length === 1 && !input.ctrlKey && !input.metaKey) return connection.handleTextInput(input.key);
        return connection.handleKeyboardInput(input);
      },
      lines() {
        const { state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}type draft · Enter commit · Escape cancel${ansi.reset}`,
          '', `[-]  ${styled(ansi.cyan, `${connection.getText()}${terminalInputCursor}`, 12)}  [+]`, '',
          `value=${state.value}  draft=${state.draft ?? '−'}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createNumberFieldDemo(host) {
  const evaluator = createCalculatorExpression({ precision: 12, rounding: 'half-even' });
  return scenarioDemo(host, [
    { title: 'Exact decimal input', initial: '0.1', draft: null, policies: {}, controlled: false, detail: 'decimal text stays exact without binary floating-point coercion' },
    { title: 'Calculator percentage', initial: '50', draft: '50-20%', policies: { evaluator }, controlled: false, detail: '50-20% commits 40' },
    { title: 'Exponent expression', initial: '2', draft: '2^3^2', policies: { evaluator }, controlled: false, detail: '^ is right-associative' },
    { title: 'Bounded decimal', initial: '40.25', draft: null, policies: { min: '0', max: '100' }, controlled: false, detail: 'committed values stay between 0 and 100' },
    { title: 'Controlled calculation', initial: '1', draft: '1/3', policies: { evaluator }, controlled: true, detail: 'external value and input ownership' },
  ], (scenario) => {
    let externalValue = scenario.initial;
    let externalInput = numberFieldEditing(scenario.draft ?? scenario.initial);
    let connection;
    connection = createNumberField({
      ...scenario.interaction,
      policies: scenario.policies,
      ...(scenario.controlled ? {
        value: externalValue,
        inputState: externalInput,
        onValueChange: ({ value }) => { externalValue = value; queueMicrotask(sync); },
        onInputStateChange: ({ value }) => { externalInput = value; queueMicrotask(sync); },
      } : {
        defaultValue: scenario.initial,
        ...(scenario.draft === null ? {} : { defaultInputState: numberFieldEditing(scenario.draft) }),
      }),
      onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ value: externalValue, inputState: externalInput }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const text = connection.getText();
        const caret = connection.getCaret();
        const editing = `${text.slice(0, caret)}${terminalInputCursor}${ansi.cyan}│${ansi.reset}${text.slice(caret)}`;
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}${scenario.detail} · Enter commit · Escape cancel${ansi.reset}`,
          '', plain(editing, Math.max(1, width - 2)), '',
          `value=${state.value ?? '−'}  input=${state.inputState.snapshot.text || '−'}  caret=${caret}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createQuantityFieldDemo(host) {
  const evaluator = createCalculatorExpression({ precision: 12, rounding: 'half-even' });
  return scenarioDemo(host, [
    {
      title: 'Metric length', registry: terminalStandardUnits, unitSystem: terminalMetricUnits, canonicalUnit: 'metre',
      quantity: { value: '1', unit: 'metre' }, displayUnit: null, evaluator: null,
      draft: null, controlled: false, detail: 'Enter 150cm or 12in',
    },
    {
      title: 'Affine temperature', registry: terminalStandardUnits, unitSystem: terminalMetricUnits, canonicalUnit: 'kelvin',
      quantity: { value: '295.15', unit: 'kelvin' }, displayUnit: null, evaluator: null,
      draft: null, controlled: false, detail: 'Enter 22°C or 32°F',
    },
    {
      title: 'Unit calculator', registry: terminalStandardUnits, unitSystem: terminalMetricUnits, canonicalUnit: 'metre',
      quantity: { value: '0.5', unit: 'metre' }, displayUnit: 'centimetre', evaluator,
      draft: '100-20% cm', controlled: false, detail: 'Expressions and units work together',
    },
    {
      title: 'Compound acceleration', registry: terminalStandardUnits, unitSystem: terminalMetricUnits,
      canonicalUnit: 'metre-per-second-squared', quantity: { value: '9.8', unit: 'metre-per-second-squared' },
      displayUnit: null, evaluator: null, draft: '9.8 m/s²', controlled: false,
      detail: 'Enter values such as 9.8 m/s²',
    },
    {
      title: 'Controlled imperial quantity', registry: terminalStandardUnits, unitSystem: terminalImperialUnits,
      canonicalUnit: 'metre', quantity: { value: '1.2', unit: 'metre' }, displayUnit: null, evaluator,
      draft: null, controlled: true, detail: 'The application owns the value',
    },
  ], (scenario) => {
    const initialUnit = scenario.displayUnit
      ?? scenario.unitSystem.getDefaultUnit(scenario.canonicalUnit)
      ?? scenario.canonicalUnit;
    const initialText = scenario.draft ?? unwrap(scenario.registry.convert(
      scenario.quantity.value, scenario.quantity.unit, initialUnit,
    )).value;
    let externalQuantity = scenario.quantity;
    let externalUnit = initialUnit;
    let externalInput = numberFieldEditing(initialText);
    let connection;
    connection = createQuantityField({
      ...scenario.interaction,
      policies: {
        registry: scenario.registry,
        canonicalUnit: scenario.canonicalUnit,
        unitSystem: scenario.unitSystem,
        ...(scenario.evaluator === null ? {} : { evaluator: scenario.evaluator }),
      },
      ...(scenario.controlled ? {
        quantity: externalQuantity,
        displayUnit: externalUnit,
        inputState: externalInput,
        onQuantityChange: ({ value }) => { externalQuantity = value; queueMicrotask(sync); },
        onDisplayUnitChange: (unit) => { externalUnit = unit; queueMicrotask(sync); },
        onInputStateChange: (value) => { externalInput = value; queueMicrotask(sync); },
      } : {
        defaultQuantity: scenario.quantity,
        ...(scenario.displayUnit === null ? {} : { defaultDisplayUnit: scenario.displayUnit }),
        ...(scenario.draft === null ? {} : { defaultInputState: numberFieldEditing(scenario.draft) }),
      }),
      onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ quantity: externalQuantity, displayUnit: externalUnit, inputState: externalInput }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const text = connection.getText();
        const caret = connection.getCaret();
        const editing = `${text.slice(0, caret)}${terminalInputCursor}${ansi.cyan}│${ansi.reset}${text.slice(caret)}`;
        const displaySymbol = scenario.registry.get(state.displayUnit)?.symbol ?? state.displayUnit;
        const canonicalSymbol = scenario.registry.get(scenario.canonicalUnit)?.symbol ?? scenario.canonicalUnit;
        if (host.documentation) {
          const includesUnit = /[^\d\s.,+\-*/^()%]$/u.test(text.trim());
          return [
            `${ansi.bold}${scenario.title}${ansi.reset}`,
            `${ansi.dim}${scenario.detail}${ansi.reset}`,
            '', `${editing}${includesUnit ? '' : ` ${ansi.cyan}${displaySymbol}${ansi.reset}`}`, '',
            `${ansi.dim}Accepted:${ansi.reset} ${state.quantity?.value ?? '−'} ${canonicalSymbol}`,
          ];
        }
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}${scenario.detail} · [ / ] unit · Enter commit${ansi.reset}`,
          '', `${plain(editing, Math.max(1, width - 10))}  ${styled(ansi.cyan, displaySymbol, 4)}`, '',
          `canonical=${state.quantity?.value ?? '−'} ${canonicalSymbol}  display=${state.displayUnit}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  }, { previousCaseKey: '{', nextCaseKey: '}' });
}

function createDateFieldDemo(host) {
  const value = createDateValue(2026, 8, 22);
  return scenarioDemo(host, [
    { title: 'Calendar date', value, controlled: false, policies: {}, detail: 'timezone-free YYYY-MM-DD' },
    { title: 'Booking deadline', value, controlled: false, policies: { min: createDateValue(2026, 8, 18), max: createDateValue(2026, 9, 30) }, detail: 'bounded 2026-08-18–2026-09-30' },
    { title: 'Controlled date', value, controlled: true, policies: {}, detail: 'external value ownership' },
  ], (scenario) => createTerminalTemporalField(host, scenario, 'date'));
}

function createTimeFieldDemo(host) {
  const morning = createTimeValue(9, 30);
  return scenarioDemo(host, [
    { title: 'Wall-clock time', value: morning, controlled: false, policies: {}, detail: '24-hour HH:mm' },
    { title: '15-minute schedule', value: createTimeValue(10, 15), controlled: false, policies: { step: { minute: 15 } }, detail: 'segment-aware stepping' },
    { title: 'Controlled time', value: createTimeValue(14, 0), controlled: true, policies: {}, detail: 'external value ownership' },
  ], (scenario) => createTerminalTemporalField(host, scenario, 'time'));
}

function createDateTimeFieldDemo(host) {
  const at = (year, month, day, hour, minute) => createDateTimeValue(
    createDateValue(year, month, day),
    createTimeValue(hour, minute),
  );
  return scenarioDemo(host, [
    { title: 'Local schedule', value: at(2026, 8, 22, 16, 30), controlled: false, policies: {}, detail: 'timezone-free date and wall clock' },
    { title: 'Cross-midnight stepping', value: at(2026, 8, 22, 23, 45), controlled: false, policies: { step: { minute: 30 } }, detail: 'time segments carry into the civil date' },
    { title: 'Controlled date-time', value: at(2026, 8, 22, 14, 0), controlled: true, policies: {}, detail: 'external value ownership' },
  ], (scenario) => createTerminalTemporalField(host, scenario, 'date-time'));
}

function createTerminalTemporalField(host, scenario, kind) {
  let external = scenario.value;
  let interactionFeedback = null;
  let connection;
  const create = kind === 'date' ? createDateField : kind === 'date-time' ? createDateTimeField : createTimeField;
  const format = kind === 'date' ? formatDateValue : kind === 'date-time' ? formatDateTimeValue : formatTimeValue;
  connection = create({
    ...scenario.interaction,
    policies: scenario.policies,
    ...(scenario.controlled ? { value: external, onValueChange: (value) => { external = value; queueMicrotask(sync); } } : { defaultValue: external }),
    onUpdate: host.render,
  });
  function sync() { connection.syncControlledValues({ value: external }); }
  const segments = temporalSegments(kind);
  return {
    handle(input) {
      if (input.key === 'left' || input.key === 'right' || input.key === 'home' || input.key === 'end') {
        interactionFeedback = null;
        return moveTemporalSegment(connection, segments, input.key);
      }
      const segmentEdit = editTemporalSegment(connection, segments, input);
      if (segmentEdit !== null) {
        interactionFeedback = null;
        return segmentEdit;
      }
      const handled = connection.handleKeyboardInput(input);
      if ((input.key === 'up' || input.key === 'down') && !handled) {
        const boundary = input.key === 'up' ? scenario.policies.max : scenario.policies.min;
        interactionFeedback = boundary === undefined
          ? null
          : `${input.key === 'up' ? 'Next value exceeds maximum' : 'Previous value precedes minimum'} ${format(boundary)}`;
        if (interactionFeedback !== null) host.render();
      } else if (handled) {
        interactionFeedback = null;
      }
      return handled;
    },
    lines(width) {
      const { state } = connection.getSnapshot();
      const text = connection.getText();
      const active = activeTemporalSegment(connection, segments);
      const committed = state.value === null ? null : format(state.value);
      const draft = temporalDraftStatus(kind, text, scenario.policies, committed);
      const feedback = draft.type === 'invalid'
        ? [
            `${ansi.yellow}Invalid draft · ${draft.message}${ansi.reset}`,
            `${ansi.dim}Committed value unchanged · ${committed ?? 'empty'} · Esc restores it${ansi.reset}`,
          ]
        : draft.type === 'pending'
          ? [`${ansi.cyan}Ready to commit · Enter saves ${draft.value}${ansi.reset}`]
          : [];
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}`,
        `${ansi.dim}${scenario.detail} · ←/→ segment · ↑/↓ adjust · Enter commit · Esc restore${ansi.reset}`,
        '', renderTemporalSegments(text, segments, active), '',
        ...feedback,
        ...(interactionFeedback === null ? [] : [`${ansi.yellow}${interactionFeedback}${ansi.reset}`]),
        `value=${committed ?? '−'}  segment=${active.label}`,
        `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
      ];
    },
  };
}

function temporalDraftStatus(kind, text, policies, committed) {
  const source = text.trim();
  if (source.length === 0) {
    if (policies.required === true) return { type: 'invalid', message: 'A value is required.' };
    return committed === null ? { type: 'committed' } : { type: 'pending', value: 'an empty value' };
  }

  const parse = kind === 'date' ? parseDateValue : kind === 'date-time' ? parseDateTimeValue : parseTimeValue;
  const compare = kind === 'date' ? compareDateValues : kind === 'date-time' ? compareDateTimeValues : compareTimeValues;
  const format = kind === 'date' ? formatDateValue : kind === 'date-time' ? formatDateTimeValue : formatTimeValue;
  const parsed = parse(source);
  if (!parsed.ok) return { type: 'invalid', message: temporalDraftError(parsed.error.code) };
  if (policies.min !== undefined && compare(parsed.value, policies.min) < 0) {
    return { type: 'invalid', message: 'The value is earlier than the allowed minimum.' };
  }
  if (policies.max !== undefined && compare(parsed.value, policies.max) > 0) {
    return { type: 'invalid', message: 'The value is later than the allowed maximum.' };
  }
  if (typeof policies.unavailable === 'function' && policies.unavailable(parsed.value)) {
    return { type: 'invalid', message: 'This value is unavailable.' };
  }

  const value = format(parsed.value);
  return value === committed ? { type: 'committed' } : { type: 'pending', value };
}

function temporalDraftError(code) {
  switch (code) {
    case 'invalid-date-format': return 'Use YYYY-MM-DD.';
    case 'invalid-date-year': return 'Year must be 0001–9999.';
    case 'invalid-date-month': return 'Month must be 01–12.';
    case 'invalid-date-day': return 'That day does not exist in this month.';
    case 'invalid-time-format': return 'Use HH:mm, optionally with seconds.';
    case 'invalid-time-hour': return 'Hour must be 00–23.';
    case 'invalid-time-minute': return 'Minute must be 00–59.';
    case 'invalid-time-second': return 'Second must be 00–59.';
    case 'invalid-time-millisecond': return 'Milliseconds must be 000–999.';
    case 'invalid-date-time-format': return 'Use YYYY-MM-DDTHH:mm.';
    default: return 'Enter a valid date or time.';
  }
}

function temporalSegments(kind) {
  const date = [
    { id: 'year', label: 'year', start: 0, end: 4 },
    { id: 'month', label: 'month', start: 5, end: 7 },
    { id: 'day', label: 'day', start: 8, end: 10 },
  ];
  if (kind === 'date') return date;
  const timeOffset = kind === 'date-time' ? 11 : 0;
  const time = [
    { id: 'hour', label: 'hour', start: timeOffset, end: timeOffset + 2 },
    { id: 'minute', label: 'minute', start: timeOffset + 3, end: timeOffset + 5 },
    { id: 'second', label: 'second', start: timeOffset + 6, end: timeOffset + 8 },
    { id: 'millisecond', label: 'millisecond', start: timeOffset + 9, end: timeOffset + 12 },
  ];
  return kind === 'date-time' ? [...date, ...time] : time;
}

function availableTemporalSegments(text, segments) {
  return segments.filter(({ start }) => start < text.length);
}

function temporalText(connection, endpoint) {
  return endpoint === undefined ? connection.getText() : connection.getText(endpoint);
}

function temporalInputState(connection, endpoint) {
  const state = connection.getSnapshot().state;
  return endpoint === undefined ? state.inputState : state[endpoint].inputState;
}

function handleTemporalTextEvent(connection, endpoint, event) {
  return endpoint === undefined
    ? connection.handleEvent({ type: 'text', event })
    : connection.handleEvent({ type: 'field', endpoint, event: { type: 'text', event } });
}

function activeTemporalSegment(connection, segments, endpoint) {
  const available = availableTemporalSegments(temporalText(connection, endpoint), segments);
  const selection = temporalInputState(connection, endpoint).snapshot.selection;
  const offset = Math.min(selection.anchorCodeUnitOffset, selection.focusCodeUnitOffset);
  return available.find(({ start, end }) => offset >= start && offset <= end) ?? available.at(-1) ?? segments[0];
}

function moveTemporalSegment(connection, segments, key, endpoint) {
  const text = temporalText(connection, endpoint);
  const available = availableTemporalSegments(text, segments);
  if (available.length === 0) return false;
  const active = activeTemporalSegment(connection, available, endpoint);
  const index = available.indexOf(active);
  const target = key === 'home'
    ? available[0]
    : key === 'end'
      ? available.at(-1)
      : available[Math.max(0, Math.min(available.length - 1, index + (key === 'right' ? 1 : -1)))];
  return handleTemporalTextEvent(connection, endpoint, {
      type: 'replace',
      startCodeUnitOffset: target.start,
      endCodeUnitOffset: target.start,
      text: '',
      selection: {
        anchorCodeUnitOffset: target.start,
        focusCodeUnitOffset: Math.min(target.end, text.length),
      },
  });
}

function editTemporalSegment(connection, segments, input, endpoint) {
  const insertsText = typeof input.text === 'string' && input.text.length > 0;
  if (input.key !== 'backspace' && input.key !== 'delete' && !insertsText) return null;

  const segment = activeTemporalSegment(connection, segments, endpoint);
  const text = temporalText(connection, endpoint);
  const selection = temporalInputState(connection, endpoint).snapshot.selection;
  const width = segment.end - segment.start;
  const content = text.slice(segment.start, segment.end).trimEnd();
  const selectionStart = Math.max(
    segment.start,
    Math.min(selection.anchorCodeUnitOffset, selection.focusCodeUnitOffset, segment.end),
  );
  const selectionEnd = Math.max(
    selectionStart,
    Math.min(Math.max(selection.anchorCodeUnitOffset, selection.focusCodeUnitOffset), segment.end),
  );
  let replaceStart = Math.min(selectionStart - segment.start, content.length);
  let replaceEnd = Math.min(selectionEnd - segment.start, content.length);
  let inserted = insertsText ? input.text : '';

  if (input.key === 'backspace' && replaceStart === replaceEnd) {
    if (replaceStart === 0) return true;
    replaceStart -= 1;
  } else if (input.key === 'delete' && replaceStart === replaceEnd) {
    if (replaceEnd === content.length) return true;
    replaceEnd += 1;
  }

  const next = `${content.slice(0, replaceStart)}${inserted}${content.slice(replaceEnd)}`.slice(0, width);
  const caret = segment.start + Math.min(width, replaceStart + inserted.length);
  return handleTemporalTextEvent(connection, endpoint, {
      type: 'replace',
      startCodeUnitOffset: segment.start,
      endCodeUnitOffset: segment.end,
      text: next.padEnd(width, ' '),
      selection: {
        anchorCodeUnitOffset: caret,
        focusCodeUnitOffset: caret,
      },
  });
}

function renderTemporalSegments(text, segments, active) {
  const available = availableTemporalSegments(text, segments);
  let offset = 0;
  const output = [];
  for (const segment of available) {
    if (segment.start > offset) output.push(`${ansi.dim}${text.slice(offset, segment.start)}${ansi.reset}`);
    const visible = text.slice(segment.start, Math.min(segment.end, text.length)).replaceAll(' ', '·');
    output.push(segment.id === active.id ? `${ansi.current}${visible}${ansi.reset}` : visible);
    offset = Math.min(segment.end, text.length);
  }
  if (offset < text.length) output.push(`${ansi.dim}${text.slice(offset)}${ansi.reset}`);
  return output.join('');
}

function createDatePickerDemo(host) {
  return scenarioDemo(host, [
    { title: 'Release date', controlled: false, weekdaysOnly: false },
    { title: 'Weekday booking', controlled: false, weekdaysOnly: true },
    { title: 'Controlled picker', controlled: true, weekdaysOnly: false },
  ], (scenario) => createTerminalPicker(host, scenario, false));
}

function createDateRangePickerDemo(host) {
  return scenarioDemo(host, [
    { title: 'Deployment window', controlled: false, bounded: false },
    { title: 'Quarter availability', controlled: false, bounded: true },
    { title: 'Controlled range', controlled: true, bounded: false },
  ], (scenario) => createTerminalPicker(host, scenario, true));
}

function createDateTimePickerDemo(host) {
  return scenarioDemo(host, [
    { title: 'Schedule release', controlled: false },
    { title: 'Morning appointment', controlled: false },
    { title: 'Controlled date-time picker', controlled: true },
  ], (scenario) => createTerminalDateTimePicker(host, scenario, false));
}

function createDateTimeRangePickerDemo(host) {
  return scenarioDemo(host, [
    { title: 'Maintenance window', controlled: false },
    { title: 'Multi-day office hours', controlled: false },
    { title: 'Controlled date-time range', controlled: true },
  ], (scenario) => createTerminalDateTimePicker(host, scenario, true));
}

function createRangeCalendarDemo(host) {
  return scenarioDemo(host, [
    { title: 'Booking range', controlled: false, bounded: false },
    { title: 'Bounded booking range', controlled: false, bounded: true },
    { title: 'Controlled calendar range', controlled: true, bounded: false },
  ], (scenario) => createTerminalPicker(host, scenario, true, createRangeCalendar));
}

function createMonthPickerDemo(host) {
  return createPeriodPickerDemo(host, 'month', false, createMonthPicker, [
    'Billing month', 'Fiscal year start', 'Controlled month',
  ]);
}

function createMonthRangePickerDemo(host) {
  return createPeriodPickerDemo(host, 'month', true, createMonthRangePicker, [
    'Reporting period', 'Bounded quarter', 'Controlled month range',
  ]);
}

function createYearPickerDemo(host) {
  return createPeriodPickerDemo(host, 'year', false, createYearPicker, [
    'Graduation year', 'Planning year', 'Controlled year',
  ]);
}

function createYearRangePickerDemo(host) {
  return createPeriodPickerDemo(host, 'year', true, createYearRangePicker, [
    'Roadmap horizon', 'Bounded roadmap', 'Controlled year range',
  ]);
}

function createPeriodPickerDemo(host, unit, range, create, titles) {
  return scenarioDemo(host, titles.map((title, index) => ({
    title,
    controlled: index === 2,
    bounded: index === 1,
  })), (scenario) => createTerminalPeriodPicker(host, scenario, unit, range, create));
}

function createTerminalPeriodPicker(host, scenario, unit, range, create) {
  const currentYear = new Date().getFullYear();
  const initialHighlight = createDateValue(currentYear, unit === 'month' ? 4 : 1, 1);
  let externalValue = range
    ? createDateRange(
        initialHighlight,
        createDateValue(currentYear + (unit === 'year' ? 3 : 0), unit === 'month' ? 9 : 1, 1),
      )
    : initialHighlight;
  let externalHighlight = initialHighlight;
  let externalOpen = true;
  let pageStart = Math.floor((currentYear - 1) / 12) * 12 + 1;
  let syncScheduled = false;
  let connection;
  const policies = scenario.bounded
    ? {
        min: createDateValue(currentYear - 2, 1, 1),
        max: createDateValue(currentYear + 6, 12, 31),
      }
    : {};
  connection = create({
    ...scenario.interaction,
    policies,
    ...(scenario.controlled
      ? {
          value: externalValue,
          highlightedValue: externalHighlight,
          open: externalOpen,
          onValueChange: (value) => { externalValue = value; scheduleSync(); },
          onHighlightedValueChange: (value) => { externalHighlight = value; scheduleSync(); },
          onOpenChange: (open) => { externalOpen = open; scheduleSync(); },
        }
      : {
          defaultValue: externalValue,
          defaultHighlightedValue: externalHighlight,
          defaultOpen: true,
        }),
    onUpdate: host.render,
  });
  function scheduleSync() {
    if (!scenario.controlled || syncScheduled) return;
    syncScheduled = true;
    queueMicrotask(() => {
      syncScheduled = false;
      connection.syncControlledValues({
        value: externalValue,
        highlightedValue: externalHighlight,
        open: externalOpen,
      });
    });
  }
  function repeat(event, count) {
    let handled = false;
    for (let index = 0; index < count; index += 1) handled = connection.handleEvent(event) || handled;
    const highlighted = range
      ? connection.getSnapshot().state.calendar.highlighted
      : connection.getSnapshot().state.highlighted;
    while (highlighted.year < pageStart) pageStart -= 12;
    while (highlighted.year > pageStart + 11) pageStart += 12;
    return handled;
  }
  function handle(input) {
    if (input.ctrlKey || input.altKey) return false;
    if (unit === 'month') {
      if (input.key === 'left') return repeat('previous-month', 1);
      if (input.key === 'right') return repeat('next-month', 1);
      if (input.key === 'up') return repeat('previous-month', 3);
      if (input.key === 'down') return repeat('next-month', 3);
      if (input.key === 'page-up') return repeat('previous-year', 1);
      if (input.key === 'page-down') return repeat('next-year', 1);
    } else {
      if (input.key === 'left') return repeat('previous-year', 1);
      if (input.key === 'right') return repeat('next-year', 1);
      if (input.key === 'up') return repeat('previous-year', 3);
      if (input.key === 'down') return repeat('next-year', 3);
      if (input.key === 'page-up') return repeat('previous-year', 12);
      if (input.key === 'page-down') return repeat('next-year', 12);
    }
    if (input.key === 'enter' || input.key === 'space') return connection.handleEvent('select-highlighted');
    if (input.key === 'escape') return connection.handleEvent('close');
    return false;
  }
  return {
    handle,
    lines(width) {
      const snapshot = connection.getSnapshot().state;
      const calendar = range ? snapshot.calendar : snapshot;
      const selected = snapshot.value;
      const pendingAnchor = range ? snapshot.anchor : null;
      const cellWidth = Math.max(12, Math.min(20, Math.floor((width - 2) / 3)));
      const values = unit === 'month'
        ? Array.from({ length: 12 }, (_, index) => createDateValue(calendar.highlighted.year, index + 1, 1))
        : Array.from({ length: 12 }, (_, index) => createDateValue(pageStart + index, 1, 1));
      const key = (value) => unit === 'month' ? value.year * 12 + value.month : value.year;
      const isAnchor = (value) => pendingAnchor !== null && key(pendingAnchor) === key(value);
      const isSelected = (value) => pendingAnchor !== null
        ? isAnchor(value)
        : selected !== null && (range
          ? key(selected.start) <= key(value) && key(value) <= key(selected.end)
          : key(selected) === key(value));
      const label = (value) => unit === 'month'
        ? `${terminalCalendarShortMonthFormatter.format(new Date(value.year, value.month - 1, 1))}${isAnchor(value) ? ' start' : ''}`
        : `${value.year}${isAnchor(value) ? ' start' : value.year === currentYear ? ' •' : ''}`;
      const rows = Array.from({ length: 4 }, (_, row) => values.slice(row * 3, row * 3 + 3)
        .map((value) => terminalCell(label(value), cellWidth, {
          current: key(value) === key(calendar.highlighted),
          selected: isSelected(value),
        })).join(' '));
      const selectedText = selected === null
        ? '−'
        : range
          ? `${unit === 'month' ? formatDateValue(selected.start).slice(0, 7) : selected.start.year} → ${unit === 'month' ? formatDateValue(selected.end).slice(0, 7) : selected.end.year}`
          : unit === 'month' ? formatDateValue(selected).slice(0, 7) : String(selected.year);
      const highlightedText = unit === 'month'
        ? formatDateValue(calendar.highlighted).slice(0, 7)
        : calendar.highlighted.year;
      const anchorText = pendingAnchor === null
        ? null
        : unit === 'month' ? formatDateValue(pendingAnchor).slice(0, 7) : pendingAnchor.year;
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}`,
        `${ansi.dim}${anchorText === null
          ? `arrows move · PgUp/PgDn page · Enter ${range ? 'set start' : 'select'}`
          : `start ${anchorText} selected · move to end · Enter finish range`}${unit === 'year' ? ` · ${currentYear} • current` : ''}${ansi.reset}`,
        '', ...rows, '',
        ...(anchorText === null
          ? [`${range ? 'range' : 'value'}=${selectedText}  highlighted=${highlightedText}`]
          : [`start=${anchorText}  end=pending  highlighted=${highlightedText}`, `${ansi.dim}previous range=${selectedText}${ansi.reset}`]),
        `open=${calendar.open}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
      ];
    },
  };
}

function createTerminalDateTimePicker(host, scenario, range) {
  const at = (year, month, day, hour, minute) => createDateTimeValue(
    createDateValue(year, month, day),
    createTimeValue(hour, minute),
  );
  let externalValue = range
    ? createDateTimeRange(at(2026, 8, 25, 22, 0), at(2026, 8, 26, 2, 30))
    : at(2026, 8, 22, 16, 30);
  let externalHighlight = range ? externalValue.end.date : externalValue.date;
  let externalOpen = true; let syncScheduled = false; let connection;
  const policies = range
    ? { startTime: { step: { minute: 15 } }, endTime: { step: { minute: 15 } } }
    : { time: { step: { minute: 15 } } };
  const create = range ? createDateTimeRangePicker : createDateTimePicker;
  connection = create({
    ...scenario.interaction, policies,
    ...(scenario.controlled
      ? { value: externalValue, highlightedValue: externalHighlight, open: externalOpen,
          onValueChange: (value) => { externalValue = value; scheduleSync(); },
          onHighlightedValueChange: (value) => { externalHighlight = value; scheduleSync(); },
          onOpenChange: (open) => { externalOpen = open; scheduleSync(); } }
      : { defaultValue: externalValue, defaultHighlightedValue: externalHighlight, defaultOpen: true }),
    onUpdate: host.render,
  });
  function scheduleSync() { if (!scenario.controlled || syncScheduled) return; syncScheduled = true; queueMicrotask(() => { syncScheduled = false; connection.syncControlledValues({ value: externalValue, highlightedValue: externalHighlight, open: externalOpen }); }); }
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { state } = connection.getSnapshot(); const calendar = state.calendar; const month = connection.getMonth(); const cellWidth = Math.max(5, Math.min(8, Math.floor((width - 6) / 7))); const selectedStart = range ? state.value?.start.date : state.value?.date; const selectedEnd = range ? state.value?.end.date : selectedStart;
      return [
        `${ansi.bold}${scenario.title} · ${terminalMonthLabel(calendar.view)}${ansi.reset}`,
        `${ansi.dim}arrows move · Enter select · Alt+↑/↓ time${range ? ' · Shift+Alt+↑/↓ end' : ''}${ansi.reset}`, '',
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => plain(day, cellWidth)).join(' '),
        ...month.map((week) => week.map((value) => terminalCell(String(value.day), cellWidth, { current: sameTerminalDate(value, calendar.highlighted), selected: selectedStart !== undefined && selectedEnd !== undefined && compareTerminalDate(selectedStart, value) <= 0 && compareTerminalDate(value, selectedEnd) <= 0 })).join(' ')),
        '', range
          ? `range=${state.value === null ? '−' : formatDateTimeRange(state.value)}  anchor=${state.anchor === null ? '−' : formatDateValue(state.anchor)}`
          : `value=${state.value === null ? '−' : formatDateTimeValue(state.value)}`,
        range
          ? `start-time=${formatTimeValue(state.startTime)}  end-time=${formatTimeValue(state.endTime)}`
          : `time=${formatTimeValue(state.time)}`,
        `highlighted=${formatDateValue(calendar.highlighted)}  open=${calendar.open}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
      ];
    },
  };
}

function createTerminalPicker(host, scenario, range, factory) {
  const initial = createDateValue(2026, 8, 22);
  let externalValue = range ? createDateRange(createDateValue(2026, 8, 18), initial) : initial;
  let externalHighlight = initial; let externalOpen = true; let syncScheduled = false; let connection;
  const policies = {
    ...(scenario.weekdaysOnly ? { unavailable: (value) => terminalISOWeekday(value) >= 6 } : {}),
    ...(scenario.bounded ? { min: createDateValue(2026, 8, 1), max: createDateValue(2026, 10, 31) } : {}),
  };
  const create = factory ?? (range ? createDateRangePicker : createDatePicker);
  connection = create({
    ...scenario.interaction, policies,
    ...(scenario.controlled
      ? { value: externalValue, highlightedValue: externalHighlight, open: externalOpen,
          onValueChange: (value) => { externalValue = value; scheduleSync(); },
          onHighlightedValueChange: (value) => { externalHighlight = value; scheduleSync(); },
          onOpenChange: (open) => { externalOpen = open; scheduleSync(); } }
      : { defaultValue: externalValue, defaultHighlightedValue: externalHighlight, defaultOpen: true }),
    onUpdate: host.render,
  });
  function scheduleSync() { if (syncScheduled) return; syncScheduled = true; queueMicrotask(() => { syncScheduled = false; sync(); }); }
  function sync() { connection.syncControlledValues({ value: externalValue, highlightedValue: externalHighlight, open: externalOpen }); }
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { state } = connection.getSnapshot(); const calendar = range ? state.calendar : state; const month = connection.getMonth(); const cellWidth = Math.max(5, Math.min(8, Math.floor((width - 6) / 7)));
      const selected = range ? state.value : state.value;
      return [
        `${ansi.bold}${scenario.title} · ${terminalMonthLabel(calendar.view)}${ansi.reset}`,
        `${ansi.dim}arrows move · PgUp/PgDn or Fn+↑/↓ month · Enter select · Esc close${ansi.reset}`, '',
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => plain(day, cellWidth)).join(' '),
        ...month.map((week) => week.map((value) => terminalCell(String(value.day), cellWidth, { current: sameTerminalDate(value, calendar.highlighted), selected: range ? selected !== null && compareTerminalDate(selected.start, value) <= 0 && compareTerminalDate(value, selected.end) <= 0 : selected !== null && sameTerminalDate(selected, value) })).join(' ')),
        '', range ? `range=${selected === null ? '−' : `${formatDateValue(selected.start)} → ${formatDateValue(selected.end)}`}  anchor=${state.anchor === null ? '−' : formatDateValue(state.anchor)}` : `value=${selected === null ? '−' : formatDateValue(selected)}`,
        `highlighted=${formatDateValue(calendar.highlighted)}  open=${calendar.open}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
      ];
    },
  };
}

function terminalMonthLabel(view) { return `${terminalCalendarMonthFormatter.format(new Date(view.year, view.month - 1, 1))}`; }
function terminalISOWeekday(value) { return ((new Date(Date.UTC(value.year, value.month - 1, value.day)).getUTCDay() + 6) % 7) + 1; }
function compareTerminalDate(left, right) { const a = `${left.year.toString().padStart(4, '0')}-${left.month.toString().padStart(2, '0')}-${left.day.toString().padStart(2, '0')}`; const b = `${right.year.toString().padStart(4, '0')}-${right.month.toString().padStart(2, '0')}-${right.day.toString().padStart(2, '0')}`; return a < b ? -1 : a > b ? 1 : 0; }
function sameTerminalDate(left, right) { return compareTerminalDate(left, right) === 0; }

function numberFieldEditing(text) {
  return createTextEditingState(text, {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  });
}

function createMultiThumbSliderDemo(host) {
  return scenarioDemo(host, [
    { title: 'Price range', ids: ['low', 'high'], values: [20, 80], minGap: 10, allowCross: false, controlled: false },
    { title: 'Alert thresholds', ids: ['low', 'medium', 'high'], values: [20, 50, 80], minGap: 10, allowCross: false, controlled: false },
    { title: 'Crossing markers', ids: ['forecast', 'actual'], values: [35, 65], minGap: 0, allowCross: true, controlled: false },
    { title: 'Controlled budget', ids: ['low', 'high'], values: [25, 75], minGap: 5, allowCross: false, controlled: true },
  ], (scenario) => {
    let external = [...scenario.values];
    let connection;
    connection = createMultiThumbSlider({
      ...scenario.interaction,
      thumbs: scenario.ids, min: '0', max: '100', step: '1',
      policies: { minGap: scenario.minGap, allowCross: scenario.allowCross },
      ...(scenario.controlled ? {
        values: external,
        onValuesChange: (values) => {
          external = [...values];
          queueMicrotask(() => connection.syncControlledValues({ values: external }));
        },
      } : { defaultValues: scenario.values }),
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const barWidth = Math.max(12, Math.min(48, width - 4));
        const markers = Array.from({ length: barWidth + 1 }, () => '·');
        state.ticks.forEach((tick, index) => { markers[Math.round(tick / 100 * barWidth)] = state.cursor.current === scenario.ids[index] ? '●' : '○'; });
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}Tab changes thumb · crossing=${scenario.allowCross}${ansi.reset}`,
          '', `[${markers.join('')}]`, '',
          `values=${connection.getValues().join(' / ')}  active=${state.cursor.current ?? '−'}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createPopupDemo(host, kind) {
  const scenarios = kind === 'dialog'
    ? [
      { title: 'Modal settings', initial: false, controlled: false, detail: 'focus enters and remains in the dialog' },
      { title: 'Non-modal inspector', initial: true, controlled: false, detail: 'background interaction remains available' },
      { title: 'Controlled preview', initial: false, controlled: true, detail: 'application owns open state' },
    ]
    : kind === 'alert-dialog'
      ? [
        { title: 'Delete project?', initial: false, controlled: false, detail: 'destructive confirmation' },
        { title: 'Discard changes?', initial: true, controlled: false, detail: 'unsaved work warning' },
        { title: 'Controlled confirmation', initial: false, controlled: true, detail: 'application owns open state' },
      ]
      : kind === 'popover'
        ? [
          { title: 'Profile details', initial: false, controlled: false, detail: 'Enter opens anchored content' },
          { title: 'Visible profile details', initial: true, controlled: false, detail: 'Escape closes and restores focus' },
          { title: 'Controlled profile details', initial: false, controlled: true, detail: 'application owns open state' },
        ]
        : [
        { title: 'Hidden help', initial: false, controlled: false, detail: 'focus or hover opens on pointer hosts' },
        { title: 'Visible help', initial: true, controlled: false, detail: 'Escape hides the description' },
        { title: 'Controlled help', initial: true, controlled: true, detail: 'application owns visibility' },
      ];
  return scenarioDemo(host, scenarios, (scenario) => {
    let external = scenario.initial;
    let announcements = 0;
    let focusRequests = 0;
    let restoreRequests = 0;
    let dialogFocus = 0;
    const dialogChoices = new Set(['completed', 'failed']);
    const dialogTargets = [
      { id: 'completed', label: 'Deployment completed', kind: 'choice' },
      { id: 'failed', label: 'Build failed', kind: 'choice' },
      { id: 'cancel', label: 'Cancel', kind: 'action' },
      { id: 'save', label: 'Save changes', kind: 'action' },
    ];
    let connection;
    const shared = {
      ...scenario.interaction,
      ...(scenario.controlled ? {
        open: external,
        onOpenChange: (open) => {
          external = open;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultOpen: scenario.initial }),
      onUpdate: host.render,
    };
    connection = kind === 'dialog'
      ? createDialog({ ...shared, onInitialFocus: () => { focusRequests += 1; }, onFocusRestore: () => { restoreRequests += 1; } })
      : kind === 'alert-dialog'
        ? createAlertDialog({ ...shared, onInitialFocus: () => { focusRequests += 1; }, onFocusRestore: () => { restoreRequests += 1; }, onAnnounce: () => { announcements += 1; } })
        : kind === 'popover'
          ? createPopover({ ...shared, onInitialFocus: () => { focusRequests += 1; }, onFocusRestore: () => { restoreRequests += 1; } })
          : createTooltip(shared);
    return {
      handle(input) {
        const { open } = connection.getSnapshot().state;
        if (kind === 'dialog' && open) {
          if (input.key === 'tab' || input.key === 'down' || input.key === 'right') {
            dialogFocus = (dialogFocus + 1) % dialogTargets.length;
            host.render();
            return true;
          }
          if (input.key === 'up' || input.key === 'left') {
            dialogFocus = (dialogFocus - 1 + dialogTargets.length) % dialogTargets.length;
            host.render();
            return true;
          }
          const target = dialogTargets[dialogFocus];
          if (input.key === 'space' && target.kind === 'choice') {
            if (dialogChoices.has(target.id)) dialogChoices.delete(target.id);
            else dialogChoices.add(target.id);
            host.render();
            return true;
          }
          if (input.key === 'enter' && target.kind === 'action') {
            return connection.handleEvent('close');
          }
        }
        if (!open && (input.key === 'enter' || input.key === 'space')) {
          dialogFocus = 0;
          return connection.handleEvent('open');
        }
        if (kind !== 'dialog' && (input.key === 'enter' || input.key === 'space')) {
          return connection.handleEvent(open ? 'close' : 'open');
        }
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { state } = connection.getSnapshot();
        const frame = Math.max(30, Math.min(58, width - 4));
        const panel = kind === 'dialog' && state.open
          ? [
              `┌─ ${plain('Notification settings ', frame - 4)}┐`,
              `│ ${plain('Choose which deployment events should notify you.', frame - 4)} │`,
              `│ ${' '.repeat(frame - 4)} │`,
              ...dialogTargets.slice(0, 2).map((target, index) => {
                const marker = dialogFocus === index ? '>' : ' ';
                const checked = dialogChoices.has(target.id) ? 'x' : ' ';
                return `│ ${plain(`${marker} [${checked}] ${target.label}`, frame - 4)} │`;
              }),
              `│ ${' '.repeat(frame - 4)} │`,
              `│ ${plain(`${dialogFocus === 2 ? '>' : ' '} [ Cancel ]  ${dialogFocus === 3 ? '>' : ' '} [ Save changes ]`, frame - 4)} │`,
              `└${'─'.repeat(frame - 2)}┘`,
            ]
          : state.open
            ? [
                `┌${'─'.repeat(frame - 2)}┐`,
                `│ ${plain(kind === 'tooltip' ? 'Helpful description' : scenario.title, frame - 4)} │`,
                `└${'─'.repeat(frame - 2)}┘`,
              ]
            : [`${ansi.dim}[ Enter to open ]${ansi.reset}`];
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}${scenario.detail}${ansi.reset}`,
          '',
          ...panel,
          '',
          ...(kind === 'dialog' && state.open
            ? [`${ansi.dim}Tab/Arrows move · Space toggles · Enter activates · Esc closes${ansi.reset}`]
            : []),
          `open=${state.open}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
          `focus=${state.open && kind === 'dialog' ? dialogTargets[dialogFocus].id : '−'}  entered=${focusRequests}  restored=${restoreRequests}  announced=${announcements}`,
        ];
      },
    };
  });
}

function createMenuDemo(host, kind) {
  const basic = [
    { id: 'new', parentID: null, label: 'New file' },
    { id: 'open', parentID: null, label: 'Open' },
    { id: 'save', parentID: null, label: 'Save' },
  ];
  const nested = [
    { id: 'file', parentID: null, label: 'File' },
    { id: 'new', parentID: 'file', label: 'New file' },
    { id: 'open', parentID: 'file', label: 'Open' },
    { id: 'edit', parentID: null, label: 'Edit' },
    { id: 'copy', parentID: 'edit', label: 'Copy' },
    { id: 'paste', parentID: 'edit', label: 'Paste' },
    { id: 'help', parentID: null, label: 'Help' },
  ];
  const scenarios = kind === 'menu'
    ? [
      { title: 'Command menu', items: basic, disabled: [], controlled: false },
      { title: 'Disabled command', items: basic, disabled: ['save'], controlled: false },
      { title: 'Nested commands', items: nested, disabled: [], controlled: false },
    ]
    : kind === 'menubar'
      ? [
        { title: 'Application menu', items: nested, disabled: [], controlled: false },
        { title: 'Unavailable menu', items: nested, disabled: ['edit'], controlled: false },
        { title: 'Typeahead menubar', items: nested, disabled: [], controlled: false },
      ]
      : [
        { title: 'Quick actions', items: basic, disabled: [], controlled: false },
        { title: 'Nested actions', items: nested, disabled: ['paste'], controlled: false },
        { title: 'Controlled menu', items: basic, disabled: [], controlled: true },
      ];
  return scenarioDemo(host, scenarios, (scenario) => {
    let invoked = null;
    let externalOpen = false;
    let connection;
    const common = {
      ...scenario.interaction,
      items: scenario.items.map(({ id, parentID }) => ({ id, parentID })),
      disabledItems: scenario.disabled,
      defaultHighlightedValue: scenario.items[0]?.id ?? null,
      typeahead: { textValue: (id) => scenario.items.find((item) => item.id === id)?.label ?? id },
      onInvoke: (id) => { invoked = id; },
      onUpdate: host.render,
    };
    connection = kind === 'menu'
      ? createMenu(common)
      : kind === 'menubar'
        ? createMenubar(common)
        : createMenuButton({
          ...common,
          ...(scenario.controlled ? {
            open: externalOpen,
            onOpenChange: (open) => {
              externalOpen = open;
              queueMicrotask(() => connection.syncControlledValue(externalOpen));
            },
          } : {}),
        });
    return {
      handle(input) {
        if (kind === 'menu-button' && !connection.getSnapshot().state.open && (input.key === 'enter' || input.key === 'space')) return connection.handleEvent('open-popup');
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { state } = connection.getSnapshot();
        const visible = scenario.items.filter((item) => item.parentID === null || state.openPath.includes(item.parentID));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}↑/↓ move · → open · ←/Esc back · Enter run · Home/End or Ctrl+A/E edges · type find${ansi.reset}`,
          '',
          ...(state.open ? visible.map((item) => {
            const depth = item.parentID === null ? 0 : 1;
            const branch = scenario.items.some((candidate) => candidate.parentID === item.id);
            const marker = branch ? state.openPath.includes(item.id) ? '▾' : '▸' : '·';
            return scenario.disabled.includes(item.id)
              ? `${ansi.dim}${plain(`${'  '.repeat(depth)}× ${item.label}`, Math.min(50, width))}${ansi.reset}`
              : terminalCell(`${'  '.repeat(depth)}${marker} ${item.label}`, Math.min(50, width), { current: state.cursor.current === item.id, selected: false });
          }) : [`${ansi.dim}[ Enter to open ]${ansi.reset}`]),
          '',
          `open=${state.open}  current=${state.cursor.current ?? '−'}  path=${state.openPath.join('/') || '−'}`,
          `invoked=${invoked ?? '−'}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createCalendarDemo(host) {
  return scenarioDemo(host, [
    { title: 'Monthly date picker', disabledWeekends: false, controlled: false },
    { title: 'Weekday booking', disabledWeekends: true, controlled: false },
    { title: 'Controlled date picker', disabledWeekends: false, controlled: true },
  ], (scenario) => {
    const today = new Date(); const todayID = calendarDateID(today); let page = createCalendarMonth(today); let selectedDate = todayID; let highlightedDate = todayID; let connection = connect(todayID);
    function connect(highlightedValue) {
      const visibleValue = page.ids.has(selectedDate) ? selectedDate : null;
      return createCalendar({
        ...scenario.interaction,
        rows: page.rows, policies: { eligible: (id) => !scenario.disabledWeekends || !isTerminalWeekend(id) },
        ...(scenario.controlled ? { value: visibleValue, highlightedValue } : { defaultValue: visibleValue, defaultHighlightedValue: highlightedValue }),
        onValueChange: ({ value }) => { selectedDate = value; if (scenario.controlled) queueMicrotask(sync); },
        onHighlightedValueChange: ({ value }) => { highlightedDate = value; if (scenario.controlled) queueMicrotask(sync); },
        onPageRequest: ({ direction, from }) => { const target = shiftCalendarMonth(page.date, direction, from); page = createCalendarMonth(target); highlightedDate = calendarDateID(target); connection = connect(highlightedDate); },
        onTransition: host.record, onUpdate: host.render,
      });
    }
    function sync() { connection.syncControlledValues({ value: selectedDate !== null && page.ids.has(selectedDate) ? selectedDate : null, highlightedValue: highlightedDate !== null && page.ids.has(highlightedDate) ? highlightedDate : null }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot(); const cellWidth = Math.max(5, Math.min(8, Math.floor((width - 6) / 7)));
        return [
          `${ansi.bold}${scenario.title} · ${page.label}${ansi.reset}`, '',
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => plain(`  ${day}`, cellWidth)).join(' '),
          ...page.rows.map((week) => week.map((id) => {
            if (isTerminalWeekend(id) && scenario.disabledWeekends) {
              return terminalCalendarStatusCell(id, cellWidth, ansi.disabled);
            }
            if (!isTerminalCalendarMonth(id, page)) {
              return terminalCalendarStatusCell(id, cellWidth, ansi.dim);
            }
            return terminalCell(calendarCellLabel(id), cellWidth, {
              current: state.cursor.current === id,
              selected: state.selection.has(id),
            });
          }).join(' ')),
          '', `view=${page.key}  current=${state.cursor.current ?? '−'}`, `selected=${selectedDate ?? '−'}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createCalendarMonth(date) {
  const month = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (month.getDay() + 6) % 7;
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - mondayOffset);
  const rows = Array.from({ length: 6 }, (_, row) => Array.from(
    { length: 7 },
    (_, column) => calendarDateID(addCalendarDays(firstCell, row * 7 + column)),
  ));
  return Object.freeze({
    date: month,
    key: `${month.getFullYear()}-${calendarPad(month.getMonth() + 1)}`,
    label: terminalCalendarMonthFormatter.format(month),
    rows: Object.freeze(rows.map((row) => Object.freeze(row))),
    ids: new Set(rows.flat()),
  });
}

function shiftCalendarMonth(view, direction, from) {
  const source = from === null ? view : calendarDateFromID(from);
  const first = new Date(view.getFullYear(), view.getMonth() + direction, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(source.getDate(), lastDay));
}

function calendarCellLabel(id) {
  return String(calendarDateFromID(id).getDate());
}

function terminalCalendarStatusCell(id, width, style) {
  const label = calendarCellLabel(id);
  return `  ${style}${label}${ansi.reset}${' '.repeat(Math.max(0, width - 2 - label.length))}`;
}

function isTerminalCalendarMonth(id, page) {
  const date = calendarDateFromID(id);
  return date.getFullYear() === page.date.getFullYear()
    && date.getMonth() === page.date.getMonth();
}

function addCalendarDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function calendarDateID(date) {
  return `${date.getFullYear()}-${calendarPad(date.getMonth() + 1)}-${calendarPad(date.getDate())}`;
}

function calendarDateFromID(id) {
  const [year, month, day] = id.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isTerminalWeekend(id) {
  const day = calendarDateFromID(id).getDay();
  return day === 0 || day === 6;
}

function calendarPad(value) {
  return String(value).padStart(2, '0');
}

function createTreeViewDemo(host) {
  const nodes = [
    { id: 'src', parentID: null }, { id: 'components', parentID: 'src' },
    { id: 'button', parentID: 'components' }, { id: 'dialog', parentID: 'components' },
    { id: 'utils', parentID: 'src' }, { id: 'format', parentID: 'utils' },
    { id: 'readme', parentID: null },
  ];
  const labels = new Map([
    ['src', 'src'], ['components', 'components'], ['button', 'button.ts'], ['dialog', 'dialog.ts'],
    ['utils', 'utils'], ['format', 'format.ts'], ['readme', 'README.md'],
  ]);
  return scenarioDemo(host, [
    { title: 'Expanded source explorer', selectionMode: 'single', expanded: ['src', 'components'], selected: [], disabled: [], controlled: false },
    { title: 'Collapsed workspace roots', selectionMode: 'single', expanded: [], selected: ['readme'], disabled: [], controlled: false },
    { title: 'Multiple file selection', selectionMode: 'multiple', expanded: ['src', 'components', 'utils'], selected: ['button', 'format'], disabled: [], controlled: false },
    { title: 'Unavailable subtree', selectionMode: 'single', expanded: ['src'], selected: [], disabled: ['utils'], controlled: false },
    { title: 'Controlled source explorer', selectionMode: 'single', expanded: ['src'], selected: ['readme'], disabled: [], controlled: true },
  ], (scenario) => {
    let expandedValues = [...scenario.expanded]; let value = [...scenario.selected]; let highlightedValue = 'src'; let connection;
    connection = createTreeView({
      ...scenario.interaction,
      nodes,
      selectionMode: scenario.selectionMode,
      disabledItems: scenario.disabled,
      ...(scenario.controlled ? {
        expandedValues, value, highlightedValue,
        onExpandedValuesChange: ({ value: next }) => { expandedValues = [...next]; queueMicrotask(sync); },
        onValueChange: ({ value: next }) => { value = [...next]; queueMicrotask(sync); },
        onHighlightedValueChange: ({ value: next }) => { highlightedValue = next; queueMicrotask(sync); },
      } : { defaultExpandedValues: expandedValues, defaultValue: value, defaultHighlightedValue: highlightedValue }),
      onTransition: host.record, onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ expandedValues, value, highlightedValue }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const visibleItems = connection.tree.visible(state.expansion).ids.map((id) => {
          const leaf = connection.tree.isLeaf(id); const disclosure = leaf ? '·' : state.expansion.has(id) ? '▾' : '▸'; const depth = connection.tree.depthOf(id) ?? 0;
          return scenario.disabled.includes(id) ? `${ansi.dim}${plain(`${'  '.repeat(depth)}× ${labels.get(id) ?? id}`, Math.min(58, width))}${ansi.reset}` : terminalCell(`${'  '.repeat(depth)}${disclosure} ${labels.get(id) ?? id}`, Math.min(58, width), { current: state.cursor.current === id, selected: state.selection.has(id) });
        });
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`, '', ...visibleItems, '',
          `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}`, `expanded=${state.expansion.ids.join(',') || '−'}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createTextDemo(host) {
  return scenarioDemo(host, [
    { title: 'Korean and English', initial: '한글 and text', start: null, end: null, controlled: false },
    { title: 'Unicode selection', initial: 'Emoji 👨‍👩‍👧‍👦 · café · 한글', start: 6, end: 17, controlled: false },
    { title: 'Multiline draft', initial: 'First line\n둘째 줄', start: null, end: null, controlled: false },
    { title: 'Controlled editor', initial: 'Application-owned value', start: null, end: null, controlled: true },
  ], (scenario) => {
    const initial = createTextEditingState(scenario.initial, {
      anchorCodeUnitOffset: scenario.start ?? scenario.initial.length,
      focusCodeUnitOffset: scenario.end ?? scenario.start ?? scenario.initial.length,
    });
    let external = initial;
    let connection;
    connection = createText({
      ...scenario.interaction,
      ...(scenario.controlled ? {
        value: external,
        onValueChange: ({ value }) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValues({ value: external }));
        },
      } : { defaultValue: initial }),
      onTransition: host.recordText,
      onUpdate: host.render,
    });
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot();
        const value = connection.getValue();
        const focus = state.snapshot.selection.focusCodeUnitOffset;
        const caret = Math.min(width - 1, focus);
        const valueWithCursor = `${value.slice(0, focus)}${terminalInputCursor}${value.slice(focus)}`;
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`,
          `${ansi.dim}Unicode-safe replace · ${scenario.controlled ? 'controlled' : 'uncontrolled'}${ansi.reset}`,
          '',
          ...valueWithCursor.split('\n').map((line) => plain(line || ' ', width)),
          `${' '.repeat(Math.max(0, caret))}${ansi.cyan}▲${ansi.reset}`,
          '',
          `length=${value.length}  selection=${state.snapshot.selection.startCodeUnitOffset}:${state.snapshot.selection.endCodeUnitOffset}`,
          `composition=${state.composition === null ? '−' : state.composition.composingText}`,
        ];
      },
    };
  });
}

function createComboboxDemo(host) {
  const items = [
    { id: 'alpha', label: 'Alpha' }, { id: 'alpine', label: 'Alpine' },
    { id: 'beta', label: 'Beta' }, { id: 'gamma', label: 'Gamma' },
    { id: 'hangul', label: '한글' },
  ];
  return scenarioDemo(host, [
    { title: 'Prefix command search', mode: 'prefix', initial: '', controlled: false },
    { title: 'Contains matching', mode: 'contains', initial: 'a', controlled: false },
    { title: 'Korean input search', mode: 'prefix', initial: '한', controlled: false },
    { title: 'Controlled command search', mode: 'prefix', initial: '', controlled: true },
  ], (scenario) => {
    const initialInput = createTextEditingState(scenario.initial, { anchorCodeUnitOffset: scenario.initial.length, focusCodeUnitOffset: scenario.initial.length });
    const matches = (label, query) => scenario.mode === 'prefix' ? label.toLocaleLowerCase().startsWith(query.toLocaleLowerCase()) : label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    let accepted = null; let value = null; let inputState = initialInput; let open = scenario.initial.length > 0; let highlightedValue = null; let connection;
    connection = createCombobox({
      ...scenario.interaction,
      items, policies: { matches },
      ...(scenario.controlled ? {
        value, inputState, open, highlightedValue,
        onValueChange: ({ value: next }) => { value = next; queueMicrotask(sync); },
        onInputStateChange: ({ value: next }) => { inputState = next; queueMicrotask(sync); },
        onOpenChange: ({ value: next }) => { open = next; queueMicrotask(sync); },
        onHighlightedValueChange: ({ value: next }) => { highlightedValue = next; queueMicrotask(sync); },
      } : { defaultInputState: initialInput, defaultOpen: open }),
      onAccept: (id) => { accepted = id; }, onTransition: host.record, onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ value, inputState, open, highlightedValue }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { state } = connection.getSnapshot(); const query = connection.getInputValue(); const candidates = items.filter((item) => matches(item.label, query));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`, '', `query  ${plain(`${query || ''}${terminalInputCursor}${query ? '' : 'type to filter…'}`, Math.max(1, width - 7))}`, '',
          ...(state.popupOpen ? candidates.map((item) => terminalCell(item.label, Math.min(48, width), { current: state.cursor.current === item.id, selected: state.selection.has(item.id) })) : [`${ansi.dim}popup closed${ansi.reset}`]),
          '', `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}  accepted=${accepted ?? '−'}`, `matching=${scenario.mode}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createTreeGridDemo(host) {
  const rows = [
    { id: 'projects', parentID: null, cells: ['projects-name', 'projects-status'] },
    { id: 'atlas', parentID: 'projects', cells: ['atlas-name', 'atlas-status'] },
    { id: 'atlas-design', parentID: 'atlas', cells: ['atlas-design-name', 'atlas-design-status'] },
    { id: 'atlas-build', parentID: 'atlas', cells: ['atlas-build-name', 'atlas-build-status'] },
    { id: 'beacon', parentID: 'projects', cells: ['beacon-name', 'beacon-status'] },
    { id: 'archive', parentID: null, cells: ['archive-name', 'archive-status'] },
  ];
  const initialValues = [
    ['projects-name', 'Projects'], ['projects-status', 'Portfolio'], ['atlas-name', 'Atlas'], ['atlas-status', 'In progress'], ['atlas-design-name', 'Design system'], ['atlas-design-status', 'Review'], ['atlas-build-name', 'Implementation'], ['atlas-build-status', 'Active'], ['beacon-name', 'Beacon'], ['beacon-status', 'Planning'], ['archive-name', 'Archive'], ['archive-status', '12 items'],
  ];
  return scenarioDemo(host, [
    { title: 'Expanded project tree grid', expanded: ['projects', 'atlas'], disabled: [], controlled: false },
    { title: 'Collapsed portfolio rows', expanded: [], disabled: [], controlled: false },
    { title: 'Unavailable status cells', expanded: ['projects'], disabled: ['atlas-status', 'beacon-status'], controlled: false },
    { title: 'Controlled tree grid', expanded: ['projects', 'atlas'], disabled: [], controlled: true },
  ], (scenario) => {
    const values = new Map(initialValues); let expandedValue = [...scenario.expanded]; let value = null; let highlightedValue = 'projects-name'; let editMode = 'navigation'; let connection;
    connection = createTreeGrid({
      ...scenario.interaction,
      rows, policies: { eligible: (id) => !scenario.disabled.includes(id) },
      ...(scenario.controlled ? {
        expandedValue, value, highlightedValue, editMode,
        onExpandedValueChange: ({ value: next }) => { expandedValue = [...next]; queueMicrotask(sync); },
        onValueChange: ({ value: next }) => { value = next; queueMicrotask(sync); },
        onHighlightedValueChange: ({ value: next }) => { highlightedValue = next; queueMicrotask(sync); },
        onEditModeChange: ({ value: next }) => { editMode = next; queueMicrotask(sync); },
      } : { defaultExpandedValue: expandedValue, defaultHighlightedValue: highlightedValue }),
      getCellValue: (id) => values.get(id) ?? '', setCellValue: (id, next) => values.set(id, next), onTransition: host.record, onUpdate: host.render,
    });
    function sync() { connection.syncControlledValues({ expandedValue, value, highlightedValue, editMode }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { model } = connection; const { tree, grid } = model; const { state } = connection.getSnapshot(); const visibleRows = new Set(tree.visible(state.expansion).ids); const statusWidth = Math.max(10, Math.min(20, Math.floor(width * 0.28))); const nameWidth = Math.max(18, width - statusWidth - 1); const table = [`${ansi.dim}${plain('  Name', nameWidth)} ${plain('Status', statusWidth)}${ansi.reset}`];
        for (let rowIndex = 0; rowIndex < grid.rowCount; rowIndex += 1) {
          const rowID = model.rowIDs[rowIndex]; if (rowID === undefined || !visibleRows.has(rowID)) continue; const nameID = grid.cellAt(rowIndex, 0); const statusID = grid.cellAt(rowIndex, 1); if (nameID === null || statusID === null) continue; const depth = tree.depthOf(rowID) ?? 0; const disclosure = tree.isLeaf(rowID) === false ? state.expansion.has(rowID) ? '▾' : '▸' : '·';
          const cell = (id, label, cellWidth, prefix = '') => scenario.disabled.includes(id) ? `${ansi.dim}${plain(`${prefix}× ${label}`, cellWidth)}${ansi.reset}` : `${terminalCell(`${prefix}${label}`, cellWidth, { current: state.cursor.current === id, selected: state.selection.has(id), editing: state.cursor.current === id && state.editMode === 'editing' })}${state.cursor.current === id && state.editMode === 'editing' ? terminalInputCursor : ''}`;
          table.push(`${cell(nameID, values.get(nameID) ?? '', nameWidth, `${'  '.repeat(depth)}${disclosure} `)} ${cell(statusID, values.get(statusID) ?? '', statusWidth)}`);
        }
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}`, '', ...table, '',
          `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}`, `expanded=${state.expansion.ids.join(',') || '−'}  mode=${state.editMode}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}
