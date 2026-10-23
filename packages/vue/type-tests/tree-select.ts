import { TreeSelectRoot, type TreeSelectSearchRequest, type TreeSelectExpose, type TreeSelectRootSlotProps } from '@sectile/vue/tree-select';
const nodes = [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }] as const;
new TreeSelectRoot({ nodes, modelValue: ['leaf'], 'onUpdate:modelValue': values => { const exact: readonly ('root' | 'leaf')[] = values; void exact; } });
declare const slot: TreeSelectRootSlotProps<'root' | 'leaf'>;
const children: readonly ('root' | 'leaf')[] = slot.getChildren('root'); void children;
// @ts-expect-error Rendering ports retain the source ID domain.
slot.isBranch('missing');
// @ts-expect-error Value IDs cannot widen the source node domain.
new TreeSelectRoot({ nodes, modelValue: ['missing'] });
// @ts-expect-error Initial result IDs cannot widen source node IDs.
new TreeSelectRoot({ nodes, matches: ['missing'] });
declare const root: TreeSelectExpose<'root' | 'leaf'>, request: TreeSelectSearchRequest;
root.resolveSearch(request, ['leaf']);
// @ts-expect-error Async responses are anchored to the source IDs.
root.resolveSearch(request, ['missing']);
new TreeSelectRoot({ nodes, results: { request, results: ['leaf'] } });
// @ts-expect-error Declarative async responses retain the source ID domain.
new TreeSelectRoot({ nodes, results: { request, results: ['missing'] } });
