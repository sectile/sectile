import {
  defineComponent,
  type PropType,
  type VNodeChild,
  h,
  mergeProps,
  type SlotsType,
  computed,
} from 'vue';
import { type PrimitiveAs, Primitive } from '../primitive.js';
import { useFormFieldContext, useFormContext, useFormSelectorFromContext } from './context.js';
import { renderFieldPart, partProps } from './part.js';
import type { FormSubmitSlotProps } from './contracts.js';

export const FormLabel = defineComponent({
  name: 'SectileFormLabel', inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: undefined },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const field = useFormFieldContext('FormLabel');
    return (): VNodeChild => {
      const mode = field.labelMode.value;
      return renderFieldPart({
        as: props.as ?? (mode === 'legend' ? 'legend' : mode === 'for' ? 'label' : 'span'),
        asChild: props.asChild,
      }, attrs, slots, 'label', {
        id: field.slotProps.value.labelId,
        ...(mode === 'for' ? { for: field.slotProps.value.controlId } : {}),
      });
    };
  },
});

export const FormDescription = defineComponent({
  name: 'SectileFormDescription', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'p' } },
  setup(props, { attrs, slots }) {
    const field = useFormFieldContext('FormDescription');
    return (): VNodeChild => renderFieldPart(props, attrs, slots, 'description', {
      id: field.slotProps.value.descriptionId,
    });
  },
});

export const FormReset = defineComponent({
  name: 'SectileFormReset', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'button' } },
  setup(props, { attrs, slots }) {
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      ...(props.as === 'button' && !props.asChild ? { type: 'reset' } : {}),
      'data-scope': 'form',
      'data-part': 'reset',
    }), { default: () => slots['default']?.() });
  },
});

export const FormSubmit = defineComponent({
  name: 'SectileFormSubmit', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'button' } },
  slots: Object as SlotsType<{ default: (props: FormSubmitSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const form = useFormContext('FormSubmit');
    const valid = useFormSelectorFromContext(form, () => (state) => state.valid);
    const submission = useFormSelectorFromContext(
      form,
      () => (state) => state.submission,
    );
    const slotProps = computed<FormSubmitSlotProps>(() => {
      const submitting = submission.value.status === 'submitting';
      return Object.freeze({
        valid: valid.value,
        submitting,
        canSubmit: valid.value && !submitting,
        submission: submission.value,
      });
    });
    const blockPendingSubmit = (event: MouseEvent): void => {
      if (!slotProps.value.submitting) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    return (): VNodeChild => h(Primitive, mergeProps({
      onClickCapture: blockPendingSubmit,
    }, attrs, {
      as: props.as,
      asChild: props.asChild,
      ...(props.as === 'button' && !props.asChild ? { type: 'submit' } : {}),
      ...(props.as === 'button' && !props.asChild && slotProps.value.submitting
        ? { disabled: true }
        : {}),
      ...(props.asChild && slotProps.value.submitting ? { 'aria-disabled': 'true' } : {}),
      'data-scope': 'form',
      'data-part': 'submit',
      'data-submission-status': slotProps.value.submission.status,
    }), { default: () => slots['default']?.(slotProps.value) });
  },
});
