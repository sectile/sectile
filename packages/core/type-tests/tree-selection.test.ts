import { createTree } from '@sectile/core/tree';
import type { CheckboxValue } from '@sectile/core/checkbox';
import { createTreeSelection, tryCreateTreeSelection, createTreeViewState, createTreeViewCheckState, tryCreateTreeViewCheckState, reconcileTreeViewState, applyTreeViewCheckEvent, type TreeSelection, type TreeSelectionUpdate } from '@sectile/core/tree-view';
const tree = createTree<'root' | 'leaf'>([{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }]);
const selection: TreeSelection<'root' | 'leaf'> = createTreeSelection(tree, { selected: ['leaf'], disabledPropagation: 'self' });
const result = selection.replace(['leaf']);
if (result.ok) { const update: TreeSelectionUpdate<'root' | 'leaf'> = result.value; const ids: readonly ('root' | 'leaf')[] = update.changed; void ids; }
selection.propose('root', false); selection.getChecked('leaf'); tryCreateTreeSelection(tree);
const checked: CheckboxValue | null = selection.getChecked('leaf'); void checked;
selection.normalize(['leaf']);
const checkedState = createTreeViewCheckState(tree, selection, { selected: ['leaf'] });
selection.accept(checkedState.selection); tryCreateTreeViewCheckState(tree, selection);
reconcileTreeViewState(tree, checkedState, checkedState, { selection: true });
// @ts-expect-error Checked state inputs cannot widen the tree domain.
tryCreateTreeViewCheckState(tree, selection, { selected: ['unknown'] });
// @ts-expect-error Checked selection does not expose a range anchor.
createTreeViewCheckState(tree, selection, { anchor: 'leaf' });
// @ts-expect-error Controlled part flags are boolean.
reconcileTreeViewState(tree, checkedState, checkedState, { cursor: 'yes' });
// @ts-expect-error Normalization preserves the tree's identity domain.
selection.normalize(['unknown']);
const state = createTreeViewState(tree, { selected: selection.selected, expanded: ['root'], current: 'root' });
applyTreeViewCheckEvent(tree, state, 'toggle-select', selection);
// @ts-expect-error Checked events cannot widen the supplied tree's identity domain.
applyTreeViewCheckEvent(tree, state, { type: 'toggle-select', id: 'unknown' }, selection);
// @ts-expect-error The checked identity remains in the supplied tree domain.
selection.propose('unknown', true);
// @ts-expect-error Disabled propagation is a closed semantic policy.
createTreeSelection(tree, { disabledPropagation: 'all' });
// @ts-expect-error Checked proposals are boolean, not arbitrary mixed writes.
selection.propose('root', 'mixed');
