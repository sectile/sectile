import type {
  FormCommand,
  FormEvent,
  FormState,
} from '@sectile/form/state';
import {
  encodeFormFieldPath,
  tryCreateFormFieldPath,
} from '@sectile/form/path';
import type { StableID } from '@sectile/core';
import type {
  FormParticipant,
  FormSubmissionElement,
} from './contracts.js';

export function readFormParticipantValue<ID extends StableID>(
  participant: FormParticipant<ID>,
): unknown {
  return participant.getValue === undefined
    ? readParticipantValue(participant)
    : participant.getValue();
}

export function formParticipantValuesEqual<ID extends StableID>(
  participant: FormParticipant<ID>,
  current: unknown,
  baseline: unknown,
): boolean {
  return participant.isValueEqual?.(current, baseline)
    ?? sameParticipantValue(current, baseline);
}

export function readParticipantName<ID extends StableID>(
  participant: FormParticipant<ID>,
): string | null {
  if (participant.name !== undefined && participant.name !== null) {
    return safeEncodeFormFieldPath(participant.name);
  }
  for (const element of participant.submissionElements ?? []) {
    const name = readControlName(element);
    if (name !== null) return name;
  }
  return readControlName(
    participant.semanticControl ?? participant.element,
  );
}

export function participantTargets<ID extends StableID>(
  participant: FormParticipant<ID>,
): readonly HTMLElement[] {
  return [...new Set([
    participant.element,
    participant.semanticControl,
    participant.focusTarget,
    participant.validationTarget,
    ...(participant.submissionElements ?? []),
  ].filter((element): element is HTMLElement => element !== undefined))];
}

export function validationTargets<ID extends StableID>(
  participant: FormParticipant<ID>,
): readonly HTMLElement[] {
  const semantic = participant.semanticControl;
  const validation = participant.validationTarget;
  const submissions = participant.submissionElements ?? [];
  const targets = [...new Set([validation, semantic, ...submissions].filter(
    (element): element is HTMLElement => element !== undefined,
  ))];
  return targets.length > 0 ? targets : [participant.element];
}

export function orderedParticipants<ID extends StableID>(
  participants: ReadonlyMap<ID, FormParticipant<ID>>,
): readonly FormParticipant<ID>[] {
  const byRegistration = [...participants.values()];
  const registrationIndex = new Map<ID, number>();
  for (let index = 0; index < byRegistration.length; index += 1) {
    registrationIndex.set(byRegistration[index]!.id, index);
  }
  return [...byRegistration].sort((left, right) => {
    const position = left.element.compareDocumentPosition(right.element);
    if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) return -1;
    if ((position & Node.DOCUMENT_POSITION_PRECEDING) !== 0) return 1;
    return registrationIndex.get(left.id)! - registrationIndex.get(right.id)!;
  });
}

export function reorderParticipants<ID extends StableID>(
  participants: ReadonlyMap<ID, FormParticipant<ID>>,
  state: FormState<ID>,
  transition: (event: FormEvent<ID>) => readonly FormCommand<ID>[] | null,
): void {
  const ids = orderedParticipants(participants).map((participant) => participant.id);
  if (
    ids.length === state.fields.length
    && ids.some((id, index) => state.fields[index]?.id !== id)
  ) transition({ type: 'reorder-fields', ids });
}

function readParticipantValue<ID extends StableID>(
  participant: FormParticipant<ID>,
): readonly unknown[] {
  const explicit = participant.submissionElements ?? [];
  const candidates = explicit.length > 0
    ? explicit
    : [participant.semanticControl ?? participant.element].filter(isSubmissionElement);
  return Object.freeze(candidates.map(readSubmissionValue));
}

function isSubmissionElement(element: HTMLElement): element is FormSubmissionElement {
  return element.tagName === 'BUTTON'
    || element.tagName === 'INPUT'
    || element.tagName === 'SELECT'
    || element.tagName === 'TEXTAREA';
}

function readSubmissionValue(element: FormSubmissionElement): unknown {
  if (element.tagName === 'SELECT') {
    const select = element as HTMLSelectElement;
    return Object.freeze([
      'select',
      select.multiple,
      Object.freeze([...select.options]
        .filter((option) => option.selected)
        .map((option) => option.value)),
    ]);
  }
  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    const type = input.type.toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      return Object.freeze(['checked', input.checked, input.value]);
    }
    if (type === 'file') {
      return Object.freeze([
        'files',
        Object.freeze(Array.from(input.files ?? []).map((file) => Object.freeze([
          file.name,
          file.size,
          file.type,
          file.lastModified,
        ]))),
      ]);
    }
  }
  return Object.freeze(['value', element.value]);
}

function sameParticipantValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => sameParticipantValue(value, right[index]));
}

function readControlName(element: HTMLElement): string | null {
  const name = (element as HTMLElement & { readonly name?: string }).name?.trim();
  return name === undefined || name.length === 0 ? null : name;
}

function safeEncodeFormFieldPath(path: import('@sectile/form/path').FormFieldPath): string | null {
  const result = tryCreateFormFieldPath(path);
  return result.ok ? encodeFormFieldPath(result.value) : null;
}
