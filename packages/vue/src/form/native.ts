import {
  type FormFieldPath,
  tryCreateFormFieldPath,
  encodeFormFieldPath,
  type FormRelativePath,
  appendFormFieldPath,
} from '@sectile/form/path';
import {
  type FormElementSource,
  type FormControlRegistration,
  type FormSubmissionRegistration,
  compositeControlCapabilities,
  type FormLabelMode,
  type FormControlCapabilities,
  type FormSubmissionCapabilities,
  type FormMetadataAttribute,
} from './control.js';
import type { FormSubmissionElement } from '@sectile/dom/form';

export function safeEncodeFormFieldPath(path: FormFieldPath): string | null {
  const result = tryCreateFormFieldPath(path);
  return result.ok ? encodeFormFieldPath(result.value) : null;
}

export function resolveElement<ElementType extends HTMLElement>(
  source: FormElementSource<ElementType>,
): ElementType | null {
  return typeof source === 'function' ? source() : source.value ?? null;
}

export function resolveSubmissionRegistrations(
  registration: FormControlRegistration,
): readonly FormSubmissionRegistration[] {
  if (registration.submissions !== undefined) {
    return typeof registration.submissions === 'function'
      ? registration.submissions()
      : registration.submissions;
  }
  const element = resolveElement(registration.element);
  if (element === null || !isFormSubmissionElement(element)) return [];
  return [{
    element: () => element,
    capabilities: nativeSubmissionCapabilities(element),
    ...(registration.explicit === undefined ? {} : { explicit: registration.explicit }),
  }];
}

export function sameSubmissionElements(
  left: readonly FormSubmissionRegistration[],
  right: readonly FormSubmissionRegistration[],
): boolean {
  return left.length === right.length && left.every((submission, index) => (
    resolveElement(submission.element) === resolveElement(right[index]!.element)
  ));
}

export function nativeCandidates(root: HTMLElement): readonly HTMLElement[] {
  const selector = 'fieldset, input, select, textarea';
  const candidates = [
    ...(root.matches(selector) ? [root] : []),
    ...root.querySelectorAll<HTMLElement>(selector),
  ];
  return candidates.filter((candidate) => (
    candidate.closest<HTMLElement>('[data-scope="form"][data-part="field"]') === root
  ));
}

export function createNativeFallbackRegistration(
  root: HTMLElement,
  candidates: readonly HTMLElement[],
): { readonly registration: FormControlRegistration | null; readonly problem: string | null } {
  const semantic = nativeSemanticControl(candidates);
  if (semantic === undefined || isHiddenInput(semantic)) {
    return {
      registration: null,
      problem: 'FormField has no visible native semantic or focus target.',
    };
  }
  const submissions = candidates.filter(isFormSubmissionElement);
  const visible = candidates.filter((candidate) => !isHiddenInput(candidate));
  const fieldset = visible.find((candidate) => candidate.tagName === 'FIELDSET');
  if (fieldset !== undefined) {
    return {
      registration: nativeFallbackForFieldset(fieldset, submissions),
      problem: null,
    };
  }
  if (visible.length === 1) {
    return {
      registration: nativeFallbackForElement(semantic, submissions),
      problem: null,
    };
  }
  if (isNativeCheckedGroup(visible)) {
    const focusTarget = visible.find((candidate) => !(
      candidate as HTMLInputElement
    ).disabled) ?? visible[0]!;
    return {
      registration: {
        element: () => root,
        semanticControl: () => root,
        focusTarget: () => focusTarget,
        validationTarget: () => root,
        submissions: submissions.map((element) => ({
          element: () => element,
          capabilities: Object.freeze({
            ...nativeSubmissionCapabilities(element),
            required: false,
          }),
        })),
        labelMode: 'labelledby',
        capabilities: compositeControlCapabilities,
      },
      problem: null,
    };
  }
  return {
    registration: null,
    problem: 'FormField contains multiple unrelated native controls. Use a fieldset or one composite registration.',
  };
}

function nativeFallbackForFieldset(
  fieldset: HTMLElement,
  submissions: readonly FormSubmissionElement[],
): FormControlRegistration {
  const visibleSubmissions = submissions.filter((element) => !isHiddenInput(element));
  const checkboxGroup = isNativeCheckedGroup(visibleSubmissions)
    && visibleSubmissions[0]?.tagName === 'INPUT'
    && (visibleSubmissions[0] as HTMLInputElement).type.toLowerCase() === 'checkbox';
  return {
    element: () => fieldset,
    semanticControl: () => fieldset,
    focusTarget: () => fieldsetFocusTarget(submissions) ?? fieldset,
    validationTarget: () => fieldset,
    submissions: submissions.map((element) => ({
      element: () => element,
      capabilities: Object.freeze({
        ...nativeSubmissionCapabilities(element),
        ...(checkboxGroup ? { required: false } : {}),
      }),
    })),
    labelMode: 'legend',
    capabilities: nativeControlCapabilities(fieldset),
  };
}

