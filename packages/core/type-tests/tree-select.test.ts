import { createTree } from '@sectile/core/tree';
import { createTreeSelectResults, tryCreateTreeSelectResults, type TreeSelectResults } from '@sectile/core/tree-select';
import { createTreeSelectState, applyTreeSelectEvent, type TreeSelectSearchRequest } from '@sectile/core/tree-select';
import { reconcileTreeSelectState, synchronizeTreeSelectState } from '@sectile/core/tree-select';
const tree = createTree([{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }]);
const results: TreeSelectResults<'root' | 'a'> = createTreeSelectResults(tree, ['a']);
const selected: readonly ('root' | 'a')[] = results.matches;
const match: boolean = results.isMatch('a'); void [selected, match];
tryCreateTreeSelectResults(tree, []);
// @ts-expect-error Match inputs cannot widen the source tree's ID domain.
createTreeSelectResults(tree, ['missing']);
// @ts-expect-error Membership uses the source identifier domain.
results.isMatch('missing');
// @ts-expect-error Result snapshots are immutable.
results.matches.push('a');
const state = createTreeSelectState(tree, { selectionMode: 'multiple', selected: ['a'], expanded: ['root'] });
const changed = applyTreeSelectEvent(tree, state, { type: 'query', query: 'delivery' });
if (changed.ok) {
  const request: TreeSelectSearchRequest = changed.value.state.request;
  applyTreeSelectEvent(tree, changed.value.state, { type: 'results', request, results });
}
// @ts-expect-error Selection cannot widen the source ID domain.
createTreeSelectState(tree, { selected: ['missing'] });
// @ts-expect-error Events cannot widen the source ID domain.
applyTreeSelectEvent(tree, state, { type: 'select', id: 'missing' });
// @ts-expect-error Request identity is issued by the state, not forged query data.
applyTreeSelectEvent(tree, state, { type: 'results', request: { query: '' }, results });
reconcileTreeSelectState(tree, state, state, { selection: true, query: true });
synchronizeTreeSelectState(tree, state, { selected: ['a'], current: null, open: false });
synchronizeTreeSelectState(tree, state, { expanded: [], cursorFallback: 'first' });
// @ts-expect-error Cursor fallback uses explicit supported choices.
synchronizeTreeSelectState(tree, state, { cursorFallback: 'nearest' });
applyTreeSelectEvent(tree, state, { type: 'results', request: state.request, results: ['a'] });
// @ts-expect-error Raw matches cannot enlarge the original ID domain.
applyTreeSelectEvent(tree, state, { type: 'results', request: state.request, results: ['missing'] });
// @ts-expect-error External values do not enlarge source topology IDs.
synchronizeTreeSelectState(tree, state, { selected: ['missing'] });
// @ts-expect-error Controlled parts use booleans, not open option strings.
reconcileTreeSelectState(tree, state, state, { query: 'controlled' });
