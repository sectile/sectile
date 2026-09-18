import {
  inject,
  onScopeDispose,
  shallowRef,
  watch,
  type ComputedRef,
  type ShallowRef,
} from 'vue';
import type { FormConnection, FormParticipant } from '@sectile/dom/form';
import type {
  FormFieldSelectorFunction,
  FormFieldSlotProps,
  FormIssue,
  FormSelectorFunction,
  FormState,
  FormSubscribeOptions,
} from './contracts.js';
import type {
  FormControlRegistration,
  FormLabelMode,
} from './control.js';

export interface FormContext {
  readonly summary: ShallowRef<HTMLElement | null>;
  readonly summaryId: string;
  readonly register: (participant: FormParticipant<string>) => () => void;
  readonly setFieldDiagnostic: (id: string, issue: FormIssue | null) => void;
  readonly connection: ShallowRef<FormConnection<string> | null>;
}

export interface FormFieldContext {
  readonly slotProps: ComputedRef<FormFieldSlotProps>;
  readonly labelMode: ComputedRef<FormLabelMode>;
  readonly registerControl: (registration: FormControlRegistration) => () => void;
  readonly attributesFor: (
    registration: FormControlRegistration,
  ) => Readonly<Record<string, unknown>>;
}

export const formContextKey = Symbol('SectileForm');
export const formFieldContextKey = Symbol('SectileFormField');

const emptyState: FormState = Object.freeze({
  validation: Object.freeze({ generation: 0, status: 'idle', trigger: null, intent: null }),
  submission: Object.freeze({ generation: 0, status: 'idle', count: 0, failure: null }),
  touched: false,
  dirty: false,
  valid: true,
  fields: Object.freeze([]),
  issues: Object.freeze([]),
  allIssues: Object.freeze([]),
});

export function useFormContext(part: string): FormContext {
  const context = inject<FormContext | null>(formContextKey, null);
  if (context === null) throw new TypeError(`${part} must be rendered inside FormRoot.`);
  return context;
}

export function useFormFieldContext(part: string): FormFieldContext {
  const context = inject<FormFieldContext | null>(formFieldContextKey, null);
  if (context === null) throw new TypeError(`${part} must be rendered inside FormField.`);
  return context;
}

export function useFormSelectorFromContext<Selected>(
  context: FormContext,
  selectorSource: () => FormSelectorFunction<Selected>,
  equalsSource: () => NonNullable<FormSubscribeOptions<Selected>['equals']> = () => Object.is,
): Readonly<ShallowRef<Selected>> {
  const initialSelector = selectorSource();
  const selected = shallowRef(
    initialSelector(context.connection.value?.state ?? emptyState),
  ) as ShallowRef<Selected>;
  let unsubscribe: (() => void) | undefined;
  const stop = watch(
    [context.connection, selectorSource, equalsSource],
    ([target, selector, equals]) => {
      unsubscribe?.();
      unsubscribe = undefined;
      const next = selector(target?.state ?? emptyState);
      if (!equals(selected.value, next)) selected.value = next;
      if (target !== null) {
        unsubscribe = target.subscribeForm(selector, (value) => {
          selected.value = value;
        }, { equals });
      }
    },
    { immediate: true, flush: 'sync' },
  );
  onScopeDispose(() => {
    unsubscribe?.();
    stop();
  });
  return selected;
}

export function useFormFieldSelectorFromContext<Selected>(
  context: FormContext,
  idSource: () => string,
  selectorSource: () => FormFieldSelectorFunction<Selected>,
  equalsSource: () => NonNullable<FormSubscribeOptions<Selected>['equals']> = () => Object.is,
): Readonly<ShallowRef<Selected>> {
  const initialSelector = selectorSource();
  const selected = shallowRef(initialSelector(
    context.connection.value?.getField(idSource()) ?? null,
  )) as ShallowRef<Selected>;
  let unsubscribe: (() => void) | undefined;
  const stop = watch(
    [context.connection, idSource, selectorSource, equalsSource],
    ([target, id, selector, equals]) => {
      unsubscribe?.();
      unsubscribe = undefined;
      const next = selector(target?.getField(id) ?? null);
      if (!equals(selected.value, next)) selected.value = next;
      if (target !== null) {
        unsubscribe = target.subscribeField(id, selector, (value) => {
          selected.value = value;
        }, { equals });
      }
    },
    { immediate: true, flush: 'sync' },
  );
  onScopeDispose(() => {
    unsubscribe?.();
    stop();
  });
  return selected;
}
