import { createGridControl, type GridConnection } from '@sectile/dom/grid';
import type { TreeGridConnection } from '@sectile/dom/tree-grid';
import type { DataGridEditorOptions, DataTreeGridEditorOptions } from '@sectile/dom/tabular';
import type { SequenceReorderConnection, TreeReorderConnection, SequenceReorderOptions, TreeReorderOptions, TreeReorderDropTarget } from '@sectile/dom/reorder';

declare const root: HTMLElement;
declare const cell: HTMLElement;
const grid: GridConnection<'a' | 'b'> = createGridControl<'a' | 'b'>({ root, rows: [['a', 'b']] });
grid.setCellAttributes(cell, 'a');
grid.setCellAttributes(cell, 'b', { disabled: true });
grid.setCellAttributes(undefined, 'a');
// @ts-expect-error Cell release keeps the grid's stable identity type.
grid.setCellAttributes(undefined, 0);
// @ts-expect-error Attribute updates require a boolean disabled state.
grid.setCellAttributes(cell, 'a', { disabled: 'true' });
// @ts-expect-error Null is not an HTMLElement or the explicit release marker.
grid.setCellAttributes(null, 'a');

declare const treeGrid: TreeGridConnection<'row', 'cell'>;
declare const editor: HTMLInputElement;
const tabularChange: DataGridEditorOptions = { cell: { rowID: 'row', columnID: 'name' }, commitOnChange: true };
const tabularBlur: DataTreeGridEditorOptions = { ...tabularChange, commitOnBlur: true };
// @ts-expect-error Native change policy is boolean, not a string attribute.
const invalidTabularChange: DataGridEditorOptions = { ...tabularChange, commitOnChange: 'true' };
void [tabularChange, tabularBlur, invalidTabularChange];
treeGrid.bindEditor(editor, { id: 'cell' });
treeGrid.unbindEditor(editor);
// @ts-expect-error Editor release requires the actual input, not a cell identity.
treeGrid.unbindEditor('cell');

declare const sequenceReorder: SequenceReorderConnection<'a' | 'b'>;
declare const treeReorder: TreeReorderConnection<'a' | 'b'>;
sequenceReorder.removeItem(cell);
treeReorder.removeItem(cell);
// @ts-expect-error Release requires the mounted host, not its stable identity.
sequenceReorder.removeItem('a');
// @ts-expect-error Release requires the mounted host, not its stable identity.
treeReorder.removeItem('b');
const controlledSequence: SequenceReorderOptions<'a'> = { root, ids: ['a'], controlled: true, handleOnly: true, label: 'Order', roleDescription: 'sortable', keyboardMode: 'preview',
  onInteractionChange: change => { const exact: 'a' | null = change.interaction.sourceID; void exact; } };
const preview = sequenceReorder.getPreviewState(); if (preview.ok) { const ids: readonly ('a'|'b')[] = preview.value.ids; void ids; }
sequenceReorder.cancelInteraction(); treeReorder.refreshDropTarget();
const controlledTree: TreeReorderOptions<'a'> = { root, nodes: [{ id: 'a', parentID: null }], controlled: true, handleOnly: true, label: 'Hierarchy', roleDescription: 'sortable' };
void [controlledSequence, controlledTree];
const board: TreeReorderOptions<'column' | 'card'> = { root, nodes: [{ id:'column',parentID:null },{ id:'card',parentID:'column' }], layout:'columns',direction:'rtl',readOnly:false,
  policies:{canMove:move=>move.id === 'card',capacity:parent=>parent === 'column' ? 4 : undefined} }; void board;
const target: TreeReorderDropTarget<'a'|'b'> = {parentID:'a',beforeID:'b'}; treeReorder.setDropTarget(cell,target); treeReorder.removeDropTarget(cell);
const available: boolean = treeReorder.canMove('a', { parentID: 'b' }); void available;
// @ts-expect-error Availability preserves the connected source identity domain.
treeReorder.canMove('missing', { parentID: 'a' });
// @ts-expect-error Availability destinations cannot widen source identities.
treeReorder.canMove('a', { parentID: 'missing' });
// @ts-expect-error Virtual anchors retain the canonical identifier domain.
treeReorder.setDropTarget(cell,{parentID:'missing'});
// @ts-expect-error Release takes the actual host, not its logical parent.
treeReorder.removeDropTarget('a');
// @ts-expect-error Column structural guards cannot be weakened through application permissions.
const weakBoard: TreeReorderOptions<'column'> = {root,nodes:[],layout:'columns',policies:{preserveRoots:false}}; void weakBoard;
