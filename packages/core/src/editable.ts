import { unwrap } from './result.js';
import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';

export interface EditableState { readonly value: string; readonly draft: string; readonly editing: boolean }
export type EditableEvent = 'start-edit' | 'commit' | 'cancel' | { readonly type: 'input'; readonly text: string };
export type EditableCommand = { readonly type: 'focus-input' | 'focus-preview' } | { readonly type: 'commit'; readonly value: string };
export interface EditablePolicies { readonly normalize?: (draft: string) => string; readonly validate?: (draft: string) => boolean; readonly allowEmpty?: boolean }
export type EditableUpdate = MachineUpdate<EditableState, EditableCommand>;

export function createEditableState(value: string = '', draft: string = value, editing: boolean = false): EditableState {
  return unwrap(tryCreateEditableState(value, draft, editing));
}

export function tryCreateEditableState(value: string = '', draft: string = value, editing: boolean = false): Result<EditableState> {
  if (typeof value !== 'string' || typeof draft !== 'string') return fail('construction', 'invalid-editable-text', 'Editable value and draft must be strings.');
  if (!editing && draft !== value) return fail('construction', 'idle-editable-has-draft', 'An idle editable must keep its draft synchronized with value.');
  return ok(Object.freeze({ value, draft, editing }));
}

export function applyEditableEvent(state: EditableState, event: EditableEvent, policies: EditablePolicies = {}): Result<EditableUpdate> {
  const valid = tryCreateEditableState(state.value, state.draft, state.editing);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (event === 'start-edit') return state.editing ? createMachineUpdate(state) : createMachineUpdate(editableState(state.value, state.value, true), [{ type: 'focus-input' }]);
  if (event === 'cancel') return state.editing ? createMachineUpdate(editableState(state.value, state.value, false), [{ type: 'focus-preview' }]) : createMachineUpdate(state);
  if (typeof event === 'object') return state.editing ? createMachineUpdate(editableState(state.value, event.text, true)) : fail('transition-rejection', 'editable-not-editing', 'Draft input requires editing mode.');
  if (!state.editing) return createMachineUpdate(state);
  const value = policies.normalize?.(state.draft) ?? state.draft;
  if (value.length === 0 && policies.allowEmpty === false) return fail('transition-rejection', 'editable-empty-value', 'Editable policy rejects an empty value.');
  if (policies.validate?.(value) === false) return fail('transition-rejection', 'editable-invalid-value', 'Editable policy rejected the draft.');
  return createMachineUpdate(editableState(value, value, false), [{ type: 'commit', value }, { type: 'focus-preview' }]);
}

function editableState(value: string, draft: string, editing: boolean): EditableState { return Object.freeze({ value, draft, editing }); }
