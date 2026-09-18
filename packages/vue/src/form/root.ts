import {
  type FormParticipant,
  type FormConnection,
  type FormSubmitResult as DOMFormSubmitResult,
  type FormSubmitPayload as DOMFormSubmitPayload,
  createForm,
} from '@sectile/dom/form';
import {
  defineComponent,
  type PropType,
  type SlotsType,
  type VNodeChild,
  shallowRef,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
  provide,
  h,
  mergeProps,
} from 'vue';
import type {
  FormIssueInput,
  FormSchema,
  FormValidateHandler,
  FormInteractionValidationTrigger,
  FormSubmitHandler,
  FormSubmitErrorMapper,
  FormState,
  FormRootSlotProps,
  FormIssue,
  FormSubmitResult,
  FormRootComponent,
  FormSubmitEvent,
} from './contracts.js';
import { useHostId } from '../host-provider.js';
import { useNextTickTask } from '../internal/scheduled-task.js';
import {
  type FormSubmissionFailure,
  type FormIssueSource,
  type FormReinitializeOptions,
  getFormFieldIDByPath,
} from '@sectile/form/state';
import { type FormContext, formContextKey, useFormSelectorFromContext } from './context.js';

interface RegisteredParticipant {
  readonly participant: FormParticipant<string>;
  unregister?: () => void;
}

const FormRootImpl = defineComponent({
  name: 'SectileFormRoot',
  inheritAttrs: false,
  props: {
    issues: { type: Array as PropType<readonly FormIssueInput[]>, default: () => [] },
    schema: { type: Object as PropType<FormSchema>, default: undefined },
    validate: { type: Function as PropType<FormValidateHandler>, default: undefined },
    validateOn: {
      type: Array as PropType<readonly FormInteractionValidationTrigger[]>,
      default: () => [],
    },
    revalidateOn: {
      type: Array as PropType<readonly FormInteractionValidationTrigger[]>,
      default: () => ['input'],
    },
    onSubmit: { type: Function as PropType<FormSubmitHandler>, default: undefined },
    mapSubmitError: { type: Function as PropType<FormSubmitErrorMapper>, default: undefined },
  },
  emits: {
    reset: (): boolean => true,
    stateChange: (_state: FormState): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: FormRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, expose, slots }) {
    const root = shallowRef<HTMLFormElement | null>(null);
    const summary = shallowRef<HTMLElement | null>(null);
    const summaryId = `${useHostId()}-summary`;
    const connection = shallowRef<FormConnection<string> | null>(null);
    const participants = new Map<string, RegisteredParticipant>();
    const fieldDiagnostics = new Map<string, FormIssue>();
    let syncConfiguredIssues = (): void => {};
    let syncFieldDiagnostics = (): void => {};

    const register = (participant: FormParticipant<string>): (() => void) => {
      const existing = participants.get(participant.id);
      existing?.unregister?.();
      const registered: RegisteredParticipant = { participant };
      participants.set(participant.id, registered);
      if (connection.value !== null) registered.unregister = connection.value.registerParticipant(participant);
      void nextTick(() => {
        syncConfiguredIssues();
        syncFieldDiagnostics();
      });
      return (): void => {
        if (participants.get(participant.id) !== registered) return;
        registered.unregister?.();
        participants.delete(participant.id);
        void nextTick(() => {
          syncConfiguredIssues();
          syncFieldDiagnostics();
        });
      };
    };
    const setFieldDiagnostic = (id: string, issue: FormIssue | null): void => {
      if (issue === null) fieldDiagnostics.delete(id);
      else fieldDiagnostics.set(id, issue);
      void nextTick(syncFieldDiagnostics);
    };
    const submit = (
      payload: DOMFormSubmitPayload<string>,
    ): DOMFormSubmitResult<string> | PromiseLike<DOMFormSubmitResult<string>> => {
      const handler = props.onSubmit;
      if (handler === undefined) return;
      const target = connection.value;
      if (target === null) return;
      const settle = (resolved: FormSubmitResult): DOMFormSubmitResult<string> => {
        if (typeof resolved !== 'object' || resolved === null || resolved.ok !== false) {
          return { ok: true };
        }
        const issues = resolveIssueInputs(target, 'server', resolved.issues ?? []);
        const failure = resolved.failure
          ?? (issues.length === 0 ? submissionErrorFailure() : undefined);
        return {
          ok: false,
          ...(failure === undefined ? {} : { failure }),
          ...(issues.length === 0 ? {} : { issues }),
        };
      };
      let result: FormSubmitResult;
      try {
        const candidate = handler(toFormSubmitEvent(payload));
        if (isPromiseLike(candidate)) {
          return Promise.resolve(candidate).then(
            settle,
            (error: unknown) => ({
              ok: false as const,
              failure: mapSubmissionError(props.mapSubmitError, error),
            }),
          );
        }
        result = candidate;
      } catch (error) {
        return {
          ok: false,
          failure: mapSubmissionError(props.mapSubmitError, error),
        };
      }
      return settle(result);
    };
    const configuration = () => ({
      ...(summary.value === null ? {} : { summary: summary.value }),
      renderSummaryContent: false,
      manageSummaryVisibility: false,
      ...(props.schema === undefined ? {} : { schema: props.schema }),
      ...(props.validate === undefined ? {} : { validate: props.validate }),
      validateOn: props.validateOn,
      revalidateOn: props.revalidateOn,
      ...(props.onSubmit === undefined ? {} : { onSubmit: submit }),
      onReset: () => {
        emit('reset');
        void nextTick(syncFieldDiagnostics);
      },
      onStateChange: (next: FormState) => {
        emit('stateChange', next);
      },
    });
    syncConfiguredIssues = (): void => {
      const target = connection.value;
      if (target === null) return;
      target.replaceIssues('form', resolveIssueInputs(target, 'form', props.issues));
    };
    syncFieldDiagnostics = (): void => {
      connection.value?.replaceIssues('field', [...fieldDiagnostics.values()]);
    };
    const mount = (): void => {
      if (root.value === null) return;
      connection.value?.destroy();
      connection.value = createForm({
        form: root.value,
        ...configuration(),
      });
      for (const registered of participants.values()) {
        registered.unregister = connection.value.registerParticipant(registered.participant);
      }
      syncConfiguredIssues();
      syncFieldDiagnostics();
      emit('stateChange', connection.value.state);
    };
    const mountTask = useNextTickTask(mount);

    onMounted(mountTask.schedule);
    onBeforeUnmount(() => {
      mountTask.cancel();
      connection.value?.destroy();
      connection.value = null;
    });
    watch([
      summary,
      () => props.schema,
      () => props.validate,
      () => [...props.validateOn],
      () => [...props.revalidateOn],
      () => props.onSubmit,
      () => props.mapSubmitError,
    ], () => {
      void nextTick(() => connection.value?.reconfigure(configuration()));
    });
    watch(() => props.issues, () => { void nextTick(syncConfiguredIssues); }, { deep: true });

    const actions = {
      submitStarted: (): number | null => connection.value?.submitStarted() ?? null,
      submitSucceeded: (generation: number): boolean => connection.value?.submitSucceeded(generation) ?? false,
      submitFailed: (
        generation: number,
        result: { readonly failure?: FormSubmissionFailure; readonly issues?: readonly FormIssue[] },
      ): boolean => connection.value?.submitFailed(generation, result) ?? false,
      replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]): boolean => connection.value?.replaceIssues(source, issues) ?? false,
      reinitialize: (options?: FormReinitializeOptions): void => connection.value?.reinitialize(options),
      reset: (): void => connection.value?.reset(),
    };
    const formContext: FormContext = {
      summary,
      summaryId,
      register,
      setFieldDiagnostic,
      connection,
    };
    provide<FormContext>(formContextKey, formContext);
    const validation = useFormSelectorFromContext(
      formContext,
      () => (current) => current.validation,
    );
    const submission = useFormSelectorFromContext(
      formContext,
      () => (current) => current.submission,
    );
    const selectedState = useFormSelectorFromContext(formContext, () => (current) => current);
    const valid = useFormSelectorFromContext(formContext, () => (current) => current.valid);
    const touched = useFormSelectorFromContext(formContext, () => (current) => current.touched);
    const dirty = useFormSelectorFromContext(formContext, () => (current) => current.dirty);
    const slotProps: FormRootSlotProps = Object.freeze({
      get state() { return selectedState.value; },
      get validation() { return validation.value; },
      get submission() { return submission.value; },
      get valid() { return valid.value; },
      get touched() { return touched.value; },
      get dirty() { return dirty.value; },
      get submitted() { return submission.value.count > 0; },
      get submitCount() { return submission.value.count; },
      ...actions,
    });
    expose(actions);

    return (): VNodeChild => h('form', mergeProps(attrs, {
      ref: (element: unknown) => { root.value = element as HTMLFormElement | null; },
      'data-scope': 'form',
      'data-part': 'root',
      'data-validation-status': validation.value.status,
      'data-submission-status': submission.value.status,
    }), slots['default']?.(slotProps) ?? []);
  },
});

