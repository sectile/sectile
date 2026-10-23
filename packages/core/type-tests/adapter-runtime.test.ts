import {
  createControlledComponentController,
  type ControlledComponentControllerOptions,
} from '@sectile/core/adapter-runtime';
import type { MenuEvent } from '@sectile/core/menu';
import type { ComboboxPolicies } from '@sectile/core/combobox';
const candidatePolicies: ComboboxPolicies<'a' | 'b'> = { eligible: id => id === 'b' }; void candidatePolicies;
// @ts-expect-error Candidate participation requires a boolean result.
const invalidCandidatePolicies: ComboboxPolicies<'a'> = { eligible: () => 'yes' }; void invalidCandidatePolicies;
import type { MenubarEvent } from '@sectile/core/menubar';
import type { NavigationMenuEvent } from '@sectile/core/navigation-menu';
import type { MenuButtonEvent } from '@sectile/core/menu-button';
const rootMovement: readonly (MenuEvent<'file' | 'edit'> & MenubarEvent<'file' | 'edit'> & NavigationMenuEvent<'file' | 'edit'> & MenuButtonEvent<'file' | 'edit'>)[] = ['next-root', 'previous-root'];
void rootMovement;

import {
  createSequenceReorderState, createTreeReorderState,
  getSequenceReorderOrder, getTreeReorderHierarchy,
  applyTreeReorderEvent, canMoveTreeReorderNode, type TreeReorderEvent, type TreeReorderPolicies,
} from '@sectile/core/reorder';
const batchMove: TreeReorderEvent<'left' | 'right' | 'a'> = { type: 'move-nodes', ids: ['a'], parentID: 'right' }; void batchMove;
type SingleNodeMove = Extract<TreeReorderEvent<'left' | 'right' | 'a'>, { readonly type: 'move-node' }>;
interface TaggedMove extends SingleNodeMove { readonly source: 'toolbar' }
const taggedMove: TaggedMove = { type: 'move-node', id: 'a', parentID: 'right', source: 'toolbar' };
const compatibleSingleMove: TreeReorderEvent<'left' | 'right' | 'a'> = taggedMove; void compatibleSingleMove;
// @ts-expect-error Batch roots retain the declared identity domain.
const foreignBatchMove: TreeReorderEvent<'left' | 'right' | 'a'> = { type: 'move-nodes', ids: ['missing'], parentID: 'right' }; void foreignBatchMove;
// @ts-expect-error A batch accepts roots, not an ambiguous simultaneous single root.
const ambiguousBatchMove: TreeReorderEvent<'a'> = { type: 'move-nodes', ids: ['a'], id: 'a', parentID: null }; void ambiguousBatchMove;
const reorderOrder = getSequenceReorderOrder(createSequenceReorderState(['a', 'b'] as const));
const reorderHierarchy = getTreeReorderHierarchy(createTreeReorderState([{ id: 'a', parentID: null }] as const));
const constrainedTree = createTreeReorderState([{ id: 'column', parentID: null }, { id: 'card', parentID: 'column' }] as const, { maxDepth: 1 });
const constrainedPolicies: TreeReorderPolicies<'column' | 'card'> = { preserveRoots: true, maxDepth: 1, capacity: parent => parent === 'column' ? 5 : undefined,
  canMove: move => { const id: 'column' | 'card' = move.id; const parent: 'column' | 'card' | null = move.previousParentID; return parent === move.parentID || id === 'card'; } };
applyTreeReorderEvent(constrainedTree, { type: 'move-node', id: 'card', parentID: 'column' }, constrainedPolicies);
const available: boolean = canMoveTreeReorderNode(constrainedTree, { type: 'move-node', id: 'card', parentID: 'column' }, constrainedPolicies); void available;
// @ts-expect-error Availability cannot widen the canonical source identities.
canMoveTreeReorderNode(constrainedTree, { type: 'move-node', id: 'foreign', parentID: 'column' });
// @ts-expect-error Availability destinations stay in the source identity domain.
canMoveTreeReorderNode(constrainedTree, { type: 'move-node', id: 'card', parentID: 'foreign' });
// @ts-expect-error Permission callbacks cannot introduce identifiers outside the source domain.
const foreignPolicy: TreeReorderPolicies<'column' | 'card'> = { canMove: (move: { id: 'missing' }) => true }; void foreignPolicy;
// @ts-expect-error Capacity is a per-destination query, not an unscoped scalar.
const scalarCapacity: TreeReorderPolicies<'card'> = { capacity: 4 }; void scalarCapacity;
reorderOrder.indexOf('a');
reorderHierarchy.depthOf('a');
// @ts-expect-error Borrowed orders preserve the declared identity domain.
reorderOrder.indexOf('foreign');
// @ts-expect-error Borrowed hierarchies preserve the declared identity domain.
reorderHierarchy.parentOf('foreign');

