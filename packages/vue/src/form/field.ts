import {
  defineComponent,
  type PropType,
  type SlotsType,
  type VNodeChild,
  computed,
  shallowRef,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
  provide,
  h,
  mergeProps,
} from 'vue';
import type { FormFieldPath } from '@sectile/form/path';
import { partProps } from './part.js';
import type { FormFieldSlotProps, FormFieldMetaInput, FormIssue } from './contracts.js';
import {
  useFormContext,
  useFormFieldSelectorFromContext,
  formFieldContextKey,
  type FormFieldContext,
} from './context.js';
import { useHostId } from '../host-provider.js';
import {
  safeEncodeFormFieldPath,
  resolveElement,
  applyMetadata,
  resolveSubmissionRegistrations,
  nativeSubmissionCapabilities,
  safeEncodeSubmissionName,
  nativeCandidates,
  createNativeFallbackRegistration,
  sameSubmissionElements,
} from './native.js';
import {
  type FormControlRegistration,
  type FormLabelMode,
  type FormMetadataAttribute,
  provideFormControlFieldContext,
} from './control.js';
import type { FormIssueSource } from '@sectile/form/state';
import type { FormParticipant, FormSubmissionElement } from '@sectile/dom/form';
import { useNextTickTask } from '../internal/scheduled-task.js';
import { Primitive } from '../primitive.js';

