import { unwrap } from '@sectile/primitives/result';
import { createTextEditingState } from '@sectile/primitives/text';
import { createCalendar } from '@sectile/terminal/calendar';
import { createCombobox } from '@sectile/terminal/combobox';
import { createListbox } from '@sectile/terminal/listbox';
import { createSlider } from '@sectile/terminal/slider';
import { createText } from '@sectile/terminal/text';
import { createTreeGrid } from '@sectile/terminal/tree-grid';
import { createTreeView } from '@sectile/terminal/tree-view';
import { createTabs } from '@sectile/terminal/tabs'; import { createRadioGroup } from '@sectile/terminal/radio-group'; import { createToolbar } from '@sectile/terminal/toolbar'; import { createAccordion } from '@sectile/terminal/accordion'; import { createDisclosure } from '@sectile/terminal/disclosure'; import { createCheckbox } from '@sectile/terminal/checkbox'; import { createSwitch } from '@sectile/terminal/switch'; import { createToggleButton } from '@sectile/terminal/toggle-button'; import { createWindowSplitter } from '@sectile/terminal/window-splitter'; import { createSpinButton } from '@sectile/terminal/spin-button'; import { createDialog } from '@sectile/terminal/dialog'; import { createAlertDialog } from '@sectile/terminal/alert-dialog'; import { createTooltip } from '@sectile/terminal/tooltip'; import { createMultiThumbSlider } from '@sectile/terminal/multi-thumb-slider'; import { createGridControl } from '@sectile/terminal/grid'; import { createMenu } from '@sectile/terminal/menu'; import { createMenubar } from '@sectile/terminal/menubar'; import { createMenuButton } from '@sectile/terminal/menu-button'; import { createCarousel } from '@sectile/terminal/carousel'; import { createFeed } from '@sectile/terminal/feed';
import { ansi, plain, styled, terminalCell } from './ui.mjs';

const terminalCalendarMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});
const terminalCalendarShortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
});

