import { unwrap } from '@sectile/primitives/result';
import { fitTerminalText } from '@sectile/terminal/layout';
import { createTTYKeyboard } from '@sectile/terminal/node';
import { createTreeGrid } from '@sectile/terminal/tree-grid';

const treeGridRows = [
  { id: 'projects', parentID: null, cells: ['projects-name', 'projects-status'] },
  { id: 'atlas', parentID: 'projects', cells: ['atlas-name', 'atlas-status'] },
  { id: 'atlas-design', parentID: 'atlas', cells: ['atlas-design-name', 'atlas-design-status'] },
  { id: 'atlas-build', parentID: 'atlas', cells: ['atlas-build-name', 'atlas-build-status'] },
  { id: 'beacon', parentID: 'projects', cells: ['beacon-name', 'beacon-status'] },
  { id: 'archive', parentID: null, cells: ['archive-name', 'archive-status'] },
];

const initialValues = new Map([
  ['projects-name', 'Projects'],
  ['projects-status', 'Portfolio'],
  ['atlas-name', 'Atlas'],
  ['atlas-status', 'In progress'],
  ['atlas-design-name', 'Design system'],
  ['atlas-design-status', 'Review'],
  ['atlas-build-name', 'Implementation'],
  ['atlas-build-status', 'Active'],
  ['beacon-name', 'Beacon'],
  ['beacon-status', 'Planning'],
  ['archive-name', 'Archive'],
  ['archive-status', '12 items'],
]);

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('Terminal playground requires an interactive TTY.');
  process.exitCode = 1;
} else {
  run();
}

function run() {
  let values = new Map(initialValues);
  let logs = [];
  let closed = false;
  const connection = unwrap(createTreeGrid({
    rows: treeGridRows,
    defaultExpandedValue: ['projects', 'atlas'],
    defaultHighlightedValue: 'projects-name',
    getCellValue: (id) => values.get(id) ?? '',
    setCellValue: (id, value) => values.set(id, value),
    onTransition: ({ event, result }) => {
      logs = [{
        revision: result.snapshot.revision,
        event,
        accepted: result.ok,
        effects: result.commands.map((effect) => `${effect.type}:${effect.id}`),
      }, ...logs].slice(0, 6);
    },
    onUpdate: render,
  }));
  const { model } = connection;
  const { tree, grid } = model;
  const keyboard = unwrap(createTTYKeyboard(process.stdin, handleInput));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  render();

  function handleInput(input) {
    if (input.ctrlKey && input.key === 'c') {
      close();
      return;
    }
    const { state } = connection.getSnapshot();
    if (state.editMode === 'navigation' && input.key === 'q') {
      close();
      return;
    }
    connection.handleKeyboardInput(input);
  }

  function render() {
    const { revision, state } = connection.getSnapshot();
    const visibleRows = new Set(tree.visible(state.expansion).ids);
    const lines = [
      '\u001b[2J\u001b[H\u001b[1;36mSectile terminal playground\u001b[0m',
      'arrows move · alt+left/right or c/o collapse/expand · space select',
      'enter edit/commit · esc cancel',
      'q quit from navigation · ctrl-c quit from any mode',
      '',
      '\u001b[2m   Name                          Status\u001b[0m',
    ];

    for (let rowIndex = 0; rowIndex < grid.rowCount; rowIndex += 1) {
      const rowID = model.rowIDs[rowIndex];
      if (rowID === undefined || !visibleRows.has(rowID)) continue;
      const nameID = grid.cellAt(rowIndex, 0);
      const statusID = grid.cellAt(rowIndex, 1);
      if (nameID === null || statusID === null) continue;
      const name = values.get(nameID) ?? '';
      const status = values.get(statusID) ?? '';
      const depth = tree.depthOf(rowID) ?? 0;
      const disclosure = tree.isLeaf(rowID) === false
        ? state.expansion.has(rowID) ? '▾' : '▸'
        : '·';
      const renderedName = `${'  '.repeat(depth)}${disclosure} ${name}`;
      lines.push(`${cell(nameID, renderedName, 30)} ${cell(statusID, status, 18)}`);
    }

    lines.push(
      '',
      `\u001b[1mstate\u001b[0m r${revision}  current=${state.cursor.current ?? '−'}  selected=${state.selection.selected.join(',') || '−'}`,
      `      expanded=${state.expansion.ids.join(',') || '−'}  mode=${state.editMode}`,
      '',
      '\u001b[1mevents / effects\u001b[0m',
      ...logs.map((entry) => (
        `r${entry.revision} ${entry.event} ${entry.accepted ? '✓' : '×'}  ${entry.effects.join(', ') || 'no effects'}`
      )),
    );
    process.stdout.write(lines.join('\n'));

    function cell(id, value, width) {
      const selected = state.selection.has(id);
      const current = state.cursor.current === id;
      const editing = current && state.editMode === 'editing';
      const marker = current ? '>' : ' ';
      const selection = selected ? '●' : ' ';
      const clipped = fitTerminalText(value, width);
      if (editing) return `\u001b[30;43m${marker}${selection}${clipped}\u001b[0m`;
      if (current) return `\u001b[30;46m${marker}${selection}${clipped}\u001b[0m`;
      if (selected) return `\u001b[36m${marker}${selection}${clipped}\u001b[0m`;
      return `${marker}${selection}${clipped}`;
    }
  }

  function close() {
    if (closed) return;
    closed = true;
    keyboard.close();
    process.off('SIGINT', close);
    process.off('SIGTERM', close);
    process.stdout.write('\u001b[0m\n');
  }
}
