import type { SectileError, StableID } from '@sectile/primitives';
import {
  stepListbox,
  type ListboxCommand,
  type ListboxEvent,
  type ListboxPolicies,
  type ListboxState,
} from '@sectile/primitives/listbox';
import type { Sequence } from '@sectile/primitives/sequence';
import {
  stepRevisioned,
  type RevisionEnvelope,
  type RevisionedResult,
} from '@sectile/primitives/revision';

export interface DOMKeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export type DOMListboxEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-element'; readonly id: ID }
  | { readonly type: 'dispatch-activation'; readonly id: ID };

export function stepDOMListboxAdapter<ID extends StableID>(
  domain: Sequence<ID>,
  current: RevisionEnvelope<ListboxState<ID>>,
  expectedRevision: number,
  input: DOMKeyboardInput,
  policies: ListboxPolicies<ID> = {},
): RevisionedResult<ListboxState<ID>, DOMListboxEffect<ID>> {
  const event = DOMListboxEvent(input);
  if (event === null) {
    return rejected(current, {
      class: 'transition-rejection',
      code: 'unsupported-dom-key',
      message: 'DOM keyboard input does not map to a listbox semantic event.',
      details: { key: input.key },
    });
  }
  const result = stepRevisioned<ListboxState<ID>, ListboxEvent, ListboxCommand<ID>>(
    current,
    expectedRevision,
    event,
    (state, semanticEvent) => stepListbox(domain, state, semanticEvent, policies),
  );
  if (!result.ok) return result;
  return Object.freeze({
    ok: true,
    envelope: result.envelope,
    commands: Object.freeze(result.commands.map(DOMListboxEffect)),
  });
}

export function DOMListboxEvent(input: DOMKeyboardInput): ListboxEvent | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  if (input.key === 'ArrowDown') return 'next';
  if (input.key === 'ArrowUp') return 'previous';
  if (input.key === ' ') return 'toggle';
  if (input.key === 'Enter') return 'activate';
  if (input.key === 'Escape') return 'clear';
  return null;
}

export function DOMListboxEffect<ID extends StableID>(
  command: ListboxCommand<ID>,
): DOMListboxEffect<ID> {
  return Object.freeze(command.type === 'focus'
    ? { type: 'focus-element', id: command.id }
    : { type: 'dispatch-activation', id: command.id });
}

function rejected<ID extends StableID>(
  current: RevisionEnvelope<ListboxState<ID>>,
  error: SectileError,
): RevisionedResult<ListboxState<ID>, DOMListboxEffect<ID>> {
  return Object.freeze({
    ok: false,
    envelope: current,
    commands: Object.freeze([]) as readonly [],
    error,
  });
}
