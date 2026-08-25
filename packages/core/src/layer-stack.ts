import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { unwrap } from './result.js';
import { tryCreateSequence } from './structures/sequence.js';
import type { Result, StableID } from './shared.js';

export type LayerMode = 'modal' | 'non-modal' | 'tooltip';
export type LayerDismissReason = 'escape' | 'interact-outside';
export type LayerCloseReason = LayerDismissReason | 'programmatic' | 'ancestor-closed';

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
  | { readonly type: 'dismiss-top'; readonly reason: LayerDismissReason };

export type LayerStackCommand<ID extends StableID = StableID> =
  | { readonly type: 'layer-opened'; readonly id: ID }
  | { readonly type: 'layer-closed'; readonly id: ID; readonly reason: LayerCloseReason };

export type LayerStackUpdate<ID extends StableID = StableID> =
  MachineUpdate<LayerStackState<ID>, LayerStackCommand<ID>>;

export function createLayerStackState<ID extends StableID = StableID>(
  layers: readonly LayerInput<ID>[] = [],
): LayerStackState<ID> {
  return unwrap(tryCreateLayerStackState(layers));
}

export function tryCreateLayerStackState<ID extends StableID = StableID>(
  inputs: readonly LayerInput<ID>[] = [],
): Result<LayerStackState<ID>> {
  const ids = tryCreateSequence(inputs.map((layer) => layer.id));
  if (!ids.ok) return ids;
  const layers: Layer<ID>[] = [];
  for (const input of inputs) {
    const normalized = normalizeLayer(input);
    if (!normalized.ok) return normalized;
    const parentID = normalized.value.parentID;
    if (parentID !== null && layers.at(-1)?.id !== parentID) {
      return fail(
        'construction',
        'layer-parent-not-topmost',
        'A nested layer must open directly above its current topmost parent.',
        { id: input.id, parentID },
      );
    }
    layers.push(normalized.value);
  }
  return ok(Object.freeze({ layers: Object.freeze(layers) }));
}

export function applyLayerStackEvent<ID extends StableID>(
  state: LayerStackState<ID>,
  event: LayerStackEvent<ID>,
): Result<LayerStackUpdate<ID>> {
  const valid = tryCreateLayerStackState(state.layers);
  if (!valid.ok) return transitionFailure(valid);

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

function closeFrom<ID extends StableID>(
  state: LayerStackState<ID>,
  index: number,
  reason: Exclude<LayerCloseReason, 'ancestor-closed'>,
): Result<LayerStackUpdate<ID>> {
  let end = index + 1;
  while (
    end < state.layers.length
    && state.layers[end]?.parentID === state.layers[end - 1]?.id
  ) {
    end += 1;
  }
  const closing = state.layers.slice(index, end).reverse();
  return createMachineUpdate(
    Object.freeze({
      layers: Object.freeze([
        ...state.layers.slice(0, index),
        ...state.layers.slice(end),
      ]),
    }),
    closing.map((layer, commandIndex) => ({
      type: 'layer-closed' as const,
      id: layer.id,
      reason: commandIndex === closing.length - 1 ? reason : 'ancestor-closed' as const,
    })),
  );
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
