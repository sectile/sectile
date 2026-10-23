import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import { bindCanonicalState, fail, hasCanonicalState, ok } from './internal/kernel/foundation.js';

/** User-defined notification category projected to `data-kind`. */
export type ToastKind = string;
export interface ToastInput<ID extends StableID = StableID> { readonly id: ID; readonly title: string; readonly description?: string; readonly kind?: ToastKind; /** `null` keeps the toast until dismissed. */ readonly durationMs?: number | null }
export interface ToastItem<ID extends StableID = StableID> { readonly id: ID; readonly title: string; readonly description: string | null; readonly kind: ToastKind; readonly durationMs: number | null; readonly remainingMs: number | null }
export interface ToastState<ID extends StableID = StableID> { readonly items: readonly ToastItem<ID>[]; readonly paused: boolean }
export type ToastEvent<ID extends StableID = StableID> = { readonly type: 'push'; readonly toast: ToastInput<ID> } | { readonly type: 'update'; readonly id: ID; readonly toast: Partial<Omit<ToastInput<ID>, 'id'>> } | { readonly type: 'dismiss'; readonly id: ID } | { readonly type: 'tick'; readonly elapsedMs: number } | 'dismiss-all' | 'pause' | 'resume';
export type ToastCommand<ID extends StableID = StableID> = { readonly type: 'announce-toast'; readonly id: ID; readonly kind: ToastKind } | { readonly type: 'toast-dismissed'; readonly id: ID; readonly reason: 'manual' | 'timeout' | 'overflow' };
export interface ToastPolicies { readonly defaultDurationMs?: number | null; readonly maxVisible?: number }
export interface ToastUpdate<ID extends StableID = StableID> { readonly state: ToastState<ID>; readonly commands: readonly ToastCommand<ID>[] }

/** Materialize controlled input values without exposing internal countdown progress. O(n). */
export function getToastInputs<ID extends StableID>(items: readonly ToastItem<ID>[]): readonly ToastInput<ID>[] {
  return Object.freeze(items.map(item => Object.freeze({ id: item.id, title: item.title,
    ...(item.description === null ? {} : { description: item.description }), kind: item.kind, durationMs: item.durationMs })));
}

export function createToastState<ID extends StableID>(items: readonly ToastInput<ID>[] = [], paused = false, policies: ToastPolicies = {}): ToastState<ID> {
  return unwrap(tryCreateToastState(items, paused, policies));
}

export function tryCreateToastState<ID extends StableID>(items: readonly ToastInput<ID>[] = [], paused = false, policies: ToastPolicies = {}): Result<ToastState<ID>> {
  const normalized: ToastItem<ID>[] = [];
  const ids = new Set<ID>();
  for (const item of items) {
    const result = normalizeToast(item, policies.defaultDurationMs);
    if (!result.ok) return result;
    if (ids.has(result.value.id)) return fail('construction', 'toast-id-duplicate', 'Toast identifiers must be unique.');
    ids.add(result.value.id);
    normalized.push(result.value);
  }
  const maxVisible = policies.maxVisible ?? Number.POSITIVE_INFINITY;
  if (maxVisible !== Number.POSITIVE_INFINITY && (!Number.isInteger(maxVisible) || maxVisible < 1)) return fail('construction', 'toast-max-visible-invalid', 'Toast maxVisible must be a positive integer.');
  return ok(bindCanonicalState(tryCreateToastState, Object.freeze({ items: Object.freeze(normalized.slice(-maxVisible)), paused })));
}

