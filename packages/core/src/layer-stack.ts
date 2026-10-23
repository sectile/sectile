import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';
import { bindCanonicalState, fail, hasCanonicalState, ok } from './internal/kernel/foundation.js';
import { DEFAULT_MAX_SEQUENCE_ITEMS } from './internal/kernel/indexed-sequence.js';
import { unwrap } from './result.js';
import { tryCreateSequence } from './structures/sequence.js';
import type { Result, StableID } from './shared.js';

export type LayerMode = 'modal' | 'non-modal' | 'tooltip';
export type LayerDismissReason = 'escape' | 'interact-outside';
export type LayerCloseReason = LayerDismissReason | 'programmatic' | 'ancestor-closed';

/** Complete input policy; configuring it preserves the layer's identity and position. */
export interface LayerPolicy {
  readonly mode: LayerMode;
  readonly dismissOnEscape: boolean;
  readonly dismissOnInteractOutside: boolean;
}

export interface LayerInput<ID extends StableID = StableID> {
  readonly id: ID;
  readonly parentID?: ID | null;
  readonly mode?: LayerMode;
  readonly dismissOnEscape?: boolean;
  readonly dismissOnInteractOutside?: boolean;
}

export interface Layer<ID extends StableID = StableID> {
  readonly id: ID;
  readonly parentID: ID | null;
  readonly mode: LayerMode;
  readonly dismissOnEscape: boolean;
  readonly dismissOnInteractOutside: boolean;
}

export interface LayerStackState<ID extends StableID = StableID> {
  readonly layers: readonly Layer<ID>[];
}

export type LayerStackEvent<ID extends StableID = StableID> =
  | { readonly type: 'open-layer'; readonly layer: LayerInput<ID> }
  | { readonly type: 'close-layer'; readonly id: ID }
  | { readonly type: 'reparent-layer'; readonly id: ID; readonly parentID: ID | null }
  | { readonly type: 'configure-layer'; readonly id: ID; readonly policy: LayerPolicy }
  | { readonly type: 'dismiss-top'; readonly reason: LayerDismissReason };

export type LayerStackCommand<ID extends StableID = StableID> =
  | { readonly type: 'layer-opened'; readonly id: ID }
  | { readonly type: 'layer-closed'; readonly id: ID; readonly reason: LayerCloseReason };

export type LayerStackUpdate<ID extends StableID = StableID> =
  MachineUpdate<LayerStackState<ID>, LayerStackCommand<ID>>;

export interface LayerPresentation<ID extends StableID = StableID> {
  readonly id: ID;
  readonly generation: number;
  readonly phase: 'active' | 'exiting';
  readonly order: number;
  readonly retained: boolean;
}

/** Factory-issued runtime state; retained presentations are not semantic layers. */
export interface LayerPresentationState<ID extends StableID = StableID> {
  readonly stack: LayerStackState<ID>;
  readonly presentations: readonly LayerPresentation<ID>[];
  readonly revision: number;
  readonly generation: number;
  readonly maxItems: number;
}

export interface LayerPresentationOptions { readonly maxItems?: number }

export type LayerPresentationEvent<ID extends StableID = StableID> = LayerStackEvent<ID>
  /** Remove an active branch and its paint atomically, without retaining exit slots. */
  | { readonly type: 'retire-layer'; readonly id: ID }
  | { readonly type: 'retain-layer'; readonly id: ID; readonly generation: number }
  | { readonly type: 'release-layer'; readonly id: ID; readonly generation: number };

export type LayerPresentationUpdate<ID extends StableID = StableID> =
  MachineUpdate<LayerPresentationState<ID>, LayerStackCommand<ID>>;

export function createLayerPresentationState<ID extends StableID = StableID>(
  layers: readonly LayerInput<ID>[] = [],
  options: LayerPresentationOptions = {},
): LayerPresentationState<ID> {
  return unwrap(tryCreateLayerPresentationState(layers, options));
}