export const FormRoot = FormRootImpl as unknown as FormRootComponent;

function toFormSubmitEvent(
  payload: DOMFormSubmitPayload<string>,
): FormSubmitEvent {
  return Object.freeze({
    formData: payload.formData,
    values: payload.values,
    submitter: payload.submitter,
    state: payload.state,
    reinitialize: payload.reinitialize,
    nativeEvent: payload.event,
    get defaultPrevented() { return payload.event.defaultPrevented; },
    preventDefault: () => payload.event.preventDefault(),
    stopPropagation: () => payload.event.stopPropagation(),
    stopImmediatePropagation: () => payload.event.stopImmediatePropagation(),
  });
}

function isPromiseLike(value: unknown): value is PromiseLike<FormSubmitResult> {
  return typeof value === 'object'
    && value !== null
    && 'then' in value
    && typeof value.then === 'function';
}

function resolveIssueInputs(
  target: FormConnection<string>,
  source: 'form' | 'server',
  input: readonly FormIssueInput[],
): readonly FormIssue[] {
  const state = target.getSnapshot().state;
  return Object.freeze(input.map((issue, index) => {
    const owner = issue.path === undefined ? null : getFormFieldIDByPath(state, issue.path);
    const relatedFieldIds = new Set<string>();
    for (const path of issue.relatedPaths ?? []) {
      const related = getFormFieldIDByPath(state, path);
      if (related !== null && related !== owner) relatedFieldIds.add(related);
    }
    const related = Object.freeze([...relatedFieldIds]);
    return Object.freeze({
      id: issue.id ?? `form-${source}-issue-${index + 1}`,
      message: issue.message,
      source,
      ...(owner === null ? {} : { fieldId: owner }),
      ...(related.length === 0 ? {} : { relatedFieldIds: related }),
    });
  }));
}

function mapSubmissionError(
  mapper: FormSubmitErrorMapper | undefined,
  reason: unknown,
): FormSubmissionFailure {
  if (mapper !== undefined) {
    try {
      const mapped = mapper(reason);
      if (mapped !== undefined) return Object.freeze({ message: mapped.message });
    } catch {
      // Mapping failures are intentionally replaced by the safe fallback below.
    }
  }
  return submissionErrorFailure();
}

function submissionErrorFailure(): FormSubmissionFailure {
  return Object.freeze({
    message: 'Form submission failed.',
  });
}