type Command = { readonly amount: number };
type Options = ControlledComponentControllerOptions<number, number, Command, number>;

const options: Options = {
  controlled: false,
  initial: { ok: true, value: 0 },
  reducer: (state, amount) => ({ ok: true, value: { state: state + amount, commands: [{ amount }] } }),
  create: (value) => ({ ok: true, value }),
  read: (state) => state,
};

// The existing options remain valid when effects are returned to the caller.
createControlledComponentController(options);
const configurable = createControlledComponentController(options);
if (configurable.ok) {
  const interaction: import('@sectile/core/result').Result<import('@sectile/core/interaction').InteractionState> = configurable.value.syncInteraction({ disabled: true });
  void interaction;
  // @ts-expect-error Interaction configuration uses boolean flags.
  configurable.value.syncInteraction({ readOnly: 'true' });
}
createControlledComponentController({
  ...options,
  publishEffect: (command) => {
    const amount: number = command.amount;
    void amount;
    // @ts-expect-error Only the reducer's command shape is published.
    command.missing;
  },
});

const incompatible: Options = {
  ...options,
  // @ts-expect-error Publishers must accept the controller's command type.
  publishEffect: (_command: { readonly amount: string }) => undefined,
};
void incompatible;

import {
  createLayerPresentationState, applyLayerPresentationEvent,
  type LayerPresentation, type LayerPresentationEvent,
} from '@sectile/core/layer-stack';
const layers = createLayerPresentationState<'dialog' | 'popup'>([{ id: 'dialog' }], { maxItems: 8 });
applyLayerPresentationEvent(layers, { type: 'retire-layer', id: 'dialog' });
// @ts-expect-error Retirement uses the same inferred identifier vocabulary.
applyLayerPresentationEvent(layers, { type: 'retire-layer', id: 'foreign' });
const configure: LayerPresentationEvent<'dialog' | 'popup'> = { type: 'configure-layer', id: 'dialog',
  policy: { mode: 'modal', dismissOnEscape: true, dismissOnInteractOutside: false } };
applyLayerPresentationEvent(layers, configure);
// @ts-expect-error Policy replacement requires the complete dismissal policy.
const incompletePolicy: LayerPresentationEvent = { type: 'configure-layer', id: 'dialog', policy: { mode: 'modal' } };
void incompletePolicy;
const retain: LayerPresentationEvent<'dialog' | 'popup'> = { type: 'retain-layer', id: 'dialog', generation: 1 };
const presentationResult = applyLayerPresentationEvent(layers, retain);
if (presentationResult.ok) {
  const entry: LayerPresentation<'dialog' | 'popup'> | undefined = presentationResult.value.state.presentations[0];
  if (entry) {
    const phase: 'active' | 'exiting' = entry.phase;
    void phase;
    // @ts-expect-error Consumers cannot mutate a committed presentation snapshot.
    entry.order = 0;
  }
  // @ts-expect-error The presentation list is immutable.
  presentationResult.value.state.presentations.push({});
}
// @ts-expect-error Literal layer domains are preserved by presentation events.
applyLayerPresentationEvent(layers, { type: 'retain-layer', id: 'foreign', generation: 1 });
// @ts-expect-error Release requires a generation witness.
applyLayerPresentationEvent(layers, { type: 'release-layer', id: 'dialog' });
// @ts-expect-error Capacity is a numeric owner policy.
createLayerPresentationState([], { maxItems: '8' });
applyLayerPresentationEvent(layers, { type: 'reparent-layer', id: 'popup', parentID: 'dialog' });
applyLayerPresentationEvent(layers, { type: 'reparent-layer', id: 'popup', parentID: null });
// @ts-expect-error Reparenting preserves the owner's literal parent domain.
applyLayerPresentationEvent(layers, { type: 'reparent-layer', id: 'popup', parentID: 'foreign' });
// @ts-expect-error Detaching a parent is explicit; omission is not a reparent event.
applyLayerPresentationEvent(layers, { type: 'reparent-layer', id: 'popup' });
