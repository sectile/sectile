import type { Ref } from 'vue';
import {
  useFormControl,
  type FormControlParticipation,
  type FormElementSource,
  type FormLabelMode,
  type FormSubmissionSource,
} from '../form.js';

export const nativeInputControlCapabilities = Object.freeze({
  id: true,
  describedBy: true,
  invalid: true,
  required: true,
  disabled: true,
  readonly: true,
});

export const compositeControlCapabilities = Object.freeze({
  id: true,
  describedBy: true,
  invalid: true,
  labelledBy: true,
});

export const hiddenInputSubmissionCapabilities = Object.freeze({
  name: true,
  form: true,
  required: true,
  disabled: true,
});

export const hiddenSelectSubmissionCapabilities = Object.freeze({
  name: true,
  form: true,
  required: true,
  disabled: true,
});

export const hiddenValueSubmissionCapabilities = Object.freeze({
  name: true,
  form: true,
  disabled: true,
});

export function useNativeInputFormControl(
  element: Ref<HTMLInputElement | HTMLTextAreaElement | null | undefined>,
): FormControlParticipation {
  return useFormControl({
    element: element as FormElementSource<HTMLInputElement>,
    semanticControl: element as FormElementSource<HTMLInputElement>,
    focusTarget: element as FormElementSource<HTMLInputElement>,
    labelMode: 'for',
    capabilities: nativeInputControlCapabilities,
  });
}

export function useCompositeFormControl(options: {
  readonly root: FormElementSource;
  readonly focusTarget?: FormElementSource;
  readonly submissions?: FormSubmissionSource;
  readonly labelMode?: FormLabelMode;
}): FormControlParticipation {
  return useFormControl({
    element: options.root,
    semanticControl: options.root,
    focusTarget: options.focusTarget ?? options.root,
    labelMode: options.labelMode ?? 'labelledby',
    capabilities: compositeControlCapabilities,
    ...(options.submissions === undefined ? {} : { submissions: options.submissions }),
  });
}
