import { createTree } from '@sectile/core/tree';
import { createCheckboxTreeController, connectCheckboxTree, type CheckboxTreeController } from '@sectile/dom/checkbox-tree';
const tree = createTree<'root' | 'leaf'>([{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }]);
const result = createCheckboxTreeController({ tree, value: ['leaf'], disabledPropagation: 'subtree' });
// @ts-expect-error Values cannot widen the supplied tree's identity domain.
createCheckboxTreeController({ tree, value: ['unknown'] });
if (result.ok) {
  const controller: CheckboxTreeController<'root' | 'leaf'> = result.value;
  const checked: boolean | 'mixed' | null = controller.getChecked('root');
  const element = document.createElement('div');
  const connection = connectCheckboxTree({ root: element, controller });
  connection.setItemAttributes(element, { id: 'leaf' }); connection.releaseItem(element, 'leaf'); connection.disconnect();
  controller.syncControlledValues({ value: ['leaf'] }); void checked;
  // @ts-expect-error Unknown IDs do not belong to this controller's tree.
  controller.handleEvent({ type: 'toggle-select', id: 'missing' });
  // @ts-expect-error Aggregate eligibility is declared at the root, not mounted item metadata.
  controller.setItemDisabled('leaf', true);
}