export const demos = Object.freeze([
  { id: 'listbox', label: 'Listbox', description: 'move · space select · enter activate · esc clear', create: createListboxDemo },
  { id: 'slider', label: 'Slider', description: 'arrows step · page up/down · home/end', create: createSliderDemo },
  { id: 'calendar', label: 'Calendar', description: 'arrows move · enter select · page up/down', create: createCalendarDemo },
  { id: 'tree-view', label: 'Tree view', description: 'up/down move · left/right collapse/expand · space select', create: createTreeViewDemo },
  { id: 'text', label: 'Text', description: 'type text · backspace/delete edit', create: createTextDemo },
  { id: 'combobox', label: 'Combobox', description: 'type filter · up/down move · enter accept · esc close', create: createComboboxDemo },
  { id: 'tree-grid', label: 'Tree grid', description: 'arrows move · alt+left/right or c/o fold · enter edit', create: createTreeGridDemo },
  { id: 'tabs', label: 'Tabs', description: 'left/right move · enter activate', create: (host) => stateDemo(host, 'Tabs', createTabs({ items: ['one', 'two'], defaultValue: 'one', defaultHighlightedValue: 'one', onUpdate: host.render })) },
  { id: 'radio-group', label: 'Radio group', description: 'left/right checks', create: (host) => stateDemo(host, 'Radio group', createRadioGroup({ items: ['a', 'b'], defaultValue: 'a', onUpdate: host.render })) },
  { id: 'toolbar', label: 'Toolbar', description: 'left/right move · enter invoke', create: (host) => stateDemo(host, 'Toolbar', createToolbar({ items: ['bold', 'italic'], defaultHighlightedValue: 'bold', onUpdate: host.render })) },
  { id: 'accordion', label: 'Accordion', description: 'up/down move · enter toggle', create: (host) => stateDemo(host, 'Accordion', createAccordion({ items: ['one', 'two'], defaultHighlightedValue: 'one', onUpdate: host.render })) },
  { id: 'disclosure', label: 'Disclosure', description: 'enter/space toggle', create: (host) => stateDemo(host, 'Disclosure', createDisclosure({ onUpdate: host.render })) },
  { id: 'checkbox', label: 'Checkbox', description: 'space toggles mixed/checked', create: (host) => stateDemo(host, 'Checkbox', createCheckbox({ defaultValue: 'mixed', onUpdate: host.render })) },
  { id: 'switch', label: 'Switch', description: 'space toggles', create: (host) => stateDemo(host, 'Switch', createSwitch({ onUpdate: host.render })) },
  { id: 'toggle-button', label: 'Toggle button', description: 'enter/space toggles', create: (host) => stateDemo(host, 'Toggle button', createToggleButton({ onUpdate: host.render })) },
  { id: 'window-splitter', label: 'Window splitter', description: 'arrows resize', create: (host) => stateDemo(host, 'Window splitter', createWindowSplitter({ min: '0', max: '10', step: '1', defaultValue: 5, onUpdate: host.render })) },
  { id: 'spin-button', label: 'Spin Button', description: 'up/down adjust · type draft · enter commit', create: (host) => stateDemo(host, 'Spin Button', createSpinButton({ min: '0', max: '10', step: '1', defaultValue: 5, onUpdate: host.render })) },
  { id: 'dialog', label: 'Dialog', description: 'escape closes', create: (host) => stateDemo(host, 'Dialog', createDialog({ defaultOpen: true, onUpdate: host.render })) },
  { id: 'alert-dialog', label: 'Alert dialog', description: 'escape closes and announces', create: (host) => stateDemo(host, 'Alert dialog', createAlertDialog({ defaultOpen: true, onUpdate: host.render })) },
  { id: 'tooltip', label: 'Tooltip', description: 'escape hides', create: (host) => stateDemo(host, 'Tooltip', createTooltip({ defaultOpen: true, onUpdate: host.render })) },
  { id: 'multi-thumb-slider', label: 'Multi-thumb slider', description: 'arrows adjust · tab changes thumb', create: (host) => stateDemo(host, 'Multi-thumb slider', createMultiThumbSlider({ thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValues: [2, 8], policies: { minGap: 2 }, onUpdate: host.render })) },
  { id: 'grid', label: 'Grid', description: 'arrows move · space select · enter edit', create: (host) => stateDemo(host, 'Grid', createGridControl({ rows: [['a', 'b'], ['c', 'd']], defaultHighlightedValue: 'a', onUpdate: host.render })) },
  { id: 'menu', label: 'Menu', description: 'arrows navigate · enter invoke', create: (host) => stateDemo(host, 'Menu', createMenu({ items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }], defaultHighlightedValue: 'file', onUpdate: host.render })) },
  { id: 'menubar', label: 'Menubar', description: 'left/right roots · down opens', create: (host) => stateDemo(host, 'Menubar', createMenubar({ items: [{ id: 'file', parentID: null }, { id: 'edit', parentID: null }], defaultHighlightedValue: 'file', onUpdate: host.render })) },
  { id: 'menu-button', label: 'Menu button', description: 'open then navigate/invoke', create: (host) => stateDemo(host, 'Menu button', createMenuButton({ items: [{ id: 'copy', parentID: null }], defaultOpen: true, defaultHighlightedValue: 'copy', onUpdate: host.render })) },
  { id: 'carousel', label: 'Carousel', description: 'left/right move · space pause', create: (host) => stateDemo(host, 'Carousel', createCarousel({ slides: ['one', 'two', 'three'], onUpdate: host.render })) },
  { id: 'feed', label: 'Feed', description: 'up/down move · load-before/load-after request', create: (host) => stateDemo(host, 'Feed', createFeed({ items: ['one', 'two'], onUpdate: host.render })) },
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

