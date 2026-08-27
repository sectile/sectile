import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';

/** User-defined notification category projected to `data-kind`. */
export type ToastKind = string;
export interface ToastInput<ID extends StableID = StableID> { readonly id: ID; readonly title: string; readonly description?: string; readonly kind?: ToastKind; /** `null` keeps the toast until dismissed. */ readonly durationMs?: number | null }
export interface ToastItem<ID extends StableID = StableID> { readonly id: ID; readonly title: string; readonly description: string | null; readonly kind: ToastKind; readonly durationMs: number | null; readonly remainingMs: number | null }
export interface ToastState<ID extends StableID = StableID> { readonly items: readonly ToastItem<ID>[]; readonly paused: boolean }
export type ToastEvent<ID extends StableID = StableID> = { readonly type: 'push'; readonly toast: ToastInput<ID> } | { readonly type: 'update'; readonly id: ID; readonly toast: Partial<Omit<ToastInput<ID>, 'id'>> } | { readonly type: 'dismiss'; readonly id: ID } | { readonly type: 'tick'; readonly elapsedMs: number } | 'dismiss-all' | 'pause' | 'resume';
export type ToastCommand<ID extends StableID = StableID> = { readonly type: 'announce-toast'; readonly id: ID; readonly kind: ToastKind } | { readonly type: 'toast-dismissed'; readonly id: ID; readonly reason: 'manual' | 'timeout' | 'overflow' };
export interface ToastPolicies { readonly defaultDurationMs?: number | null; readonly maxVisible?: number }
export interface ToastUpdate<ID extends StableID = StableID> { readonly state: ToastState<ID>; readonly commands: readonly ToastCommand<ID>[] }

export function createToastState<ID extends StableID>(items: readonly ToastInput<ID>[] = [], paused = false, policies: ToastPolicies = {}): ToastState<ID> {
  return unwrap(tryCreateToastState(items, paused, policies));
}

export function tryCreateToastState<ID extends StableID>(items: readonly ToastInput<ID>[] = [], paused = false, policies: ToastPolicies = {}): Result<ToastState<ID>> {
  const normalized: ToastItem<ID>[] = [];
  for (const item of items) {
    const result = normalizeToast(item, policies.defaultDurationMs ?? 5_000);
    if (!result.ok) return result;
    if (normalized.some((candidate) => candidate.id === item.id)) return fail('construction', 'toast-id-duplicate', 'Toast identifiers must be unique.');
    normalized.push(result.value);
  }
  const maxVisible = policies.maxVisible ?? Number.POSITIVE_INFINITY;
  if (maxVisible !== Number.POSITIVE_INFINITY && (!Number.isInteger(maxVisible) || maxVisible < 1)) return fail('construction', 'toast-max-visible-invalid', 'Toast maxVisible must be a positive integer.');
  return ok(Object.freeze({ items: Object.freeze(normalized.slice(-maxVisible)), paused }));
}