export function applyToastEvent<ID extends StableID>(state: ToastState<ID>, event: ToastEvent<ID>, policies: ToastPolicies = {}): Result<ToastUpdate<ID>> {
  const invalid = validateToastState(state, policies);
  if (invalid !== undefined) return invalid;
  const maxVisible = policies.maxVisible ?? Number.POSITIVE_INFINITY;
  if (event === 'pause' || event === 'resume') return update(state, Object.freeze({ items: state.items, paused: event === 'pause' }));
  if (event === 'dismiss-all') return update(state, Object.freeze({ items: Object.freeze([]), paused: state.paused }), state.items.map((item) => ({ type: 'toast-dismissed', id: item.id, reason: 'manual' as const })));
  if (event.type === 'dismiss') {
    if (!state.items.some((item) => item.id === event.id)) return fail('transition-rejection', 'toast-id-missing', 'The toast to dismiss does not exist.');
    return update(state, Object.freeze({ items: Object.freeze(state.items.filter((item) => item.id !== event.id)), paused: state.paused }), [{ type: 'toast-dismissed', id: event.id, reason: 'manual' }]);
  }
  if (event.type === 'push') {
    if (state.items.some((item) => item.id === event.toast.id)) return fail('transition-rejection', 'toast-id-duplicate', 'Toast identifiers must be unique.');
    const normalized = normalizeToast(event.toast, policies.defaultDurationMs);
    if (!normalized.ok) return fail('transition-rejection', normalized.error.code, normalized.error.message);
    const next = [...state.items, normalized.value];
    const overflow = next.length > maxVisible ? next.splice(0, next.length - maxVisible) : [];
    return update(state, Object.freeze({ items: Object.freeze(next), paused: state.paused }), [...overflow.map((item) => ({ type: 'toast-dismissed' as const, id: item.id, reason: 'overflow' as const })), { type: 'announce-toast', id: normalized.value.id, kind: normalized.value.kind }]);
  }
  if (event.type === 'update') {
    const index = state.items.findIndex((item) => item.id === event.id);
    if (index < 0) return fail('transition-rejection', 'toast-id-missing', 'The toast to update does not exist.');
    const current = state.items[index]!;
    const description = event.toast.description ?? current.description;
    const normalized = normalizeToast({ id: current.id, title: event.toast.title ?? current.title, ...(description === null ? {} : { description }), kind: event.toast.kind ?? current.kind, durationMs: event.toast.durationMs === undefined ? current.durationMs : event.toast.durationMs }, policies.defaultDurationMs);
    if (!normalized.ok) return fail('transition-rejection', normalized.error.code, normalized.error.message);
    const items = [...state.items]; items[index] = normalized.value;
    return update(state, Object.freeze({ items: Object.freeze(items), paused: state.paused }));
  }
  if (!Number.isFinite(event.elapsedMs) || event.elapsedMs < 0) return fail('transition-rejection', 'toast-elapsed-invalid', 'Toast elapsed time must be finite and non-negative.');
  if (state.paused || event.elapsedMs === 0) return update(state, state);
  const dismissed: ToastCommand<ID>[] = [];
  const items = state.items.flatMap((item): readonly ToastItem<ID>[] => {
    if (item.remainingMs === null) return [item];
    if (item.remainingMs === 0) return [item];
    const remainingMs = Math.max(0, item.remainingMs - event.elapsedMs);
    if (remainingMs === 0) { dismissed.push({ type: 'toast-dismissed', id: item.id, reason: 'timeout' }); return []; }
    return [Object.freeze({ ...item, remainingMs })];
  });
  return update(state, Object.freeze({ items: Object.freeze(items), paused: state.paused }), dismissed);
}

/** Commit countdown progress without accepting externally controlled membership or content. */
export function reconcileToastProposal<ID extends StableID>(previous: ToastState<ID>, proposed: ToastState<NoInfer<ID>>, source: 'input' | 'clock', policies: ToastPolicies = {}): Result<ToastState<ID>> {
  const invalid = validateToastState(previous, policies) ?? validateToastState(proposed, policies);
  if (invalid !== undefined) return invalid;
  let items = previous.items;
  if (source === 'clock' && previous.items !== proposed.items) {
    const proposedByID = new Map(proposed.items.map(item => [item.id, item] as const));
    items = Object.freeze(previous.items.map(item => {
      const candidate = proposedByID.get(item.id);
      const remainingMs = item.remainingMs === null ? null : candidate === undefined ? 0
        : candidate.durationMs === item.durationMs && candidate.remainingMs !== null ? Math.min(item.remainingMs, candidate.remainingMs) : item.remainingMs;
      if (remainingMs === item.remainingMs) return item;
      return candidate !== undefined && candidate.remainingMs === remainingMs && sameToastInput(item, candidate)
        ? candidate : Object.freeze({ ...item, remainingMs });
    }));
  }
  const state = Object.freeze({ items, paused: proposed.paused });
  return ok(hasCanonicalState(tryCreateToastState, previous) && hasCanonicalState(tryCreateToastState, proposed)
    ? bindCanonicalState(tryCreateToastState, state) : state);
}