function createListboxDemo(host) {
  const items = [
    ['alpha', 'Alpha release', 'Stable channel'],
    ['beta', 'Beta release', 'Preview channel'],
    ['nightly', 'Nightly build', 'Latest changes'],
    ['legacy', 'Legacy build', 'Maintenance only'],
  ];
  let activated = null;
  const connection = unwrap(createListbox({
    items: items.map(([id]) => id),
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
        `${ansi.bold}Release channels${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '',
        ...items.map(([id, label, detail]) => terminalCell(
          `${label}  ${detail}`,
          Math.min(58, width),
          { current: state.cursor.current === id, selected: state.selection.has(id) },
        )),
        '',
        `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}  activated=${activated ?? '−'}`,
      ];
    },
  };
}

function createSliderDemo(host) {
  const connection = unwrap(createSlider({
    min: '0', max: '100', step: '5', page: 4, defaultValue: 8,
    onTransition: host.record,
    onUpdate: host.render,
  }));
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      const value = Number(connection.getValue());
      const barWidth = Math.max(10, Math.min(48, width - 4));
      const fill = Math.round(barWidth * value / 100);
      return [
        `${ansi.bold}Deployment traffic${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '',
        styled(ansi.cyan, `${value}%`, Math.min(width, 12)),
        `[${'█'.repeat(fill)}${'·'.repeat(barWidth - fill)}]`,
        '0%'.padEnd(barWidth - 1) + '100%',
        '',
        `tick=${state.tick}  value=${connection.getValue()}`,
      ];
    },
  };
}

function createCalendarDemo(host) {
  const today = new Date();
  const todayID = calendarDateID(today);
  let page = createCalendarMonth(today);
  let selectedDate = todayID;
  let connection = connect(todayID);

  function connect(highlightedValue) {
    const visibleValue = page.ids.has(selectedDate) ? selectedDate : null;
    return unwrap(createCalendar({
      rows: page.rows,
      defaultValue: visibleValue,
      defaultHighlightedValue: highlightedValue,
      onValueChange: ({ value }) => { selectedDate = value; },
      onPageRequest: ({ direction, from }) => {
        const target = shiftCalendarMonth(page.date, direction, from);
        page = createCalendarMonth(target);
        connection = connect(calendarDateID(target));
      },
      onTransition: host.record,
      onUpdate: host.render,
    }));
  }

  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      const cellWidth = Math.max(5, Math.min(8, Math.floor((width - 6) / 7)));
      return [
        `${ansi.bold}${page.label}${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '',
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => plain(day, cellWidth)).join(' '),
        ...page.rows.map((week) => week.map((id) => terminalCell(calendarCellLabel(id, page), cellWidth, {
          current: state.cursor.current === id,
          selected: state.selection.has(id),
        })).join(' ')),
        '',
        `view=${page.key}  current=${state.cursor.current ?? '−'}`,
        `selected=${selectedDate ?? '−'}  visible=${state.selection.selected.join(',') || '−'}`,
      ];
    },
  };
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
  const connection = unwrap(createTreeView({
    nodes,
    defaultExpandedValue: ['src', 'components'],
    defaultHighlightedValue: 'src',
    onTransition: host.record,
    onUpdate: host.render,
  }));
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      const items = connection.tree.visible(state.expansion).ids.map((id) => {
        const leaf = connection.tree.isLeaf(id);
        const disclosure = leaf ? '·' : state.expansion.has(id) ? '▾' : '▸';
        const depth = connection.tree.depthOf(id) ?? 0;
        return terminalCell(`${'  '.repeat(depth)}${disclosure} ${labels.get(id) ?? id}`, Math.min(58, width), {
          current: state.cursor.current === id,
          selected: state.selection.has(id),
        });
      });
      return [
        `${ansi.bold}Source explorer${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '', ...items, '',
        `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}`,
        `expanded=${state.expansion.ids.join(',') || '−'}`,
      ];
    },
  };
}

