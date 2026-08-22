import { unwrap } from '@sectile/core/result';
import { createTextEditingState } from '@sectile/core/text';
import { createCalculatorExpression } from '@sectile/core/number-field';
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
import { createTreeGrid } from '@sectile/terminal/tree-grid';
import { createTreeView } from '@sectile/terminal/tree-view';
import { createTabs } from '@sectile/terminal/tabs'; import { createRadioGroup } from '@sectile/terminal/radio-group'; import { createToolbar } from '@sectile/terminal/toolbar'; import { createAccordion } from '@sectile/terminal/accordion'; import { createDisclosure } from '@sectile/terminal/disclosure'; import { createCheckbox } from '@sectile/terminal/checkbox'; import { createSwitch } from '@sectile/terminal/switch'; import { createToggleButton } from '@sectile/terminal/toggle-button'; import { createWindowSplitter } from '@sectile/terminal/window-splitter'; import { createSpinButton } from '@sectile/terminal/spin-button'; import { createDialog } from '@sectile/terminal/dialog'; import { createAlertDialog } from '@sectile/terminal/alert-dialog'; import { createTooltip } from '@sectile/terminal/tooltip'; import { createMultiThumbSlider } from '@sectile/terminal/multi-thumb-slider'; import { createGridControl } from '@sectile/terminal/grid'; import { createMenu } from '@sectile/terminal/menu'; import { createMenubar } from '@sectile/terminal/menubar'; import { createMenuButton } from '@sectile/terminal/menu-button'; import { createCarousel } from '@sectile/terminal/carousel'; import { createFeed } from '@sectile/terminal/feed';
import { createCheckboxGroup } from '@sectile/terminal/checkbox-group'; import { createSelect } from '@sectile/terminal/select'; import { createPagination } from '@sectile/terminal/pagination'; import { createStepper } from '@sectile/terminal/stepper'; import { createRating } from '@sectile/terminal/rating'; import { createPinInput } from '@sectile/terminal/pin-input'; import { createTagsInput } from '@sectile/terminal/tags-input';
import { ansi, plain, styled, terminalCell } from './ui.mjs';

const terminalCalendarMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});
const terminalCalendarShortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
});
const terminalStandardUnits = unwrap(createStandardUnitRegistry());
const terminalMetricUnits = unwrap(createMetricUnitSystem(terminalStandardUnits));
const terminalImperialUnits = unwrap(createImperialUnitSystem(terminalStandardUnits));

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
  { id: 'checkbox-group', label: 'Checkbox group', description: 'multiple values · disabled · controlled · [/] cases', readOnly: true, create: createCheckboxGroupDemo },
  { id: 'select', label: 'Select', description: 'open · move · choose · controlled · [/] cases', readOnly: true, create: createSelectDemo },
  { id: 'pagination', label: 'Pagination', description: 'previous/next · direct page · controlled · [/] cases', readOnly: true, create: createPaginationDemo },
  { id: 'stepper', label: 'Stepper', description: 'focus steps · activate · disabled · [/] cases', create: createStepperDemo },
  { id: 'rating', label: 'Rating', description: 'ordered score · clearable · controlled · [/] cases', readOnly: true, create: createRatingDemo },
  { id: 'pin-input', label: 'Pin input', description: 'cells · validation · completion · [/] cases', readOnly: true, create: createPinInputDemo },
  { id: 'tags-input', label: 'Tags input', description: 'draft · add/remove · limits · [/] cases', readOnly: true, create: createTagsInputDemo },
]);

