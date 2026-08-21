import { unwrap } from '@sectile/primitives/result';
import { createTextEditingState } from '@sectile/primitives/text';
import { createCalendar } from '@sectile/terminal/calendar';
import { createCombobox } from '@sectile/terminal/combobox';
import { createListbox } from '@sectile/terminal/listbox';
import { createSlider } from '@sectile/terminal/slider';
import { createText } from '@sectile/terminal/text';
import { createTreeGrid } from '@sectile/terminal/tree-grid';
import { createTreeView } from '@sectile/terminal/tree-view';
import { ansi, plain, styled, terminalCell } from './ui.mjs';

export const demos = Object.freeze([
  { id: 'listbox', label: 'Listbox', description: 'move · space select · enter activate · esc clear', create: createListboxDemo },
  { id: 'slider', label: 'Slider', description: 'arrows step · page up/down · home/end', create: createSliderDemo },
  { id: 'calendar', label: 'Calendar', description: 'arrows move · enter select · page up/down', create: createCalendarDemo },
  { id: 'tree-view', label: 'Tree view', description: 'up/down move · left/right collapse/expand · space select', create: createTreeViewDemo },
  { id: 'text', label: 'Text', description: 'type text · backspace/delete edit', create: createTextDemo },
  { id: 'combobox', label: 'Combobox', description: 'type filter · up/down move · enter accept · esc close', create: createComboboxDemo },
  { id: 'tree-grid', label: 'Tree grid', description: 'arrows move · alt+left/right or c/o fold · enter edit', create: createTreeGridDemo },
]);

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
  const weeks = [['18', '19', '20', '21', '22', '23', '24'], ['25', '26', '27', '28', '29', '30', '31']];
  let pageRequest = null;
  const connection = unwrap(createCalendar({
    rows: weeks,
    defaultHighlightedValue: '18',
    onPageRequest: ({ direction }) => { pageRequest = direction < 0 ? 'previous' : 'next'; },
    onTransition: host.record,
    onUpdate: host.render,
  }));
  return {
    handle: (input) => connection.handleKeyboardInput(input),
    lines(width) {
      const { revision, state } = connection.getSnapshot();
      const cellWidth = Math.max(4, Math.min(8, Math.floor((width - 6) / 7)));
      return [
        `${ansi.bold}August 2026${ansi.reset}  ${ansi.dim}r${revision}${ansi.reset}`,
        '',
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => plain(day, cellWidth)).join(' '),
        ...weeks.map((week) => week.map((id) => terminalCell(id, cellWidth, {
          current: state.cursor.current === id,
          selected: state.selection.has(id),
        })).join(' ')),
        '',
        `current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}  page=${pageRequest ?? '−'}`,
      ];
    },
  };
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
