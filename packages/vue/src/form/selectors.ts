import type {
  FormSelectorFunction,
  FormSubscribeOptions,
  FormFieldSelectorFunction,
  FormFieldController,
  FormFieldMetaInput,
  FormIssue,
  FormSelectorComponent,
  FormFieldSelectorComponent,
} from './contracts.js';
import {
  type ShallowRef,
  defineComponent,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import { useFormContext, useFormSelectorFromContext, useFormFieldSelectorFromContext } from './context.js';
import type { FormIssueSource } from '@sectile/form/state';

export function useFormSelector<Selected>(
  selector: FormSelectorFunction<Selected>,
  options: FormSubscribeOptions<Selected> = {},
): Readonly<ShallowRef<Selected>> {
  const context = useFormContext('useFormSelector');
  return useFormSelectorFromContext(
    context,
    () => selector,
    () => options.equals ?? Object.is,
  );
}

export function useFormFieldSelector<Selected>(
  id: string,
  selector: FormFieldSelectorFunction<Selected>,
  options: FormSubscribeOptions<Selected> = {},
): Readonly<ShallowRef<Selected>> {
  const context = useFormContext('useFormFieldSelector');
  return useFormFieldSelectorFromContext(
    context,
    () => id,
    () => selector,
    () => options.equals ?? Object.is,
  );
}

export function useFormFieldController(id: string): FormFieldController {
  const context = useFormContext('useFormFieldController');
  const state = useFormFieldSelectorFromContext(context, () => id, () => (field) => field);
  return Object.freeze({
    state,
    setMeta: (meta: FormFieldMetaInput): boolean => (
      context.connection.value?.setFieldMeta(id, meta) ?? false
    ),
    replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]): boolean => (
      context.connection.value?.replaceFieldIssues(id, source, issues) ?? false
    ),
    upsertIssue: (issue: FormIssue): boolean => (
      context.connection.value?.upsertFieldIssue(id, issue) ?? false
    ),
    removeIssue: (issueId: string | number): boolean => (
      context.connection.value?.removeFieldIssue(id, issueId) ?? false
    ),
    clearIssues: (source?: FormIssueSource): boolean => (
      context.connection.value?.clearFieldIssues(id, source) ?? false
    ),
  });
}

const FormSelectorRuntime = defineComponent({
  name: 'SectileFormSelector',
  props: {
    select: { type: Function as PropType<FormSelectorFunction<unknown>>, required: true },
    equals: { type: Function as PropType<(previous: unknown, next: unknown) => boolean>, default: Object.is },
  },
  slots: Object as SlotsType<{ default: (props: { readonly selected: unknown }) => VNodeChild }>,
  setup(props, { slots }) {
    const context = useFormContext('FormSelector');
    const selected = useFormSelectorFromContext(context, () => props.select, () => props.equals);
    return (): VNodeChild => slots['default']?.({ selected: selected.value }) ?? [];
  },
});

export const FormSelector = FormSelectorRuntime as unknown as FormSelectorComponent;

const FormFieldSelectorRuntime = defineComponent({
  name: 'SectileFormFieldSelector',
  props: {
    id: { type: String, required: true },
    select: { type: Function as PropType<FormFieldSelectorFunction<unknown>>, required: true },
    equals: { type: Function as PropType<(previous: unknown, next: unknown) => boolean>, default: Object.is },
  },
  slots: Object as SlotsType<{ default: (props: { readonly selected: unknown }) => VNodeChild }>,
  setup(props, { slots }) {
    const context = useFormContext('FormFieldSelector');
    const selected = useFormFieldSelectorFromContext(
      context,
      () => props.id,
      () => props.select,
      () => props.equals,
    );
    return (): VNodeChild => slots['default']?.({ selected: selected.value }) ?? [];
  },
});

export const FormFieldSelector = FormFieldSelectorRuntime as unknown as FormFieldSelectorComponent;