function stateDemo(host, title, result) {
  const connection = unwrap(result);
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines() {
      const { revision, state } = connection.getSnapshot();
      return [`${ansi.bold}${title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, '', ...JSON.stringify(state, null, 2).split('\n')];
    },
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
    connection = unwrap(createGridControl({
      ...scenario.interaction,
      rows, policies: { boundary: scenario.boundary }, disabledItems: scenario.disabled,
      ...(scenario.controlled ? {
        value, highlightedValue, editMode,
        onValueChange: (next) => { value = next; queueMicrotask(sync); },
        onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); },
        onEditModeChange: (next) => { editMode = next; queueMicrotask(sync); },
      } : { defaultHighlightedValue: highlightedValue }),
      onEditStart: (id) => { notice = `editing ${id}`; }, onEditCommit: (id) => { notice = `committed ${id}`; }, onEditCancel: (id) => { notice = `cancelled ${id}`; }, onUpdate: host.render,
    }));
    function sync() { connection.syncControlledValues({ value, highlightedValue, editMode }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot(); const cellWidth = Math.max(10, Math.floor((width - 2) / 3));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}${notice}${ansi.reset}`, '',
          ...rows.map((row) => row.map((id) => scenario.disabled.includes(id)
            ? `${ansi.dim}${plain(`× ${id}`, cellWidth)}${ansi.reset}`
            : terminalCell(id, cellWidth, { current: state.cursor.current === id, selected: state.selection.has(id), editing: state.cursor.current === id && state.editMode === 'editing' })).join(' ')),
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
    connection = unwrap(createCarousel({
      ...scenario.interaction,
      slides: slides.map(([id]) => id), policies: { wrap: scenario.wrap }, orientation: scenario.orientation,
      ...(scenario.autoplayDelayMs === undefined ? {} : { autoplay: { delayMs: scenario.autoplayDelayMs, stopOnInteraction: false } }),
      ...(scenario.controlled ? { value, paused, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onPausedChange: (next) => { paused = next; queueMicrotask(sync); } } : { defaultValue: value, defaultPaused: paused }),
      onAnnounce: (id) => { announced = id; }, onUpdate: host.render,
    }));
    function sync() { connection.syncControlledValues({ value, paused }); }
    return {
      handle: (input) => /^[1-3]$/.test(input.key)
        ? connection.handleEvent({ type: 'focus', id: slides[Number(input.key) - 1][0] })
        : connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot(); const slide = slides.find(([id]) => id === state.cursor.current) ?? slides[0]; const position = connection.getPosition();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
    connection = unwrap(createFeed({ ...scenario.interaction, items: windowIDs, revision, onRequestWindow: (direction, anchor) => { request = `${direction} from ${anchor ?? 'none'}`; if (!scenario.load) { connection.handleEvent('clear-request'); return; } start = Math.max(0, Math.min(items.length - scenario.size, start + (direction === 'after' ? 1 : -1))); windowIDs = getWindow(); revision += 1; queueMicrotask(() => connection.syncWindow({ items: windowIDs, revision, highlightedValue: (direction === 'after' ? windowIDs.at(-1) : windowIDs[0]) ?? null })); }, onUpdate: host.render }));
    function getWindow() { return items.slice(start, start + scenario.size).map(([id]) => id); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const snapshot = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${snapshot.revision}${ansi.reset}`, `${ansi.dim}up/down · load-before/load-after${ansi.reset}`, '',
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
  const connection = unwrap(createListbox({
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
  }));
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
    connection = unwrap(createCheckboxGroup({ ...scenario.interaction, items: items.map(([id]) => id), disabledItems: scenario.disabled,
      ...(scenario.controlled ? { value, highlightedValue, onValueChange: (change) => { value = [...change.value]; queueMicrotask(sync); }, onHighlightedValueChange: (change) => { highlightedValue = change.value; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render,
    }));
    function sync() { connection.syncControlledValues({ value, highlightedValue }); }
    return { handle: (input) => connection.handleKeyboardInput(input), lines(width) { const { revision, state } = connection.getSnapshot(); return [`${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}up/down · space toggles independent choices${ansi.reset}`, '', ...items.map(([id, label, detail]) => scenario.disabled.includes(id) ? `${ansi.dim}${plain(`× ${label} — ${detail}`, Math.min(58, width))}${ansi.reset}` : terminalCell(`${state.selection.has(id) ? '☑' : '☐'} ${label} — ${detail}`, Math.min(58, width), { current: state.cursor.current === id, selected: state.selection.has(id) })), '', `selected=${state.selection.selected.join(',') || '−'}  current=${state.cursor.current ?? '−'}`, `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
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
    connection = unwrap(createSelect({ ...scenario.interaction, items: items.map(([id]) => id), disabledItems: scenario.disabled,
      ...(scenario.controlled ? { value, highlightedValue, open, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); }, onOpenChange: (next) => { open = next; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render,
    }));
    function sync() { connection.syncControlledValues({ value, highlightedValue, open }); }
    return { handle: (input) => connection.handleKeyboardInput(input), lines(width) { const { revision, state } = connection.getSnapshot(); const selected = state.choice.selection.selected[0] ?? null; return [`${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}up/down opens · enter selects · escape closes${ansi.reset}`, '', `${state.open ? '▾' : '▸'} ${items.find(([id]) => id === selected)?.[1] ?? 'Choose environment'}`, ...(state.open ? items.map(([id, label]) => scenario.disabled.includes(id) ? `${ansi.dim}  × ${label}${ansi.reset}` : terminalCell(`  ${label}`, Math.min(44, width), { current: state.choice.cursor.current === id, selected: state.choice.selection.has(id) })) : []), '', `open=${state.open}  value=${selected ?? '−'}  current=${state.choice.cursor.current ?? '−'}`, `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createPaginationDemo(host) {
  return scenarioDemo(host, [
    { title: 'Compact results', count: 5, value: '2', controlled: false },
    { title: 'Long result set', count: 9, value: '5', controlled: false },
    { title: 'Controlled page', count: 7, value: '3', controlled: true },
  ], (scenario) => {
    const items = Array.from({ length: scenario.count }, (_, index) => String(index + 1)); let value = scenario.value; let highlightedValue = scenario.value; let connection;
    connection = unwrap(createPagination({ ...scenario.interaction, items, ...(scenario.controlled ? { value, highlightedValue, onPageChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render }));
    function sync() { connection.syncControlledValues({ value, highlightedValue }); }
    return { handle: (input) => connection.handleKeyboardInput(input), lines() { const { revision, state } = connection.getSnapshot(); const page = state.selection.selected[0] ?? null; return [`${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}left/right · home/end${ansi.reset}`, '', items.map((id) => id === page ? `${ansi.inverse} ${id} ${ansi.reset}` : ` ${id} `).join(' '), '', `page=${page ?? '−'} of ${scenario.count}  current=${state.cursor.current ?? '−'}`, `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createStepperDemo(host) {
  const items = [['details', '1 Details'], ['verify', '2 Verify'], ['review', '3 Review']];
  return scenarioDemo(host, [
    { title: 'Checkout progress', value: 'details', disabled: [], controlled: false },
    { title: 'Gated verification', value: 'details', disabled: ['verify'], controlled: false },
    { title: 'Controlled onboarding', value: 'review', disabled: [], controlled: true },
  ], (scenario) => {
    let value = scenario.value; let highlightedValue = scenario.value; let connection;
    connection = unwrap(createStepper({ ...scenario.interaction, items: items.map(([id]) => id), disabledItems: scenario.disabled, ...(scenario.controlled ? { value, highlightedValue, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render }));
    function sync() { connection.syncControlledValues({ value, highlightedValue }); }
    return { handle: (input) => connection.handleKeyboardInput(input), lines(width) { const { revision, state } = connection.getSnapshot(); return [`${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}left/right moves focus · enter activates${ansi.reset}`, '', ...items.map(([id, label]) => scenario.disabled.includes(id) ? `${ansi.dim}× ${label}${ansi.reset}` : terminalCell(label, Math.min(40, width), { current: state.cursor.current === id, selected: state.selection.has(id) })), '', `step=${state.selection.selected[0] ?? '−'}  current=${state.cursor.current ?? '−'}`, `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createRatingDemo(host) {
  return scenarioDemo(host, [
    { title: 'Product rating', count: 5, value: '4', clearable: true, controlled: false },
    { title: 'Required feedback', count: 5, value: '3', clearable: false, controlled: false },
    { title: 'Controlled score', count: 10, value: '7', clearable: true, controlled: true },
  ], (scenario) => {
    const items = Array.from({ length: scenario.count }, (_, index) => String(index + 1)); let value = scenario.value; let highlightedValue = scenario.value; let connection;
    connection = unwrap(createRating({ ...scenario.interaction, items, clearable: scenario.clearable, ...(scenario.controlled ? { value, highlightedValue, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } } : { defaultValue: value, defaultHighlightedValue: highlightedValue }), onUpdate: host.render }));
    function sync() { connection.syncControlledValues({ value, highlightedValue }); }
    return { handle: (input) => input.key === 'c' ? connection.handleEvent('clear') : connection.handleKeyboardInput(input), lines() { const { revision, state } = connection.getSnapshot(); const selected = Number(state.selection.selected[0] ?? 0); return [`${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}left/right changes score${scenario.clearable ? ' · c clears' : ''}${ansi.reset}`, '', items.map((id) => Number(id) <= selected ? `${ansi.yellow}★${ansi.reset}` : `${ansi.dim}☆${ansi.reset}`).join(' '), '', `rating=${selected || '−'} of ${scenario.count}  current=${state.cursor.current ?? '−'}`, `clearable=${scenario.clearable}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createPinInputDemo(host) {
  return scenarioDemo(host, [
    { title: 'Verification code', length: 6, value: '', mode: 'numeric', controlled: false },
    { title: 'Prefilled access code', length: 4, value: '24', mode: 'numeric', controlled: false },
    { title: 'Controlled security key', length: 5, value: 'A7', mode: 'alphanumeric', controlled: true },
  ], (scenario) => {
    let value = scenario.value; let completed = null; let connection;
    connection = unwrap(createPinInput({ ...scenario.interaction, length: scenario.length, policies: { accept: (part) => scenario.mode === 'numeric' ? /^\d$/.test(part) : /^[a-z0-9]$/i.test(part) }, ...(scenario.controlled ? { value, onValueChange: (next) => { value = next; queueMicrotask(() => connection.syncControlledValue(value)); } } : { defaultValue: value }), onComplete: (next) => { completed = next; host.render(); }, onUpdate: host.render }));
    return { handle: (input) => connection.handleKeyboardInput(input), lines() { const { revision, state } = connection.getSnapshot(); return [`${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}type characters · left/right · backspace/delete${ansi.reset}`, '', state.values.map((part, index) => state.current === index ? `${ansi.inverse} ${part || '·'} ${ansi.reset}` : `[${part || '·'}]`).join(' '), '', `value=${state.values.join('')}  current=${state.current + 1}/${scenario.length}`, `complete=${completed ?? 'no'}  mode=${scenario.mode}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
  });
}

function createTagsInputDemo(host) {
  return scenarioDemo(host, [
    { title: 'Project skills', tags: ['TypeScript', 'Accessibility'], maxTags: 8, controlled: false },
    { title: 'Limited labels', tags: ['Bug', 'Urgent'], maxTags: 3, controlled: false },
    { title: 'Controlled recipients', tags: ['Design', 'Platform'], maxTags: 6, controlled: true },
  ], (scenario) => {
    let value = [...scenario.tags]; let inputValue = ''; let connection;
    connection = unwrap(createTagsInput({ ...scenario.interaction, policies: { maxTags: scenario.maxTags, normalize: (tag) => tag.trim().replace(/\s+/g, ' ') }, ...(scenario.controlled ? { value, inputValue, onValueChange: (next) => { value = [...next]; queueMicrotask(sync); }, onInputValueChange: (next) => { inputValue = next; queueMicrotask(sync); } } : { defaultValue: value }), onUpdate: host.render }));
    function sync() { connection.syncControlledValues({ value, inputValue }); }
    return { handle: (input) => connection.handleKeyboardInput(input), lines() { const { revision, state } = connection.getSnapshot(); return [`${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, `${ansi.dim}type · enter/comma adds · backspace removes${ansi.reset}`, '', state.tags.map((tag, index) => state.current === index ? `${ansi.inverse} ${tag} × ${ansi.reset}` : `[${tag} ×]`).join(' ') || `${ansi.dim}No tags${ansi.reset}`, '', `draft=${state.draft || '−'}  tags=${state.tags.length}/${scenario.maxTags}  current=${state.current ?? 'input'}`, `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`]; } };
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
  let index = 0;
  let session = create(scenarios[index]);
  return {
    handle(input) {
      if (input.key === previousCaseKey || input.key === nextCaseKey) {
        session.disconnect?.();
        index = (index + (input.key === nextCaseKey ? 1 : -1) + scenarios.length) % scenarios.length;
        session = create(scenarios[index]);
        host.render();
        return true;
      }
      return session.handle(input);
    },
    lines(width) {
      const interaction = scenarios[index]?.interaction?.disabled
        ? 'disabled · input rejected'
        : scenarios[index]?.interaction?.readOnly
          ? 'read-only · navigation allowed, mutation rejected'
          : null;
      return [
        `${ansi.dim}case ${index + 1}/${scenarios.length} · ${previousCaseKey} / ${nextCaseKey} switch${ansi.reset}`,
        ...(interaction === null ? [] : [`${ansi.yellow}${interaction}${ansi.reset}`]),
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
      { title: kind === 'switch' ? 'Notifications off' : 'Formatting off', initial: false, controlled: false },
      { title: kind === 'switch' ? 'Notifications on' : 'Formatting on', initial: true, controlled: false },
      { title: 'Controlled state', initial: true, controlled: true },
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
    const items = ['general', 'deployments', 'danger'];
    let external = ['general'];
    let connection;
    connection = unwrap(createAccordion({
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
    }));
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
          `${ansi.dim}${scenario.expansion} · collapsible=${scenario.collapsible}${ansi.reset}`,
          '',
          ...items.map((id) => scenario.disabledItems.includes(id)
            ? `${ansi.dim}${plain(` × ${id}`, Math.min(48, width))}${ansi.reset}`
            : terminalCell(`${state.has(id) ? '▾' : '▸'} ${id}`, Math.min(48, width), {
              current: state.cursor.current === id,
              selected: state.has(id),
            })),
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
    connection = unwrap(createDisclosure({
      ...scenario.interaction,
      ...(scenario.controlled ? {
        open: external,
        onOpenChange: (open) => {
          external = open;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultOpen: scenario.initial }),
      onUpdate: host.render,
    }));
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
    const connection = unwrap(createTabs({
      ...scenario.interaction,
      items,
      defaultValue: 'overview',
      defaultHighlightedValue: 'overview',
      orientation: scenario.orientation,
      disabledItems: scenario.disabledItems,
      policies: { activation: scenario.activation },
      onUpdate: host.render,
    }));
    return linearSession(connection, scenario, items, (state, id) => state.selection.has(id));
  }
  if (kind === 'radio-group') {
    const items = ['compact', 'comfortable', 'spacious'];
    let external = 'comfortable';
    let connection;
    connection = unwrap(createRadioGroup({
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
    }));
    return linearSession(connection, scenario, items, (state, id) => state.selection.has(id));
  }
  const items = ['bold', 'italic', 'code', 'list'];
  let external = 'bold';
  let invoked = null;
  let connection;
  connection = unwrap(createToolbar({
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
  }));
  return linearSession(connection, scenario, items, () => false, () => `invoked=${invoked ?? '−'}`);
}

function linearSession(connection, scenario, items, selected, footer = () => '') {
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
    connection = unwrap(createCheckbox({
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
    }));
  } else if (kind === 'switch') {
    connection = unwrap(createSwitch({
      ...scenario.interaction,
      ...(scenario.controlled ? {
        checked: external,
        onCheckedChange: (value) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultChecked: scenario.initial }),
      onUpdate: host.render,
    }));
  } else {
    connection = unwrap(createToggleButton({
      ...scenario.interaction,
      ...(scenario.controlled ? {
        pressed: external,
        onPressedChange: (value) => {
          external = value;
          queueMicrotask(() => connection.syncControlledValue(external));
        },
      } : { defaultPressed: scenario.initial }),
      onUpdate: host.render,
    }));
  }
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines() {
      const { revision, state } = connection.getSnapshot();
      const value = kind === 'toggle-button' ? state.pressed : state.checked;
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '',
        `${value === true ? '[●]' : value === 'mixed' ? '[◐]' : '[ ]'} ${kind === 'switch' ? 'Deployment notifications' : kind === 'checkbox' ? 'Include analytics' : 'Bold formatting'}`,
        '',
        `value=${String(value)}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
      ];
    },
  };
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
  connection = unwrap(createSlider({
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
  }));
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      const barWidth = Math.max(10, Math.min(48, width - 4));
      const fill = connection.range.count === 0 ? 0 : Math.round(barWidth * state.tick / connection.range.count);
      return [
        `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
    connection = unwrap(createWindowSplitter({
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
    }));
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const barWidth = Math.max(12, Math.min(48, width - 4));
        const first = Math.round(barWidth * state.tick / 100);
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
    connection = unwrap(createSpinButton({
      ...scenario.interaction,
      min: scenario.min, max: scenario.max, step: scenario.step, policies: { page: 3 },
      ...(scenario.controlled ? {
        value: externalValue, draft: externalDraft,
        onValueChange: (value) => { externalValue = value; queueMicrotask(sync); },
        onDraftChange: (draft) => { externalDraft = draft; queueMicrotask(sync); },
      } : { defaultValue: scenario.initial, defaultDraft: scenario.draft }),
      onUpdate: host.render,
    }));
    function sync() { connection.syncControlledValues({ value: externalValue, draft: externalDraft }); }
    return {
      handle(input) {
        if (input.key.length === 1 && !input.ctrlKey && !input.metaKey) return connection.handleTextInput(input.key);
        return connection.handleKeyboardInput(input);
      },
      lines() {
        const { revision, state } = connection.getSnapshot();
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
          `${ansi.dim}type draft · Enter commit · Escape cancel${ansi.reset}`,
          '', `[-]  ${styled(ansi.cyan, connection.getText(), 12)}  [+]`, '',
          `value=${state.value}  draft=${state.draft ?? '−'}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}

function createNumberFieldDemo(host) {
  const evaluator = unwrap(createCalculatorExpression({ precision: 12, rounding: 'half-even' }));
  return scenarioDemo(host, [
    { title: 'Exact decimal input', initial: '0.000000000000000001', draft: null, evaluator: null, controlled: false, detail: 'decimal text without a step lattice' },
    { title: 'Calculator percentage', initial: '50', draft: '50-20%', evaluator, controlled: false, detail: '50-20% commits 40' },
    { title: 'Exponent expression', initial: '2', draft: '2^3^2', evaluator, controlled: false, detail: '^ is right-associative' },
    { title: 'Controlled calculation', initial: '1', draft: '1/3', evaluator, controlled: true, detail: 'external value and draft ownership' },
  ], (scenario) => {
    let externalValue = scenario.initial;
    let externalInput = numberFieldEditing(scenario.draft ?? scenario.initial);
    let connection;
    connection = unwrap(createNumberField({
      ...scenario.interaction,
      ...(scenario.evaluator === null ? {} : { policies: { evaluator: scenario.evaluator } }),
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
    }));
    function sync() { connection.syncControlledValues({ value: externalValue, inputState: externalInput }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const text = connection.getText();
        const caret = connection.getCaret();
        const editing = `${text.slice(0, caret)}${ansi.cyan}│${ansi.reset}${text.slice(caret)}`;
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
  const evaluator = unwrap(createCalculatorExpression({ precision: 12, rounding: 'half-even' }));
  return scenarioDemo(host, [
    {
      title: 'Metric length', registry: terminalStandardUnits, unitSystem: terminalMetricUnits, canonicalUnit: 'metre',
      quantity: { value: '1', unit: 'metre' }, displayUnit: null, evaluator: null,
      draft: null, controlled: false, detail: '150cm or 12in · canonical metres',
    },
    {
      title: 'Affine temperature', registry: terminalStandardUnits, unitSystem: terminalMetricUnits, canonicalUnit: 'kelvin',
      quantity: { value: '295.15', unit: 'kelvin' }, displayUnit: null, evaluator: null,
      draft: null, controlled: false, detail: '22°C or 32°F · canonical Kelvin',
    },
    {
      title: 'Unit calculator', registry: terminalStandardUnits, unitSystem: terminalMetricUnits, canonicalUnit: 'metre',
      quantity: { value: '0.5', unit: 'metre' }, displayUnit: 'centimetre', evaluator,
      draft: '100-20% cm', controlled: false, detail: 'calculator syntax and unit suffix compose',
    },
    {
      title: 'Compound acceleration', registry: terminalStandardUnits, unitSystem: terminalMetricUnits,
      canonicalUnit: 'metre-per-second-squared', quantity: { value: '9.8', unit: 'metre-per-second-squared' },
      displayUnit: null, evaluator: null, draft: '9.8 m/s²', controlled: false,
      detail: 'division and superscript dimensions',
    },
    {
      title: 'Controlled imperial quantity', registry: terminalStandardUnits, unitSystem: terminalImperialUnits,
      canonicalUnit: 'metre', quantity: { value: '1.2', unit: 'metre' }, displayUnit: null, evaluator,
      draft: null, controlled: true, detail: 'profile default plus external ownership',
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
    connection = unwrap(createQuantityField({
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
    }));
    function sync() { connection.syncControlledValues({ quantity: externalQuantity, displayUnit: externalUnit, inputState: externalInput }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const text = connection.getText();
        const caret = connection.getCaret();
        const editing = `${text.slice(0, caret)}${ansi.cyan}│${ansi.reset}${text.slice(caret)}`;
        const displaySymbol = scenario.registry.get(state.displayUnit)?.symbol ?? state.displayUnit;
        const canonicalSymbol = scenario.registry.get(scenario.canonicalUnit)?.symbol ?? scenario.canonicalUnit;
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
          `${ansi.dim}${scenario.detail} · [ / ] unit · Enter commit${ansi.reset}`,
          '', `${plain(editing, Math.max(1, width - 10))}  ${styled(ansi.cyan, displaySymbol, 4)}`, '',
          `canonical=${state.quantity?.value ?? '−'} ${canonicalSymbol}  display=${state.displayUnit}`,
          `ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  }, { previousCaseKey: '{', nextCaseKey: '}' });
}

function numberFieldEditing(text) {
  return unwrap(createTextEditingState(text, {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  }));
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
    connection = unwrap(createMultiThumbSlider({
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
    }));
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const barWidth = Math.max(12, Math.min(48, width - 4));
        const markers = Array.from({ length: barWidth + 1 }, () => '·');
        state.ticks.forEach((tick, index) => { markers[Math.round(tick / 100 * barWidth)] = state.cursor.current === scenario.ids[index] ? '●' : '○'; });
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
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
    connection = unwrap(kind === 'dialog'
      ? createDialog({ ...shared, onInitialFocus: () => { focusRequests += 1; }, onFocusRestore: () => { restoreRequests += 1; } })
      : kind === 'alert-dialog'
        ? createAlertDialog({ ...shared, onInitialFocus: () => { focusRequests += 1; }, onFocusRestore: () => { restoreRequests += 1; }, onAnnounce: () => { announcements += 1; } })
        : createTooltip(shared));
    return {
      handle(input) {
        if (input.key === 'enter' || input.key === 'space') return connection.handleEvent(connection.getSnapshot().state.open ? 'close' : 'open');
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const frame = Math.max(20, Math.min(48, width - 4));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
          `${ansi.dim}${scenario.detail}${ansi.reset}`,
          '',
          state.open ? `┌${'─'.repeat(frame - 2)}┐` : `${ansi.dim}[ Enter to open ]${ansi.reset}`,
          ...(state.open ? [`│ ${plain(kind === 'tooltip' ? 'Helpful description' : scenario.title, frame - 4)} │`, `└${'─'.repeat(frame - 2)}┘`] : []),
          '',
          `open=${state.open}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
          `focus=${focusRequests}  restore=${restoreRequests}  announce=${announcements}`,
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
    connection = unwrap(kind === 'menu'
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
        }));
    return {
      handle(input) {
        if (kind === 'menu-button' && !connection.getSnapshot().state.open && (input.key === 'enter' || input.key === 'space')) return connection.handleEvent('open-popup');
        return connection.handleKeyboardInput(input);
      },
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const visible = scenario.items.filter((item) => item.parentID === null || state.openPath.includes(item.parentID));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
          `${ansi.dim}Home/End · typeahead · arrows · Enter${ansi.reset}`,
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
      return unwrap(createCalendar({
        ...scenario.interaction,
        rows: page.rows, policies: { eligible: (id) => !scenario.disabledWeekends || !isTerminalWeekend(id) },
        ...(scenario.controlled ? { value: visibleValue, highlightedValue } : { defaultValue: visibleValue, defaultHighlightedValue: highlightedValue }),
        onValueChange: ({ value }) => { selectedDate = value; if (scenario.controlled) queueMicrotask(sync); },
        onHighlightedValueChange: ({ value }) => { highlightedDate = value; if (scenario.controlled) queueMicrotask(sync); },
        onPageRequest: ({ direction, from }) => { const target = shiftCalendarMonth(page.date, direction, from); page = createCalendarMonth(target); highlightedDate = calendarDateID(target); connection = connect(highlightedDate); },
        onTransition: host.record, onUpdate: host.render,
      }));
    }
    function sync() { connection.syncControlledValues({ value: selectedDate !== null && page.ids.has(selectedDate) ? selectedDate : null, highlightedValue: highlightedDate !== null && page.ids.has(highlightedDate) ? highlightedDate : null }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot(); const cellWidth = Math.max(5, Math.min(8, Math.floor((width - 6) / 7)));
        return [
          `${ansi.bold}${scenario.title} · ${page.label}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, '',
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => plain(day, cellWidth)).join(' '),
          ...page.rows.map((week) => week.map((id) => isTerminalWeekend(id) && scenario.disabledWeekends
            ? `${ansi.dim}${plain(calendarCellLabel(id, page), cellWidth)}${ansi.reset}`
            : terminalCell(calendarCellLabel(id, page), cellWidth, { current: state.cursor.current === id, selected: state.selection.has(id) })).join(' ')),
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

function calendarCellLabel(id, page) {
  const date = calendarDateFromID(id);
  return date.getMonth() === page.date.getMonth()
    ? String(date.getDate())
    : `${terminalCalendarShortMonthFormatter.format(date)}${date.getDate()}`;
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
    { title: 'Expanded source explorer', expanded: ['src', 'components'], selected: [], disabled: [], controlled: false },
    { title: 'Collapsed workspace roots', expanded: [], selected: ['readme'], disabled: [], controlled: false },
    { title: 'Multiple file selection', expanded: ['src', 'components', 'utils'], selected: ['button', 'format'], disabled: [], controlled: false },
    { title: 'Unavailable subtree', expanded: ['src'], selected: [], disabled: ['utils'], controlled: false },
    { title: 'Controlled source explorer', expanded: ['src'], selected: ['readme'], disabled: [], controlled: true },
  ], (scenario) => {
    let expandedValue = [...scenario.expanded]; let value = [...scenario.selected]; let highlightedValue = 'src'; let connection;
    connection = unwrap(createTreeView({
      ...scenario.interaction,
      nodes,
      disabledItems: scenario.disabled,
      ...(scenario.controlled ? {
        expandedValue, value, highlightedValue,
        onExpandedValueChange: ({ value: next }) => { expandedValue = [...next]; queueMicrotask(sync); },
        onValueChange: ({ value: next }) => { value = [...next]; queueMicrotask(sync); },
        onHighlightedValueChange: ({ value: next }) => { highlightedValue = next; queueMicrotask(sync); },
      } : { defaultExpandedValue: expandedValue, defaultValue: value, defaultHighlightedValue: highlightedValue }),
      onTransition: host.record, onUpdate: host.render,
    }));
    function sync() { connection.syncControlledValues({ expandedValue, value, highlightedValue }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const visibleItems = connection.tree.visible(state.expansion).ids.map((id) => {
          const leaf = connection.tree.isLeaf(id); const disclosure = leaf ? '·' : state.expansion.has(id) ? '▾' : '▸'; const depth = connection.tree.depthOf(id) ?? 0;
          return scenario.disabled.includes(id) ? `${ansi.dim}${plain(`${'  '.repeat(depth)}× ${labels.get(id) ?? id}`, Math.min(58, width))}${ansi.reset}` : terminalCell(`${'  '.repeat(depth)}${disclosure} ${labels.get(id) ?? id}`, Math.min(58, width), { current: state.cursor.current === id, selected: state.selection.has(id) });
        });
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, '', ...visibleItems, '',
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
    const initial = unwrap(createTextEditingState(scenario.initial, {
      anchorCodeUnitOffset: scenario.start ?? scenario.initial.length,
      focusCodeUnitOffset: scenario.end ?? scenario.start ?? scenario.initial.length,
    }));
    let external = initial;
    let connection;
    connection = unwrap(createText({
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
    }));
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot();
        const value = connection.getValue();
        const caret = Math.min(width - 1, state.snapshot.selection.focusCodeUnitOffset);
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
          `${ansi.dim}Unicode-safe replace · ${scenario.controlled ? 'controlled' : 'uncontrolled'}${ansi.reset}`,
          '',
          ...value.split('\n').map((line) => plain(line || ' ', width)),
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
    const initialInput = unwrap(createTextEditingState(scenario.initial, { anchorCodeUnitOffset: scenario.initial.length, focusCodeUnitOffset: scenario.initial.length }));
    const matches = (label, query) => scenario.mode === 'prefix' ? label.toLocaleLowerCase().startsWith(query.toLocaleLowerCase()) : label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    let accepted = null; let value = null; let inputState = initialInput; let open = scenario.initial.length > 0; let highlightedValue = null; let connection;
    connection = unwrap(createCombobox({
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
    }));
    function sync() { connection.syncControlledValues({ value, inputState, open, highlightedValue }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { revision, state } = connection.getSnapshot(); const query = connection.getInputValue(); const candidates = items.filter((item) => matches(item.label, query));
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, '', `query  ${plain(query || 'type to filter…', Math.max(1, width - 7))}`, '',
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
    connection = unwrap(createTreeGrid({
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
    }));
    function sync() { connection.syncControlledValues({ expandedValue, value, highlightedValue, editMode }); }
    return {
      handle: (input) => connection.handleKeyboardInput(input),
      lines(width) {
        const { model } = connection; const { tree, grid } = model; const { revision, state } = connection.getSnapshot(); const visibleRows = new Set(tree.visible(state.expansion).ids); const statusWidth = Math.max(10, Math.min(20, Math.floor(width * 0.28))); const nameWidth = Math.max(18, width - statusWidth - 1); const table = [`${ansi.dim}${plain('  Name', nameWidth)} ${plain('Status', statusWidth)}${ansi.reset}`];
        for (let rowIndex = 0; rowIndex < grid.rowCount; rowIndex += 1) {
          const rowID = model.rowIDs[rowIndex]; if (rowID === undefined || !visibleRows.has(rowID)) continue; const nameID = grid.cellAt(rowIndex, 0); const statusID = grid.cellAt(rowIndex, 1); if (nameID === null || statusID === null) continue; const depth = tree.depthOf(rowID) ?? 0; const disclosure = tree.isLeaf(rowID) === false ? state.expansion.has(rowID) ? '▾' : '▸' : '·';
          const cell = (id, label, cellWidth, prefix = '') => scenario.disabled.includes(id) ? `${ansi.dim}${plain(`${prefix}× ${label}`, cellWidth)}${ansi.reset}` : terminalCell(`${prefix}${label}`, cellWidth, { current: state.cursor.current === id, selected: state.selection.has(id), editing: state.cursor.current === id && state.editMode === 'editing' });
          table.push(`${cell(nameID, values.get(nameID) ?? '', nameWidth, `${'  '.repeat(depth)}${disclosure} `)} ${cell(statusID, values.get(statusID) ?? '', statusWidth)}`);
        }
        return [
          `${ansi.bold}${scenario.title}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`, '', ...table, '',
          `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}`, `expanded=${state.expansion.ids.join(',') || '−'}  mode=${state.editMode}  ownership=${scenario.controlled ? 'controlled' : 'uncontrolled'}`,
        ];
      },
    };
  });
}