export function tryCreateLayerPresentationState<ID extends StableID = StableID>(
  layers: readonly LayerInput<ID>[] = [],
  options: LayerPresentationOptions = {},
): Result<LayerPresentationState<ID>> {
  const maxItems = options.maxItems ?? DEFAULT_MAX_SEQUENCE_ITEMS;
  if (!Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > DEFAULT_MAX_SEQUENCE_ITEMS) {
    return fail('construction', 'invalid-max-items', 'Presentation capacity must be a positive integer within the layer ceiling.');
  }
  if (layers.length > maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Layer presentations exceed maxItems.', { size: layers.length, maxItems });
  }
  const stack = tryCreateLayerStackState(layers);
  if (!stack.ok) return stack;
  return ok(bindPresentationState({
    stack: stack.value,
    presentations: Object.freeze(stack.value.layers.map((layer, order) => Object.freeze({
      id: layer.id, generation: order + 1, phase: 'active' as const, order, retained: false,
    }))),
    revision: 0, generation: layers.length, maxItems,
  }));
}

export function applyLayerPresentationEvent<ID extends StableID>(
  state: LayerPresentationState<ID>,
  event: LayerPresentationEvent<NoInfer<ID>>,
): Result<LayerPresentationUpdate<ID>> {
  if (!hasCanonicalState(tryCreateLayerPresentationState, state)) {
    return fail('transition-rejection', 'layer-presentation-state-invalid', 'Presentation transitions require their factory-issued runtime state.');
  }
  if (event.type === 'retain-layer' || event.type === 'release-layer') {
    if (!Number.isSafeInteger(event.generation) || event.generation < 1) {
      return fail('transition-rejection', 'layer-presentation-generation-invalid', 'A presentation generation must be a positive safe integer.');
    }
    const index = state.presentations.findIndex(entry => entry.id === event.id && entry.generation === event.generation);
    const entry = state.presentations[index];
    if (entry === undefined) {
      return event.type === 'release-layer'
        ? createMachineUpdate(state)
        : fail('transition-rejection', 'layer-presentation-generation-stale', 'The presentation generation is no longer available.');
    }
    const retain = event.type === 'retain-layer';
    if (entry.retained === retain) return createMachineUpdate(state);
    if (retain) {
      return publishPresentation(state, state.stack, state.presentations.map((value, order) => order === index
        ? Object.freeze({ ...value, retained: true }) : value));
    }
    const presentations: LayerPresentation<ID>[] = [];
    for (const value of state.presentations) {
      if (value === entry && value.phase === 'exiting') continue;
      const order = presentations.length;
      presentations.push(value === entry || value.order !== order
        ? Object.freeze({ ...value, order, retained: value === entry ? false : value.retained }) : value);
    }
    return publishPresentation(state, state.stack, presentations);
  }
  if (event.type === 'open-layer') {
    if (state.presentations.length === state.maxItems) {
      return fail('resource-rejection', 'item-ceiling-exceeded', 'Layer presentations exceed maxItems.', {
        size: state.presentations.length + 1, maxItems: state.maxItems,
      });
    }
    if (state.generation === Number.MAX_SAFE_INTEGER) {
      return fail('resource-rejection', 'layer-presentation-counter-exhausted', 'The presentation generation is exhausted.');
    }
  }
  const change = applyLayerStackEvent(state.stack, event.type === 'retire-layer' ? { type: 'close-layer', id: event.id } : event);
  if (!change.ok) return change;
  if (change.value.state === state.stack) return createMachineUpdate(state);
  if (event.type === 'configure-layer') return publishPresentation(state, change.value.state, state.presentations);
  if (event.type === 'open-layer') {
    const generation = state.generation + 1;
    const opened = change.value.state.layers.at(-1)!;
    return publishPresentation(state, change.value.state, [...state.presentations, Object.freeze({
      id: opened.id, generation, phase: 'active' as const,
      order: state.presentations.length, retained: false,
    })], change.value.commands, generation);
  }
  if (event.type === 'reparent-layer') {
    const active = new Map<ID, LayerPresentation<ID>>();
    for (const entry of state.presentations) if (entry.phase === 'active') active.set(entry.id, entry);
    let cursor = 0;
    const presentations = state.presentations.map((entry, order) => {
      const next = entry.phase === 'active' ? active.get(change.value.state.layers[cursor++]!.id)! : entry;
      return next.order === order ? next : Object.freeze({ ...next, order });
    });
    return publishPresentation(state, change.value.state, presentations);
  }
  const closed = new Set(change.value.commands.map(command => command.id));
  const presentations: LayerPresentation<ID>[] = [];
  for (const entry of state.presentations) {
    const closing = entry.phase === 'active' && closed.has(entry.id);
    if (closing && (event.type === 'retire-layer' || !entry.retained)) continue;
    const order = presentations.length;
    const phase = closing ? 'exiting' : entry.phase;
    presentations.push(entry.order === order && entry.phase === phase
      ? entry : Object.freeze({ ...entry, phase, order }));
  }
  return publishPresentation(state, change.value.state, presentations, change.value.commands);
}

