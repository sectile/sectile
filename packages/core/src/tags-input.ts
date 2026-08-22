import type { Result } from './shared.js';
import { fail, freezeArray, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';

export interface TagsInputState { readonly tags: readonly string[]; readonly draft: string; readonly current: number | null }
export type TagsInputEvent = { readonly type: 'input'; readonly value: string } | { readonly type: 'add'; readonly value?: string } | { readonly type: 'remove'; readonly index: number } | 'remove-current' | 'next' | 'previous' | 'focus-input' | { readonly type: 'focus-tag'; readonly index: number };
export type TagsInputCommand = { readonly type: 'focus-tag'; readonly index: number } | { readonly type: 'focus-input' } | { readonly type: 'announce-tag'; readonly action: 'added' | 'removed'; readonly value: string };
export interface TagsInputPolicies { readonly maxTags?: number; readonly normalize?: (value: string) => string; readonly allowDuplicate?: boolean }
export interface TagsInputUpdate { readonly state: TagsInputState; readonly commands: readonly TagsInputCommand[] }

export function createTagsInputState(tags: readonly string[] = [], draft = '', current: number | null = null): Result<TagsInputState> {
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string' || tag.length === 0) || typeof draft !== 'string') return fail('construction', 'invalid-tags-input-value', 'Tags input requires non-empty text tags and a text draft.');
  if (current !== null && (!Number.isSafeInteger(current) || current < 0 || current >= tags.length)) return fail('construction', 'invalid-tags-input-current', 'Tags input current index must identify an existing tag.');
  return ok(Object.freeze({ tags: freezeArray(tags), draft, current }));
}
export function applyTagsInputEvent(state: TagsInputState, event: TagsInputEvent, policies: TagsInputPolicies = {}): Result<TagsInputUpdate> {
  const valid = createTagsInputState(state.tags, state.draft, state.current); if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  const focus = (current: number | null): Result<TagsInputUpdate> => createMachineUpdate(Object.freeze({ tags: state.tags, draft: state.draft, current }), [current === null ? { type: 'focus-input' } : { type: 'focus-tag', index: current }]);
  if (event === 'focus-input') return focus(null);
  if (event === 'next') return focus(state.current === null || state.current >= state.tags.length - 1 ? null : state.current + 1);
  if (event === 'previous') return focus(state.tags.length === 0 ? null : state.current === null ? state.tags.length - 1 : Math.max(0, state.current - 1));
  if (typeof event === 'object' && event.type === 'focus-tag') return event.index >= 0 && event.index < state.tags.length ? focus(event.index) : fail('transition-rejection', 'tags-input-index-outside-domain', 'Tags input focus index must identify an existing tag.');
  if (typeof event === 'object' && event.type === 'input') return typeof event.value === 'string' ? createMachineUpdate(Object.freeze({ tags: state.tags, draft: event.value, current: null })) : fail('transition-rejection', 'invalid-tags-input-draft', 'Tags input draft must be text.');
  if (typeof event === 'object' && event.type === 'add') { const normalize = policies.normalize ?? ((value: string) => value.trim()); const value = normalize(event.value ?? state.draft); if (value.length === 0) return fail('transition-rejection', 'empty-tag', 'Tags input cannot add an empty tag.'); if (policies.allowDuplicate !== true && state.tags.includes(value)) return fail('transition-rejection', 'duplicate-tag', 'Tags input does not allow duplicate tags by default.', { value }); if (policies.maxTags !== undefined && state.tags.length >= policies.maxTags) return fail('resource-rejection', 'max-tags-exceeded', 'Tags input reached its configured tag ceiling.', { maxTags: policies.maxTags }); return createMachineUpdate(Object.freeze({ tags: freezeArray([...state.tags, value]), draft: '', current: null }), [{ type: 'announce-tag', action: 'added', value }]); }
  const index = event === 'remove-current' ? state.current : typeof event === 'object' && event.type === 'remove' ? event.index : null;
  if (index === null || index < 0 || index >= state.tags.length) return fail('transition-rejection', 'tags-input-index-outside-domain', 'Tags input removal requires an existing tag.');
  const value = state.tags[index] ?? ''; const tags = state.tags.filter((_, candidate) => candidate !== index); const current = tags.length === 0 ? null : Math.min(index, tags.length - 1);
  return createMachineUpdate(Object.freeze({ tags: freezeArray(tags), draft: state.draft, current }), [{ type: 'announce-tag', action: 'removed', value }, ...(current === null ? [{ type: 'focus-input' as const }] : [{ type: 'focus-tag' as const, index: current }])]);
}
