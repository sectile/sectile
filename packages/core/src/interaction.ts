import { unwrap } from './result.js';
import type { Result } from './shared.js';

export type InteractionIntent = 'navigate' | 'mutate';

export interface InteractionStateInput {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}

export interface InteractionState {
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

export function createInteractionState(
  input: InteractionStateInput = {},
): InteractionState {
  return unwrap(tryCreateInteractionState(input));
}

export function tryCreateInteractionState(
  input: InteractionStateInput = {},
): Result<InteractionState> {
  if (input.disabled !== undefined && typeof input.disabled !== 'boolean') {
    return failure('construction', 'invalid-disabled-state', 'disabled must be boolean.');
  }
  if (input.readOnly !== undefined && typeof input.readOnly !== 'boolean') {
    return failure('construction', 'invalid-read-only-state', 'readOnly must be boolean.');
  }
  return {
    ok: true,
    value: Object.freeze({
      disabled: input.disabled ?? false,
      readOnly: input.readOnly ?? false,
    }),
  };
}

export function permitsInteraction(
  state: InteractionState,
  intent: InteractionIntent,
): boolean {
  return !state.disabled && (intent === 'navigate' || !state.readOnly);
}

export function requireInteraction(
  state: InteractionState,
  intent: InteractionIntent,
): Result<true> {
  if (state.disabled) {
    return failure(
      'transition-rejection',
      'interaction-disabled',
      'Disabled controls reject user interaction.',
    );
  }
  if (state.readOnly && intent === 'mutate') {
    return failure(
      'transition-rejection',
      'interaction-read-only',
      'Read-only controls reject value mutation.',
    );
  }
  return { ok: true, value: true };
}

function failure(
  errorClass: 'construction' | 'transition-rejection',
  code: string,
  message: string,
): Result<never> {
  return {
    ok: false,
    error: {
      class: errorClass,
      code,
      message,
    },
  };
}