function bindPresentationState<ID extends StableID>(state: LayerPresentationState<ID>): LayerPresentationState<ID> {
  return bindCanonicalState(tryCreateLayerPresentationState, Object.freeze(state));
}

function publishPresentation<ID extends StableID>(
  state: LayerPresentationState<ID>,
  stack: LayerStackState<ID>,
  presentations: readonly LayerPresentation<ID>[],
  commands: readonly LayerStackCommand<ID>[] = [],
  generation = state.generation,
): Result<LayerPresentationUpdate<ID>> {
  if (state.revision === Number.MAX_SAFE_INTEGER) {
    return fail('resource-rejection', 'layer-presentation-counter-exhausted', 'The presentation revision is exhausted.');
  }
  const next = bindPresentationState({
    stack, presentations: Object.freeze(presentations), revision: state.revision + 1,
    generation, maxItems: state.maxItems,
  });
  // Semantic commands are already frozen by the canonical layer owner.
  return ok(Object.freeze({ state: next, commands: Object.isFrozen(commands) ? commands : Object.freeze(commands) }));
}

export function createLayerStackState<ID extends StableID = StableID>(
  layers: readonly LayerInput<ID>[] = [],
): LayerStackState<ID> {
  return unwrap(tryCreateLayerStackState(layers));
}

export function tryCreateLayerStackState<ID extends StableID = StableID>(
  inputs: readonly LayerInput<ID>[] = [],
): Result<LayerStackState<ID>> {
  const size = inputs.length;
  if (size > DEFAULT_MAX_SEQUENCE_ITEMS) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Sequence exceeds maxItems.', {
      size, maxItems: DEFAULT_MAX_SEQUENCE_ITEMS,
    });
  }
  const ids = tryCreateSequence(inputs.map((layer) => layer.id));
  if (!ids.ok) return ids;
  const layers: Layer<ID>[] = [];
  for (let index = 0; index < size; index += 1) {
    const input = inputs[index]!;
    const normalized = normalizeLayer(input);
    if (!normalized.ok) return normalized;
    const parentID = normalized.value.parentID;
    if (parentID !== null) {
      const parentIndex = ids.value.indexOf(parentID);
      if (parentIndex === null || parentIndex >= index) {
        return fail(
          'construction',
          'layer-parent-not-topmost',
          'A nested layer parent must already be open below the child.',
          { id: input.id, parentID },
        );
      }
    }
    layers.push(normalized.value);
  }
  return ok(bindCanonicalState(tryCreateLayerStackState, Object.freeze({ layers: Object.freeze(layers) })));
}

