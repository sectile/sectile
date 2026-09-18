import {
  computed,
  defineComponent,
  h,
  mergeProps,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import { getFormIssuesBySource } from '@sectile/form/state';
import type { FormFieldSlotProps, FormSummarySlotProps } from './contracts.js';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import {
  conditionalPresenceProps,
  useConditionalPresence,
} from '../presence/conditional-presence.js';
import {
  useFormContext,
  useFormFieldContext,
  useFormSelectorFromContext,
} from './context.js';

const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export const FormMessage = defineComponent({
  name: 'SectileFormMessage', inheritAttrs: false,
  props: { ...partProps, ...conditionalPresenceProps, as: { ...partProps.as, default: 'p' } },
  slots: Object as SlotsType<{ default: (props: FormFieldSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const field = useFormFieldContext('FormMessage');
    const active = computed(() => !field.slotProps.value.valid);
    const forcePresent = computed(() => props.forcePresent);
    const presence = useConditionalPresence(active, forcePresent);
    return (): VNodeChild => {
      const inactivePresent = !active.value && presence.present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: presence.register,
        id: field.slotProps.value.messageId,
        hidden: presence.hidden.value,
        role: active.value ? 'alert' : undefined,
        'aria-live': active.value ? 'polite' : 'off',
        ...(inactivePresent ? { inert: true, 'aria-hidden': 'true' } : {}),
        'data-scope': 'form',
        'data-part': 'message',
        'data-state': active.value ? 'visible' : 'hidden',
      }), {
        default: () => slots['default']?.(field.slotProps.value)
          ?? field.slotProps.value.issues.map((issue) => issue.message).join(' '),
      });
    };
  },
});

export const FormSummary = defineComponent({
  name: 'SectileFormSummary', inheritAttrs: false,
  props: { ...partProps, ...conditionalPresenceProps },
  slots: Object as SlotsType<{ default: (props: FormSummarySlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const form = useFormContext('FormSummary');
    const valid = useFormSelectorFromContext(form, () => (state) => state.valid);
    const validation = useFormSelectorFromContext(form, () => (state) => state.validation);
    const submission = useFormSelectorFromContext(form, () => (state) => state.submission);
    const issues = useFormSelectorFromContext(form, () => (state) => state.allIssues);
    const serverIssues = useFormSelectorFromContext(
      form,
      () => (state) => getFormIssuesBySource(state, 'server'),
    );
    const firstIssue = useFormSelectorFromContext(
      form,
      () => (state) => state.allIssues[0] ?? null,
    );
    const active = computed(() => issues.value.length > 0 || submission.value.failure !== null);
    const forcePresent = computed(() => props.forcePresent);
    const presence = useConditionalPresence(active, forcePresent);
    const slotProps = computed<FormSummarySlotProps>(() => Object.freeze({
      validation: validation.value,
      submission: submission.value,
      issues: issues.value,
      serverIssues: serverIssues.value,
      firstIssue: firstIssue.value,
      valid: valid.value,
    }));
    return (): VNodeChild => {
      const inactivePresent = !active.value && presence.present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        id: form.summaryId,
        elementRef: (element: unknown) => {
          const resolved = presence.register(element);
          form.summary.value = resolved ?? null;
        },
        role: active.value ? 'alert' : undefined,
        'aria-live': active.value ? 'polite' : 'off',
        tabindex: -1,
        hidden: presence.hidden.value,
        ...(inactivePresent ? { inert: true, 'aria-hidden': 'true' } : {}),
        'data-scope': 'form',
        'data-part': 'summary',
        'data-state': active.value ? 'visible' : 'hidden',
      }), {
        default: () => slots['default']?.(slotProps.value)
          ?? [
            submission.value.failure?.message,
            ...issues.value.map((issue) => issue.message),
          ].filter((message): message is string => message !== undefined).join(' '),
      });
    };
  },
});