/** Accept external items, retaining elapsed countdowns when ID and duration still match. */
export function reconcileToastState<ID extends StableID>(previous: ToastState<ID>, inputs: readonly ToastInput<NoInfer<ID>>[], policies: ToastPolicies = {}): Result<ToastState<ID>> {
  const normalized = tryCreateToastState(inputs, previous.paused, policies);
  if (!normalized.ok) return normalized;
  const invalid = validateToastState(previous, policies);
  if (invalid !== undefined) return invalid;
  const previousByID = new Map(previous.items.map(item => [item.id, item] as const));
  const items = normalized.value.items.map(item => {
    const current = previousByID.get(item.id);
    return current === undefined || current.durationMs !== item.durationMs ? item : Object.freeze({ ...item, remainingMs: current.remainingMs });
  });
  const state = Object.freeze({ items: Object.freeze(items), paused: normalized.value.paused });
  return ok(hasCanonicalState(tryCreateToastState, previous) ? bindCanonicalState(tryCreateToastState, state) : state);
}

/** Compare controlled input fields; elapsed countdown progress is not an input change. */
export function areToastInputsEqual<ID extends StableID>(previous: readonly ToastItem<ID>[], proposed: readonly ToastItem<NoInfer<ID>>[]): boolean {
  return previous === proposed || (previous.length === proposed.length && previous.every((item, index) => {
    const candidate = proposed[index];
    return candidate !== undefined && sameToastInput(item, candidate);
  }));
}

function sameToastInput<ID extends StableID>(left: ToastItem<ID>, right: ToastItem<ID>): boolean {
  return left.id === right.id && left.title === right.title && left.description === right.description && left.kind === right.kind && left.durationMs === right.durationMs;
}

function validateToastState<ID extends StableID>(state: ToastState<ID>, policies: ToastPolicies): Result<never> | undefined {
  if (!hasCanonicalState(tryCreateToastState, state)) {
    const valid = tryCreateToastState(state.items.map(item => ({ id: item.id, title: item.title, ...(item.description === null ? {} : { description: item.description }), kind: item.kind, durationMs: item.durationMs })), state.paused, policies);
    if (!valid.ok) return fail('transition-rejection', valid.error.code, valid.error.message);
  }
  const maxVisible = policies.maxVisible ?? Number.POSITIVE_INFINITY;
  if (maxVisible !== Number.POSITIVE_INFINITY && (!Number.isInteger(maxVisible) || maxVisible < 1)) return fail('transition-rejection', 'toast-max-visible-invalid', 'Toast maxVisible must be a positive integer.');
  return undefined;
}

function normalizeToast<ID extends StableID>(input: ToastInput<ID>, defaultDurationMs: number | null | undefined): Result<ToastItem<ID>> {
  const title = input.title.trim();
  if (title.length === 0) return fail('construction', 'toast-title-empty', 'Toast title must not be empty.');
  const durationMs = input.durationMs === undefined ? defaultDurationMs === undefined ? 5_000 : defaultDurationMs : input.durationMs;
  if (durationMs !== null && (!Number.isFinite(durationMs) || durationMs <= 0)) return fail('construction', 'toast-duration-invalid', 'Toast duration must be positive and finite, or null.');
  return ok(Object.freeze({ id: input.id, title, description: input.description?.trim() || null, kind: input.kind?.trim() || 'info', durationMs, remainingMs: durationMs }));
}
function update<ID extends StableID>(previous: ToastState<ID>, state: ToastState<ID>, commands: readonly ToastCommand<ID>[] = []): Result<ToastUpdate<ID>> {
  // Foreign states may alias mutable items; successful validation alone cannot make them trusted.
  if (hasCanonicalState(tryCreateToastState, previous)) bindCanonicalState(tryCreateToastState, state);
  return ok(Object.freeze({ state, commands: Object.freeze([...commands]) }));
}
