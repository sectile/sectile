import { createTree } from '@sectile/core/tree';
import { createTreeSelect, connectTreeSelect, createTreeSelectController, toTreeSelectEvent, type TreeSelectController } from '@sectile/dom/tree-select';
const tree = createTree([{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }]);
const result = createTreeSelectController({ tree, value: ['a'], query: '', onValueChange: ids => {
  const exact: readonly ('root' | 'a')[] = ids; void exact;
} });
toTreeSelectEvent({ key: 'Enter', isComposing: true });
if (result.ok) {
  const controller: TreeSelectController<'root' | 'a'> = result.value;
  controller.handleEvent({ type: 'query', query: 'delivery' });
  controller.resolveSearch(controller.getSnapshot().state.request, ['a']);
  controller.syncControlledValues({ value: ['a'], query: '' }); controller.dispose();
  // @ts-expect-error Matching response IDs are anchored to the controller tree.
  controller.resolveSearch(controller.getSnapshot().state.request, ['missing']);
}
// @ts-expect-error Values cannot widen the source tree's inferred IDs.
createTreeSelectController({ tree, value: ['missing'] });
declare const input: HTMLInputElement, popup: HTMLElement;
const connection = createTreeSelect({ nodes: [{ id: 'a', parentID: null }], input, popup, onValueChange(ids) { const exact: readonly 'a'[] = ids; void exact; } });
connection.setItemAttributes(popup, { id: 'a' }); connection.resolveSearch(connection.state.request, ['a']);
// @ts-expect-error Native DOM factories anchor IDs to source nodes.
connection.handleEvent({ type: 'select', id: 'missing' });
if (result.ok) { const borrowed = connectTreeSelect({ controller: result.value, input, popup }); borrowed.disconnect(); result.value.activateSearch(); }
