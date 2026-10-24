import { SequenceReorderRoot, TreeReorderRoot, type TreeReorderExpose, type TreeReorderRootSlotProps } from '@sectile/vue/reorder';
const nodes = [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }] as const;
type ID = 'left' | 'right' | 'a';
new TreeReorderRoot({ nodes, layout: 'columns', policies: { canMove: move => { const id: ID = move.id; return !!id; } },
  'onUpdate:nodes': value => { const id: ID | undefined = value[0]?.id; void id; } });
// @ts-expect-error Policies cannot widen the canonical node domain.
new TreeReorderRoot({ nodes, policies: { canMove: (move: { id: 'missing' }) => !!move.id } });
// @ts-expect-error Parent IDs must belong to the source node domain.
new TreeReorderRoot({ nodes: [{ id: 'a', parentID: 'missing' }] });
new SequenceReorderRoot({ items: ['a', 'b'] as const, keyboardMode: 'preview',
  'onInteraction-change': change => { const exact: 'a' | 'b' | null = change.interaction.sourceID; void exact; },
  'onUpdate:items': values => { const exact: readonly ('a' | 'b')[] = values; void exact; } });
declare const root: TreeReorderExpose<ID>, slot: TreeReorderRootSlotProps<ID>;
root.move('a', { parentID: 'right' }); root.focus('a');
const available: boolean = root.canMove('a', { parentID: 'right' }); void available;
// @ts-expect-error Availability targets preserve the exposed root source identities.
root.canMove('a', { parentID: 'missing' });
// @ts-expect-error Availability queries preserve the slot source identities.
slot.canMove('missing', { parentID: 'right' });
const children: readonly ID[] = slot.getChildren('left'); void children;
const preview = slot.getPreviewState(); if (preview.ok) { const id: ID | undefined = preview.value.nodes[0]?.id; void id; }
slot.cancelInteraction(); slot.refreshDropTarget();
// @ts-expect-error Saved methods preserve canonical source IDs.
root.move('missing', { parentID: 'right' });
// @ts-expect-error A destination cannot widen source IDs.
root.move('a', { parentID: 'missing' });
// @ts-expect-error Slot queries preserve canonical source IDs.
slot.getChildren('missing');