export const FormField = defineComponent({
  name: 'SectileFormField',
  inheritAttrs: false,
  props: {
    id: { type: String, default: undefined },
    name: { type: [String, Array] as PropType<FormFieldPath>, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
    ...partProps,
  },
  slots: Object as SlotsType<{ default: (props: FormFieldSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const formContext = useFormContext('FormField');
    const generatedId = useHostId();
    const id = computed(() => props.id ?? `form-field-${generatedId}`);
    const nameKey = computed(() => (
      props.name === undefined ? undefined : safeEncodeFormFieldPath(props.name) ?? undefined
    ));
    const root = shallowRef<HTMLElement | null>(null);
    const controls = shallowRef<readonly FormControlRegistration[]>([]);
    const fallback = shallowRef<FormControlRegistration | null>(null);
    const nativeFallbackProblem = shallowRef<string | null>(null);
    const appliedAttributes = new Map<HTMLElement, Map<string, string | null>>();
    let observer: MutationObserver | undefined;
    let unregister: (() => void) | undefined;
    let diagnosticId: string | undefined;
    let observedTargets: readonly HTMLElement[] = [];
    let warnedMultipleControls = false;

    const activeRegistrations = computed(() => controls.value.filter(
      (registration) => resolveElement(registration.element) !== null,
    ));
    const activeControl = computed(() => (
      activeRegistrations.value.length === 1
        ? activeRegistrations.value[0]
        : controls.value.length === 0 ? fallback.value : null
    ));
    const labelMode = computed<FormLabelMode>(() => activeControl.value?.labelMode ?? 'for');
    const semanticControl = (): HTMLElement | null => {
      const registration = activeControl.value;
      if (registration === undefined || registration === null) return null;
      return resolveElement(registration.semanticControl ?? registration.element);
    };
    const effectiveControlId = computed(() => (
      semanticControl()?.getAttribute('id')?.trim() || `${id.value}-control`
    ));
    const fieldState = useFormFieldSelectorFromContext(
      formContext,
      () => id.value,
      () => (field) => field,
    );
    const fieldActions = Object.freeze({
      setMeta: (meta: FormFieldMetaInput): boolean => (
        formContext.connection.value?.setFieldMeta(id.value, meta) ?? false
      ),
      replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]): boolean => (
        formContext.connection.value?.replaceFieldIssues(id.value, source, issues) ?? false
      ),
      upsertIssue: (issue: FormIssue): boolean => (
        formContext.connection.value?.upsertFieldIssue(id.value, issue) ?? false
      ),
      removeIssue: (
        issueId: string | number,
      ): boolean => formContext.connection.value?.removeFieldIssue(id.value, issueId) ?? false,
      clearIssues: (source?: FormIssueSource): boolean => (
        formContext.connection.value?.clearFieldIssues(id.value, source) ?? false
      ),
    });
    const slotProps = computed<FormFieldSlotProps>(() => {
      const current = fieldState.value;
      const descriptionId = `${id.value}-description`;
      const messageId = `${id.value}-message`;
      const relatedIssues = current?.relatedIssues ?? [];
      const describedBy = `${descriptionId} ${messageId}${
        relatedIssues.length === 0 ? '' : ` ${formContext.summaryId}`
      }`;
      const valid = current?.valid ?? true;
      return Object.freeze({
        id: id.value,
        controlId: effectiveControlId.value,
        labelId: `${id.value}-label`,
        descriptionId,
        messageId,
        describedBy,
        valid,
        touched: current?.touched ?? false,
        dirty: current?.dirty ?? false,
        issues: current?.issues ?? [],
        relatedIssues,
        ...fieldActions,
      });
    });

    const attributesFor = (
      registration: FormControlRegistration,
    ): Readonly<Record<string, unknown>> => {
      const explicit = new Set(registration.explicit ?? []);
      const capabilities = registration.capabilities ?? {};
      const attributes: Record<string, unknown> = {};
      const assign = (attribute: FormMetadataAttribute, value: unknown): void => {
        if (!explicit.has(attribute) && value !== undefined) attributes[attribute] = value;
      };
      if (capabilities.id === true) assign('id', slotProps.value.controlId);
      if (capabilities.describedBy === true) {
        assign('aria-describedby', slotProps.value.describedBy);
        assign(
          'aria-errormessage',
          slotProps.value.issues.length > 0
            ? slotProps.value.messageId
            : slotProps.value.relatedIssues.length > 0
              ? formContext.summaryId
              : slotProps.value.messageId,
        );
      }
      if (capabilities.invalid === true && !slotProps.value.valid) assign('aria-invalid', 'true');
      if (capabilities.labelledBy === true && labelMode.value === 'labelledby') {
        assign('aria-labelledby', slotProps.value.labelId);
      }
      if (capabilities.required === true && props.required === true) assign('required', true);
      else if (labelMode.value !== 'for' && props.required === true) assign('aria-required', 'true');
      if (capabilities.disabled === true && props.disabled === true) assign('disabled', true);
      else if (labelMode.value !== 'for' && props.disabled === true) assign('aria-disabled', 'true');
      if (capabilities.readonly === true && props.readonly === true) assign('readonly', true);
      else if (labelMode.value !== 'for' && props.readonly === true) assign('aria-readonly', 'true');
      if (labelMode.value !== 'for') {
        const refreshValue = (): void => {
          queueMicrotask(() => formContext.connection.value?.refreshParticipant(id.value));
        };
        attributes['onClick'] = refreshValue;
        attributes['onKeydown'] = refreshValue;
      }
      return Object.freeze(attributes);
    };

    const restoreControlAttributes = (): void => {
      for (const [element, attributes] of appliedAttributes) {
        for (const [name, previous] of attributes) {
          if (previous === null) element.removeAttribute(name);
          else element.setAttribute(name, previous);
        }
      }
      appliedAttributes.clear();
    };
    const applyControlAttributes = (): void => {
      restoreControlAttributes();
      const registration = activeControl.value;
      if (registration === undefined || registration === null) return;
      const semantic = resolveElement(registration.semanticControl ?? registration.element);
      if (semantic !== null) {
        applyMetadata(semantic, attributesFor(registration), registration.explicit, appliedAttributes);
      }
      for (const submission of resolveSubmissionRegistrations(registration)) {
        const element = resolveElement(submission.element);
        if (element === null) continue;
        const capabilities = submission.capabilities ?? nativeSubmissionCapabilities(element);
        const explicit = submission.explicit ?? registration.explicit;
        const attributes: Record<string, unknown> = {};
        if (capabilities.name === true && nameKey.value !== undefined) {
          const submissionName = safeEncodeSubmissionName(nameKey.value, submission.relativeName);
          if (submissionName !== null) attributes['name'] = submissionName;
        }
        if (capabilities.form === true && props.form !== undefined) attributes['form'] = props.form;
        if (capabilities.required === true && props.required === true) attributes['required'] = true;
        if (capabilities.disabled === true && props.disabled === true) attributes['disabled'] = true;
        if (capabilities.readonly === true && props.readonly === true) attributes['readonly'] = true;
        applyMetadata(element, attributes, explicit, appliedAttributes);
      }
    };

    const discoverNativeFallback = (): void => {
      if (controls.value.length > 0 || root.value === null) {
        fallback.value = null;
        nativeFallbackProblem.value = null;
        return;
      }
      const candidates = nativeCandidates(root.value);
      const discovered = createNativeFallbackRegistration(root.value, candidates);
      nativeFallbackProblem.value = discovered.problem;
      if (discovered.registration === null) {
        fallback.value = null;
        return;
      }
      const next = discovered.registration;
      const current = fallback.value;
      if (
        current !== null
        && resolveElement(current.semanticControl ?? current.element)
          === resolveElement(next.semanticControl ?? next.element)
        && sameSubmissionElements(
          resolveSubmissionRegistrations(current),
          resolveSubmissionRegistrations(next),
        )
      ) return;
      fallback.value = next;
    };

    const syncDiagnostic = (): void => {
      const currentId = id.value;
      if (diagnosticId !== undefined && diagnosticId !== currentId) {
        formContext.setFieldDiagnostic(diagnosticId, null);
      }
      diagnosticId = currentId;
      let message: string | null = null;
      if (props.name !== undefined && nameKey.value === undefined) {
        message = 'FormField received an invalid field path.';
      } else if (activeRegistrations.value.length > 1) {
        message = 'FormField received multiple active controls. Register one composite control with explicit targets.';
      } else if (controls.value.length > 0 && activeRegistrations.value.length === 0) {
        message = 'FormField has no mounted control target.';
      } else if (nativeFallbackProblem.value !== null) {
        message = nativeFallbackProblem.value;
      } else {
        const registration = activeControl.value;
        if (registration !== null && registration !== undefined) {
          const invalidRelativeName = resolveSubmissionRegistrations(registration).some(
            (submission) => submission.relativeName !== undefined
              && nameKey.value !== undefined
              && safeEncodeSubmissionName(nameKey.value, submission.relativeName) === null,
          );
          if (invalidRelativeName) message = 'FormField received an invalid relative submission path.';
        }
      }
      formContext.setFieldDiagnostic(currentId, message === null ? null : Object.freeze({
        id: `${currentId}:composition`,
        fieldId: currentId,
        message,
        source: 'field',
      }));
    };

    const refreshParticipantTargets = (): void => {
      const registration = activeControl.value;
      const next = registration === null || registration === undefined
        ? root.value === null ? [] : [root.value]
        : [
            root.value,
            resolveElement(registration.semanticControl ?? registration.element),
            resolveElement(registration.focusTarget ?? registration.element),
            resolveElement(registration.validationTarget ?? registration.element),
            ...resolveSubmissionRegistrations(registration).map(
              (submission) => resolveElement(submission.element),
            ),
          ].filter((element): element is HTMLElement => element !== null);
      if (
        next.length === observedTargets.length
        && next.every((element, index) => element === observedTargets[index])
      ) return;
      observedTargets = Object.freeze([...next]);
      formContext.connection.value?.refreshParticipant(id.value);
    };

    const registerControl = (registration: FormControlRegistration): (() => void) => {
      controls.value = [...controls.value, registration];
      fallback.value = null;
      void nextTick(() => {
        if (!warnedMultipleControls && activeRegistrations.value.length > 1) {
          warnedMultipleControls = true;
          console.warn(
            '[Sectile] FormField received multiple active control registrations. Register one composite control with explicit semantic, focus, and submission targets.',
          );
        }
        applyControlAttributes();
        syncDiagnostic();
        refreshParticipantTargets();
      });
      return (): void => {
        controls.value = controls.value.filter((candidate) => candidate !== registration);
        discoverNativeFallback();
        void nextTick(() => {
          applyControlAttributes();
          syncDiagnostic();
          refreshParticipantTargets();
        });
      };
    };

    const mount = (): void => {
      unregister?.();
      unregister = undefined;
      if (root.value === null) return;
      discoverNativeFallback();
      observer?.disconnect();
      observer = new MutationObserver(() => {
        discoverNativeFallback();
        applyControlAttributes();
        syncDiagnostic();
        refreshParticipantTargets();
      });
      observer.observe(root.value, { childList: true, subtree: true });
      applyControlAttributes();
      const participant: FormParticipant<string> = {
        id: id.value,
        get element() { return root.value as HTMLElement; },
        get semanticControl() { return semanticControl() ?? root.value as HTMLElement; },
        get focusTarget() {
          const registration = activeControl.value;
          return registration === undefined || registration === null
            ? root.value as HTMLElement
            : resolveElement(registration.focusTarget ?? registration.semanticControl ?? registration.element)
              ?? root.value as HTMLElement;
        },
        get validationTarget() {
          const registration = activeControl.value;
          return registration === undefined || registration === null
            ? root.value as HTMLElement
            : resolveElement(
                registration.validationTarget
                  ?? registration.semanticControl
                  ?? registration.element,
              ) ?? root.value as HTMLElement;
        },
        get submissionElements() {
          const registration = activeControl.value;
          if (registration === undefined || registration === null) return [];
          return resolveSubmissionRegistrations(registration)
            .map((submission) => resolveElement(submission.element))
            .filter((element): element is FormSubmissionElement => element !== null);
        },
        focus: () => {
          const registration = activeControl.value;
          const control = registration === undefined || registration === null
            ? null
            : resolveElement(registration.focusTarget ?? registration.semanticControl ?? registration.element);
          control?.focus();
          return control !== null && document.activeElement === control;
        },
        reset: () => activeControl.value?.reset?.(),
        get getValue() { return activeControl.value?.getValue; },
        get isValueEqual() { return activeControl.value?.isValueEqual; },
        ...(nameKey.value === undefined ? {} : { name: nameKey.value }),
      };
      unregister = formContext.register(participant);
      observedTargets = Object.freeze([
        participant.element,
        participant.semanticControl ?? participant.element,
        participant.focusTarget ?? participant.element,
        participant.validationTarget ?? participant.element,
        ...(participant.submissionElements ?? []),
      ]);
      syncDiagnostic();
    };
    const mountTask = useNextTickTask(mount);

    onMounted(mountTask.schedule);
    onBeforeUnmount(() => {
      mountTask.cancel();
      observer?.disconnect();
      observer = undefined;
      restoreControlAttributes();
      if (diagnosticId !== undefined) formContext.setFieldDiagnostic(diagnosticId, null);
      unregister?.();
      unregister = undefined;
    });
    watch([id, nameKey], mountTask.schedule);
    watch([
      activeControl,
      effectiveControlId,
      labelMode,
      nameKey,
      () => props.form,
      () => props.required,
      () => props.disabled,
      () => props.readonly,
      () => slotProps.value.valid,
    ], () => {
      applyControlAttributes();
      syncDiagnostic();
    }, { flush: 'post' });
    provide<FormFieldContext>(formFieldContextKey, {
      slotProps,
      labelMode,
      registerControl,
      attributesFor,
    });
    provideFormControlFieldContext({ registerControl, attributesFor });

    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      elementRef: (element: unknown) => { root.value = element as HTMLElement | null; },
      'data-scope': 'form',
      'data-part': 'field',
      'data-valid': slotProps.value.valid ? '' : undefined,
      'data-invalid': slotProps.value.valid ? undefined : '',
      'data-touched': slotProps.value.touched ? '' : undefined,
      'data-dirty': slotProps.value.dirty ? '' : undefined,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});