export function applyLayerStackEvent<ID extends StableID>(
  state: LayerStackState<ID>,
  event: LayerStackEvent<ID>,
): Result<LayerStackUpdate<ID>> {
  let reparentState = state;
  if (!hasCanonicalState(tryCreateLayerStackState, state)) {
    const valid = tryCreateLayerStackState(state.layers);
    if (!valid.ok) return transitionFailure(valid);
    reparentState = valid.value;
  }

  if (event.type === 'reparent-layer') return reparentLayer(reparentState, event.id, event.parentID);
  if (event.type === 'configure-layer') return configureLayer(reparentState, event.id, event.policy);

  if (event.type === 'open-layer') {
    if (state.layers.some((layer) => layer.id === event.layer.id)) {
      return fail(
        'transition-rejection',
        'layer-id-duplicate',
        'An open layer must use a unique identifier.',
        { id: event.layer.id },
      );
    }
    const next = tryCreateLayerStackState([...state.layers, event.layer]);
    if (!next.ok) return transitionFailure(next);
    const layer = next.value.layers.at(-1);
    if (layer === undefined) throw new Error('An opened layer must exist in the next state.');
    return createMachineUpdate(
      next.value,
      [{ type: 'layer-opened', id: layer.id }],
    );
  }

  if (event.type === 'close-layer') {
    const index = state.layers.findIndex((layer) => layer.id === event.id);
    if (index < 0) {
      return fail(
        'transition-rejection',
        'layer-id-missing',
        'The layer to close must be open.',
        { id: event.id },
      );
    }
    return closeFrom(state, index, 'programmatic');
  }

  const top = state.layers.at(-1);
  if (top === undefined) return createMachineUpdate(state);
  const dismissible = event.reason === 'escape'
    ? top.dismissOnEscape
    : top.dismissOnInteractOutside;
  return dismissible
    ? closeFrom(state, state.layers.length - 1, event.reason)
    : createMachineUpdate(state);
}

export function getTopLayer<ID extends StableID>(
  state: LayerStackState<ID>,
): Layer<ID> | null {
  return state.layers.at(-1) ?? null;
}

export function getInteractiveLayerIDs<ID extends StableID>(
  state: LayerStackState<ID>,
): readonly ID[] {
  let start = 0;
  for (let index = state.layers.length - 1; index >= 0; index -= 1) {
    if (state.layers[index]?.mode === 'modal') {
      start = index;
      break;
    }
  }
  return Object.freeze(state.layers.slice(start).map((layer) => layer.id));
}

function reparentLayer<ID extends StableID>(
  state: LayerStackState<ID>,
  id: ID,
  parentID: ID | null,
): Result<LayerStackUpdate<ID>> {
  let index = -1;
  let parentIndex = parentID === null ? -1 : -2;
  for (let cursor = 0; cursor < state.layers.length; cursor++) {
    const layer = state.layers[cursor]!;
    if (layer.id === id) index = cursor;
    if (layer.id === parentID) parentIndex = cursor;
  }
  if (index < 0) return fail('transition-rejection', 'layer-id-missing', 'The layer to reparent must be open.');
  if (parentIndex === -2) return fail('transition-rejection', 'layer-parent-missing', 'The target parent must be open.');
  if (id === parentID) return fail('transition-rejection', 'layer-self-parent', 'A layer cannot be its own parent.');
  const root = state.layers[index]!;
  if (root.parentID === parentID) return createMachineUpdate(state);
  const changed = Object.freeze({ ...root, parentID });
  let layers: Layer<ID>[];
  if (parentIndex < index) {
    layers = state.layers.slice();
    layers[index] = changed;
  } else {
    const moving = new Set<ID>([id]);
    const branch: Layer<ID>[] = [];
    const remaining: Layer<ID>[] = [];
    let insertion = 0;
    for (const layer of state.layers) {
      if (layer.id === id || (layer.parentID !== null && moving.has(layer.parentID))) {
        if (layer.id === parentID) return fail('transition-rejection', 'layer-parent-cycle', 'The target parent cannot be a descendant.');
        moving.add(layer.id);
        branch.push(layer === root ? changed : layer);
      } else {
        remaining.push(layer);
        if (layer.id === parentID) insertion = remaining.length;
      }
    }
    layers = [];
    for (let cursor = 0; cursor < insertion; cursor++) layers.push(remaining[cursor]!);
    for (const layer of branch) layers.push(layer);
    for (let cursor = insertion; cursor < remaining.length; cursor++) layers.push(remaining[cursor]!);
  }
  const next = bindCanonicalState(tryCreateLayerStackState, Object.freeze({ layers: Object.freeze(layers) }));
  return createMachineUpdate(next);
}

