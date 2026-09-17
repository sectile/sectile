import type { FormIssue, FormSubmissionFailure } from '@sectile/form/state';
import type { StableID } from '@sectile/core';
import type { FormSubmissionElement } from './contracts.js';

export function createNativeFormData(
  form: HTMLFormElement,
  submitter: HTMLElement | null,
): FormData {
  return submitter === null ? new FormData(form) : new FormData(form, submitter);
}

export function isNativeSubmitter(element: HTMLElement): boolean {
  if (element.tagName === 'BUTTON') {
    const type = element.getAttribute('type')?.toLowerCase() ?? 'submit';
    return type === 'submit';
  }
  if (element.tagName !== 'INPUT') return false;
  const type = element.getAttribute('type')?.toLowerCase() ?? 'text';
  return type === 'submit' || type === 'image';
}

export function includeNativeValidation(
  form: HTMLFormElement,
  submitter: HTMLElement | null,
): boolean {
  return !form.noValidate && !isFormNoValidateSubmitter(submitter);
}

export function nativeSubmitterForm(submitter: HTMLElement): HTMLFormElement | null {
  return (submitter as FormSubmissionElement).form;
}

export function normalizeSubmissionIssues<ID extends StableID>(
  issues: readonly FormIssue<ID>[],
): readonly FormIssue<ID>[] {
  return Object.freeze(issues.map((issue) => Object.freeze({
    ...issue,
    source: 'server' as const,
  })));
}

export function defaultSubmissionFailure(): FormSubmissionFailure {
  return Object.freeze({ message: 'Form submission failed.' });
}

export function isPromiseLike<T>(value: T | PromiseLike<T> | null): value is PromiseLike<T> {
  return value !== null
    && typeof value === 'object'
    && 'then' in value
    && typeof value.then === 'function';
}

function isFormNoValidateSubmitter(element: HTMLElement | null): boolean {
  if (element === null) return false;
  return (element as HTMLElement & { readonly formNoValidate?: boolean }).formNoValidate === true;
}