function fieldsetFocusTarget(
  submissions: readonly FormSubmissionElement[],
): FormSubmissionElement | undefined {
  const enabled = submissions.filter((element) => (
    !isHiddenInput(element)
    && !element.disabled
    && !element.matches(':disabled')
  ));
  const invalid = enabled.find((element) => element.willValidate && !element.validity.valid);
  if (invalid !== undefined) return invalid;
  return enabled.find((element) => (
    element.tagName === 'INPUT'
    && (element as HTMLInputElement).type.toLowerCase() === 'radio'
    && (element as HTMLInputElement).checked
  )) ?? enabled[0];
}

function nativeFallbackForElement(
  semantic: HTMLElement,
  submissions: readonly FormSubmissionElement[],
): FormControlRegistration {
  return {
    element: () => semantic,
    semanticControl: () => semantic,
    focusTarget: () => semantic,
    validationTarget: () => semantic,
    submissions: submissions.map((element) => ({
      element: () => element,
      capabilities: nativeSubmissionCapabilities(element),
    })),
    labelMode: nativeLabelMode(semantic),
    capabilities: nativeControlCapabilities(semantic),
  };
}

function isHiddenInput(element: HTMLElement): boolean {
  return element.tagName === 'INPUT'
    && element.getAttribute('type')?.toLowerCase() === 'hidden';
}

function isNativeCheckedGroup(candidates: readonly HTMLElement[]): boolean {
  if (candidates.length < 2) return false;
  const types = candidates.map((candidate) => (
    candidate.tagName === 'INPUT'
      ? (candidate as HTMLInputElement).type.toLowerCase()
      : null
  ));
  return types.every((type) => type === types[0])
    && (types[0] === 'checkbox' || types[0] === 'radio');
}

function nativeSemanticControl(candidates: readonly HTMLElement[]): HTMLElement | undefined {
  return candidates.find((candidate) => !isHiddenInput(candidate)) ?? candidates[0];
}

function isFormSubmissionElement(element: HTMLElement): element is FormSubmissionElement {
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
}

function nativeLabelMode(element: HTMLElement): FormLabelMode {
  if (element.tagName === 'FIELDSET') return 'legend';
  if (element.tagName === 'INPUT' && element.getAttribute('type')?.toLowerCase() === 'hidden') {
    return 'labelledby';
  }
  return ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
    ? 'for'
    : 'labelledby';
}

function nativeControlCapabilities(element: HTMLElement): FormControlCapabilities {
  const tag = element.tagName;
  const labelable = nativeLabelMode(element) === 'for';
  return Object.freeze({
    id: true,
    describedBy: true,
    invalid: true,
    labelledBy: !labelable,
    required: ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag),
    disabled: ['BUTTON', 'FIELDSET', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tag),
    readonly: tag === 'TEXTAREA' || (tag === 'INPUT' && supportsReadonly(element as HTMLInputElement)),
  });
}

export function nativeSubmissionCapabilities(
  element: FormSubmissionElement,
): FormSubmissionCapabilities {
  const tag = element.tagName;
  return Object.freeze({
    name: true,
    form: true,
    required: ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag),
    disabled: true,
    readonly: tag === 'TEXTAREA' || (tag === 'INPUT' && supportsReadonly(element as HTMLInputElement)),
  });
}

export function safeEncodeSubmissionName(
  base: FormFieldPath,
  relative?: FormRelativePath,
): string | null {
  try {
    if (relative === undefined) return safeEncodeFormFieldPath(base);
    return safeEncodeFormFieldPath(appendFormFieldPath(base, relative));
  } catch {
    return null;
  }
}

export function applyMetadata(
  element: HTMLElement,
  attributes: Readonly<Record<string, unknown>>,
  explicitAttributes: readonly FormMetadataAttribute[] | undefined,
  applied: Map<HTMLElement, Map<string, string | null>>,
): void {
  const explicit = new Set(explicitAttributes ?? []);
  for (const [name, value] of Object.entries(attributes)) {
    if (name.startsWith('on') && typeof value === 'function') continue;
    if (value === undefined || value === false || explicit.has(name as FormMetadataAttribute)) continue;
    const previous = element.getAttribute(name);
    const mergeTokens = name === 'aria-describedby' || name === 'aria-labelledby';
    if (previous !== null && !mergeTokens) continue;
    let changes = applied.get(element);
    if (changes === undefined) {
      changes = new Map();
      applied.set(element, changes);
    }
    if (!changes.has(name)) changes.set(name, previous);
    const next = mergeTokens && previous !== null
      ? [...new Set([...previous.split(/\s+/u), ...String(value).split(/\s+/u)])].join(' ')
      : value === true ? '' : String(value);
    element.setAttribute(name, next);
  }
}

function supportsReadonly(element: HTMLInputElement): boolean {
  return !new Set([
    'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range',
    'reset', 'submit',
  ]).has(element.type.toLowerCase());
}