export function applyToastEvent<ID extends StableID>(state: ToastState<ID>, event: ToastEvent<ID>, policies: ToastPolicies = {}): Result<ToastUpdate<ID>> {
  const valid = tryCreateToastState(state.items.map((item) => ({ id: item.id, title: item.title, ...(item.description === null ? {} : { description: item.description }), kind: item.kind, durationMs: item.durationMs })), state.paused, policies);
  if (!valid.ok) return fail('transition-rejection', valid.error.code, valid.error.message);
  if (event === 'pause' || event === 'resume') return update(Object.freeze({ items: state.items, paused: event === 'pause' }));
  if (event === 'dismiss-all') return update(Object.freeze({ items: Object.freeze([]), paused: state.paused }), state.items.map((item) => ({ type: 'toast-dismissed', id: item.id, reason: 'manual' as const })));
  if (event.type === 'dismiss') {
    if (!state.items.some((item) => item.id === event.id)) return fail('transition-rejection', 'toast-id-missing', 'The toast to dismiss does not exist.');
    return update(Object.freeze({ items: Object.freeze(state.items.filter((item) => item.id !== event.id)), paused: state.paused }), [{ type: 'toast-dismissed', id: event.id, reason: 'manual' }]);
  }
  if (event.type === 'push') {
    if (state.items.some((item) => item.id === event.toast.id)) return fail('transition-rejection', 'toast-id-duplicate', 'Toast identifiers must be unique.');
    const normalized = normalizeToast(event.toast, policies.defaultDurationMs ?? 5_000);
    if (!normalized.ok) return fail('transition-rejection', normalized.error.code, normalized.error.message);
    const maxVisible = policies.maxVisible ?? Number.POSITIVE_INFINITY;
    if (maxVisible !== Number.POSITIVE_INFINITY && (!Number.isInteger(maxVisible) || maxVisible < 1)) return fail('transition-rejection', 'toast-max-visible-invalid', 'Toast maxVisible must be a positive integer.');
    const next = [...state.items, normalized.value];
    const overflow = next.length > maxVisible ? next.splice(0, next.length - maxVisible) : [];
    return update(Object.freeze({ items: Object.freeze(next), paused: state.paused }), [...overflow.map((item) => ({ type: 'toast-dismissed' as const, id: item.id, reason: 'overflow' as const })), { type: 'announce-toast', id: normalized.value.id, kind: normalized.value.kind }]);
  }
  if (event.type === 'update') {
    const index = state.items.findIndex((item) => item.id === event.id);
    if (index < 0) return fail('transition-rejection', 'toast-id-missing', 'The toast to update does not exist.');
    const current = state.items[index]!;
    const description = event.toast.description ?? current.description;
    const normalized = normalizeToast({ id: current.id, title: event.toast.title ?? current.title, ...(description === null ? {} : { description }), kind: event.toast.kind ?? current.kind, durationMs: event.toast.durationMs === undefined ? current.durationMs : event.toast.durationMs }, policies.defaultDurationMs ?? 5_000);
    if (!normalized.ok) return fail('transition-rejection', normalized.error.code, normalized.error.message);
    const items = [...state.items]; items[index] = normalized.value;
    return update(Object.freeze({ items: Object.freeze(items), paused: state.paused }));
  }
  if (!Number.isFinite(event.elapsedMs) || event.elapsedMs < 0) return fail('transition-rejection', 'toast-elapsed-invalid', 'Toast elapsed time must be finite and non-negative.');
  if (state.paused || event.elapsedMs === 0) return update(state);
  const dismissed: ToastCommand<ID>[] = [];
  const items = state.items.flatMap((item): readonly ToastItem<ID>[] => {
    if (item.remainingMs === null) return [item];
    if (item.remainingMs === 0) return [item];
    const remainingMs = Math.max(0, item.remainingMs - event.elapsedMs);
    if (remainingMs === 0) { dismissed.push({ type: 'toast-dismissed', id: item.id, reason: 'timeout' }); return []; }
    return [Object.freeze({ ...item, remainingMs })];
  });
  return update(Object.freeze({ items: Object.freeze(items), paused: state.paused }), dismissed);
}

function normalizeToast<ID extends StableID>(input: ToastInput<ID>, defaultDurationMs: number | null): Result<ToastItem<ID>> {
  const title = input.title.trim();
  if (title.length === 0) return fail('construction', 'toast-title-empty', 'Toast title must not be empty.');
  const durationMs = input.durationMs === undefined ? defaultDurationMs : input.durationMs;
  if (durationMs !== null && (!Number.isFinite(durationMs) || durationMs <= 0)) return fail('construction', 'toast-duration-invalid', 'Toast duration must be positive and finite, or null.');
  return ok(Object.freeze({ id: input.id, title, description: input.description?.trim() || null, kind: input.kind?.trim() || 'info', durationMs, remainingMs: durationMs }));
}
function update<ID extends StableID>(state: ToastState<ID>, commands: readonly ToastCommand<ID>[] = []): Result<ToastUpdate<ID>> { return ok(Object.freeze({ state, commands: Object.freeze([...commands]) })); }