function closeFrom<ID extends StableID>(
  state: LayerStackState<ID>,
  index: number,
  reason: Exclude<LayerCloseReason, 'ancestor-closed'>,
): Result<LayerStackUpdate<ID>> {
  const closingIDs = new Set<ID>();
  const closing: Layer<ID>[] = [];
  const retained = state.layers.slice(0, index);
  for (let cursor = index; cursor < state.layers.length; cursor += 1) {
    const layer = state.layers[cursor]!;
    if (cursor === index || (layer.parentID !== null && closingIDs.has(layer.parentID))) {
      closingIDs.add(layer.id);
      closing.push(layer);
    } else retained.push(layer);
  }
  const next = Object.freeze({ layers: Object.freeze(retained) });
  // Shallow copies of foreign layers can still alias mutable records.
  if (hasCanonicalState(tryCreateLayerStackState, state)) bindCanonicalState(tryCreateLayerStackState, next);
  closing.reverse();
  return createMachineUpdate(
    next,
    closing.map((layer, commandIndex) => ({
      type: 'layer-closed' as const,
      id: layer.id,
      reason: commandIndex === closing.length - 1 ? reason : 'ancestor-closed' as const,
    })),
  );
}

function configureLayer<ID extends StableID>(state: LayerStackState<ID>, id: ID, policy: LayerPolicy): Result<LayerStackUpdate<ID>> {
  const index = state.layers.findIndex(layer => layer.id === id), previous = state.layers[index];
  if (previous === undefined) return fail('transition-rejection', 'layer-id-missing', 'The layer to configure must be open.', { id });
  if (policy === null || typeof policy !== 'object') return fail('transition-rejection', 'layer-dismiss-policy-invalid', 'A layer policy requires a record.');
  const { mode, dismissOnEscape, dismissOnInteractOutside } = policy;
  if (mode === undefined) return fail('transition-rejection', 'layer-mode-invalid', 'A complete layer policy requires its mode.');
  if (typeof dismissOnEscape !== 'boolean' || typeof dismissOnInteractOutside !== 'boolean') {
    return fail('transition-rejection', 'layer-dismiss-policy-invalid', 'A complete layer policy requires boolean dismissal policies.');
  }
  const next = normalizeLayer({ id, parentID: previous.parentID, mode, dismissOnEscape, dismissOnInteractOutside });
  if (!next.ok) return transitionFailure(next);
  if (previous.mode === next.value.mode && previous.dismissOnEscape === next.value.dismissOnEscape
    && previous.dismissOnInteractOutside === next.value.dismissOnInteractOutside) return createMachineUpdate(state);
  const layers = state.layers.slice(); layers[index] = next.value;
  return createMachineUpdate(bindCanonicalState(tryCreateLayerStackState, Object.freeze({ layers: Object.freeze(layers) })));
}

function normalizeLayer<ID extends StableID>(input: LayerInput<ID>): Result<Layer<ID>> {
  if (input.parentID !== undefined && input.parentID !== null && input.parentID === input.id) {
    return fail('construction', 'layer-self-parent', 'A layer cannot be its own parent.');
  }
  const mode = input.mode ?? 'non-modal';
  if (mode !== 'modal' && mode !== 'non-modal' && mode !== 'tooltip') {
    return fail('construction', 'layer-mode-invalid', 'Layer mode is invalid.');
  }
  if (
    (input.dismissOnEscape !== undefined && typeof input.dismissOnEscape !== 'boolean')
    || (input.dismissOnInteractOutside !== undefined
      && typeof input.dismissOnInteractOutside !== 'boolean')
  ) {
    return fail('construction', 'layer-dismiss-policy-invalid', 'Layer dismissal policies must be boolean.');
  }
  return ok(Object.freeze({
    id: input.id,
    parentID: input.parentID ?? null,
    mode,
    dismissOnEscape: input.dismissOnEscape ?? mode !== 'tooltip',
    dismissOnInteractOutside: input.dismissOnInteractOutside ?? mode !== 'modal',
  }));
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}
