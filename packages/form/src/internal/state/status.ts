import type { FormResult as Result } from '../../error.js';
import { fail, ok } from '../result.js';
import type { State, Submission, SubmissionFailure, SubmissionStatus, Validation, ValidationIntent, ValidationStatus, ValidationTrigger } from './contracts.js';
import type { StableID } from '@sectile/core';

export function createValidationState(
  generation: number,
  status: ValidationStatus,
  trigger: ValidationTrigger | null,
  intent: ValidationIntent | null,
): Validation {
  return status === 'idle'
    ? Object.freeze({ generation, status, trigger: null, intent: null })
    : Object.freeze({
        generation,
        status,
        trigger: trigger as ValidationTrigger,
        intent: intent as ValidationIntent,
      });
}

export function createSubmissionState(
  generation: number,
  status: SubmissionStatus,
  count: number,
  failure: SubmissionFailure | null,
): Submission {
  return status === 'failed'
    ? Object.freeze({ generation, status, count, failure })
    : Object.freeze({ generation, status, count, failure: null });
}

export function normalizeSubmissionFailure(
  input: SubmissionFailure | null,
): Result<SubmissionFailure | null> {
  if (input === null) return ok(null);
  if (
    typeof input !== 'object'
    || typeof input.message !== 'string'
    || input.message.trim().length === 0
  ) {
    return fail(
      'construction',
      'form-submission-failure-invalid',
      'A Form submission failure message must not be empty.',
    );
  }
  return ok(Object.freeze({ message: input.message.trim() }));
}

export function isValidationStatus(value: string): value is ValidationStatus {
  return value === 'idle'
    || value === 'validating'
    || value === 'valid'
    || value === 'invalid';
}

export function isSubmissionStatus(value: string): value is SubmissionStatus {
  return value === 'idle'
    || value === 'submitting'
    || value === 'succeeded'
    || value === 'failed';
}

export function isValidationTrigger(value: string): value is ValidationTrigger {
  return value === 'input' || value === 'blur' || value === 'submit';
}

export function isValidationIntent(value: string): value is ValidationIntent {
  return value === 'interaction' || value === 'submission';
}

export function requireValidationGeneration<ID extends StableID>(
  state: State<ID>,
  generation: number,
): Result<true> {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    return fail(
      'transition-rejection',
      'form-validation-generation-invalid',
      'Validation generation must be a positive safe integer.',
    );
  }
  if (state.validation.status !== 'validating' || generation !== state.validation.generation) {
    return fail(
      'transition-rejection',
      'form-validation-generation-stale',
      'Validation result does not belong to the active generation.',
      { generation, currentGeneration: state.validation.generation },
    );
  }
  return ok(true);
}

export function requireSubmissionGeneration<ID extends StableID>(
  state: State<ID>,
  generation: number,
): Result<true> {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    return fail(
      'transition-rejection',
      'form-submission-generation-invalid',
      'Submission generation must be a positive safe integer.',
    );
  }
  if (generation !== state.submission.generation) {
    return fail(
      'transition-rejection',
      'form-submission-generation-stale',
      'Submission result does not belong to the active generation.',
      { generation, currentGeneration: state.submission.generation },
    );
  }
  return ok(true);
}