function createTextDemo(host) {
  const initial = '한글 and text';
  const connection = unwrap(createText({
    defaultValue: unwrap(createTextEditingState(initial, {
      anchorCodeUnitOffset: initial.length,
      focusCodeUnitOffset: initial.length,
    })),
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
        `${ansi.bold}IME-aware text editing${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '',
        plain(value || ' ', width),
        `${' '.repeat(Math.max(0, caret))}${ansi.cyan}▲${ansi.reset}`,
        '',
        `length=${value.length}  selection=${state.snapshot.selection.startCodeUnitOffset}:${state.snapshot.selection.endCodeUnitOffset}`,
      ];
    },
  };
}

function createComboboxDemo(host) {
  const items = [
    { id: 'alpha', label: 'Alpha' }, { id: 'alpine', label: 'Alpine' },
    { id: 'beta', label: 'Beta' }, { id: 'gamma', label: 'Gamma' },
    { id: 'hangul', label: '한글' },
  ];
  const matches = (label, query) => label.toLocaleLowerCase().startsWith(query.toLocaleLowerCase());
  let accepted = null;
  const connection = unwrap(createCombobox({
    items,
    policies: { matches },
    onAccept: (id) => { accepted = id; },
    onTransition: host.record,
    onUpdate: host.render,
  }));
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      const query = connection.getInputValue();
      const candidates = items.filter((item) => matches(item.label, query));
      return [
        `${ansi.bold}Command search${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '',
        `query  ${plain(query || 'type to filter…', Math.max(1, width - 7))}`,
        '',
        ...(state.popupOpen ? candidates.map((item) => terminalCell(item.label, Math.min(48, width), {
          current: state.cursor.current === item.id,
          selected: state.selection.has(item.id),
        })) : [`${ansi.dim}popup closed${ansi.reset}`]),
        '',
        `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}  accepted=${accepted ?? '−'}`,
      ];
    },
  };
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
  const values = new Map([
    ['projects-name', 'Projects'], ['projects-status', 'Portfolio'],
    ['atlas-name', 'Atlas'], ['atlas-status', 'In progress'],
    ['atlas-design-name', 'Design system'], ['atlas-design-status', 'Review'],
    ['atlas-build-name', 'Implementation'], ['atlas-build-status', 'Active'],
    ['beacon-name', 'Beacon'], ['beacon-status', 'Planning'],
    ['archive-name', 'Archive'], ['archive-status', '12 items'],
  ]);
  const connection = unwrap(createTreeGrid({
    rows,
    defaultExpandedValue: ['projects', 'atlas'],
    defaultHighlightedValue: 'projects-name',
    getCellValue: (id) => values.get(id) ?? '',
    setCellValue: (id, value) => values.set(id, value),
    onTransition: host.record,
    onUpdate: host.render,
  }));
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { model } = connection;
      const { tree, grid } = model;
      const { revision, state } = connection.getSnapshot();
      const visibleRows = new Set(tree.visible(state.expansion).ids);
      const statusWidth = Math.max(10, Math.min(20, Math.floor(width * 0.28)));
      const nameWidth = Math.max(18, width - statusWidth - 1);
      const table = [
        `${ansi.dim}${plain('  Name', nameWidth)} ${plain('Status', statusWidth)}${ansi.reset}`,
      ];
      for (let rowIndex = 0; rowIndex < grid.rowCount; rowIndex += 1) {
        const rowID = model.rowIDs[rowIndex];
        if (rowID === undefined || !visibleRows.has(rowID)) continue;
        const nameID = grid.cellAt(rowIndex, 0);
        const statusID = grid.cellAt(rowIndex, 1);
        if (nameID === null || statusID === null) continue;
        const depth = tree.depthOf(rowID) ?? 0;
        const disclosure = tree.isLeaf(rowID) === false
          ? state.expansion.has(rowID) ? '▾' : '▸'
          : '·';
        table.push(`${terminalCell(`${'  '.repeat(depth)}${disclosure} ${values.get(nameID) ?? ''}`, nameWidth, {
          current: state.cursor.current === nameID,
          selected: state.selection.has(nameID),
          editing: state.cursor.current === nameID && state.editMode === 'editing',
        })} ${terminalCell(values.get(statusID) ?? '', statusWidth, {
          current: state.cursor.current === statusID,
          selected: state.selection.has(statusID),
          editing: state.cursor.current === statusID && state.editMode === 'editing',
        })}`);
      }
      return [
        `${ansi.bold}Project tree grid${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '', ...table, '',
        `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}`,
        `expanded=${state.expansion.ids.join(',') || '−'}  mode=${state.editMode}`,
      ];
    },
  };
}
