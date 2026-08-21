import type { SectileError, StableID } from '../../shared.js';
import type { Sequence } from '../../structures/sequence.js';
import {
  stepListbox,
  type ListboxCommand,
  type ListboxEvent,
  type ListboxPolicies,
  type ListboxState,
} from '../composites/listbox.js';
import {
  stepRevisioned,
  type RevisionEnvelope,
  type RevisionedResult,
} from '../runtime/revision.js';

export interface TerminalKeyboardInput {
  readonly key: string;
}

export type TerminalListboxEffect<ID extends StableID = StableID> =
  | { readonly type: 'move-highlight'; readonly id: ID }
  | { readonly type: 'submit-item'; readonly id: ID };

export function stepTerminalListboxAdapter<ID extends StableID>(
  domain: Sequence<ID>,
  current: RevisionEnvelope<ListboxState<ID>>,
  expectedRevision: number,
  input: TerminalKeyboardInput,
  policies: ListboxPolicies<ID> = {},
): RevisionedResult<ListboxState<ID>, TerminalListboxEffect<ID>> {
  const event = terminalListboxEvent(input);
  if (event === null) {
    return rejected(current, {
      class: 'transition-rejection',
      code: 'unsupported-terminal-key',
      message: 'Terminal keyboard input does not map to a listbox semantic event.',
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
    commands: Object.freeze(result.commands.map(terminalListboxEffect)),
  });
}

export function terminalListboxEvent(input: TerminalKeyboardInput): ListboxEvent | null {
  if (input.key === 'down') return 'next';
  if (input.key === 'up') return 'previous';
  if (input.key === 'space') return 'toggle';
  if (input.key === 'enter') return 'activate';
  if (input.key === 'escape') return 'clear';
  return null;
}

export function terminalListboxEffect<ID extends StableID>(
  command: ListboxCommand<ID>,
): TerminalListboxEffect<ID> {
  return Object.freeze(command.type === 'focus'
    ? { type: 'move-highlight', id: command.id }
    : { type: 'submit-item', id: command.id });
}

function rejected<ID extends StableID>(
  current: RevisionEnvelope<ListboxState<ID>>,
  error: SectileError,
): RevisionedResult<ListboxState<ID>, TerminalListboxEffect<ID>> {
  return Object.freeze({
    ok: false,
    envelope: current,
    commands: Object.freeze([]) as readonly [],
    error,
  });
}
