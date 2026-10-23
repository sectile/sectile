import { CheckboxTreeRoot, CheckboxTreeItem, type CheckboxTreeItemSlotProps } from '@sectile/vue/checkbox-tree';
const nodes = [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }] as const;
new CheckboxTreeRoot({ nodes, modelValue: ['leaf'], 'onUpdate:modelValue': values => { const ids: readonly ('root' | 'leaf')[] = values; void ids; } });
// @ts-expect-error A selected ID cannot widen the nodes' domain.
new CheckboxTreeRoot({ nodes, modelValue: ['unknown'] });
type ItemProps = InstanceType<typeof CheckboxTreeItem>['$props'];
const item: ItemProps = { value: 'leaf' }; void item;
// @ts-expect-error Eligibility comes from root disabledItems, including unmounted rows.
const invalid: ItemProps = { value: 'leaf', disabled: true }; void invalid;
const checked = (state: CheckboxTreeItemSlotProps): boolean | 'mixed' => state.checked; void checked;
