<script setup lang="ts">
import { useSlots } from 'vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from '@sectile/vue/form';
import DemoTooltip from './DemoTooltip.vue';

const props = withDefaults(defineProps<{
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly helpLabel?: string;
  readonly minimum?: string;
  readonly maximum?: string;
  readonly minimumLabel?: string;
  readonly maximumLabel?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
}>(), { required: false, disabled: false, readonly: false });

const slots = useSlots();
</script>

<template>
  <FormField
    :name="props.name"
    :required="props.required"
    :disabled="props.disabled"
    :readonly="props.readonly"
    class="demo-form-field"
  >
    <div class="demo-form-field__heading">
      <FormLabel class="demo-form-field__label">
        <slot name="label">{{ props.label }}</slot>
      </FormLabel>
      <DemoTooltip
        v-if="props.hint !== undefined || slots['hint']"
        :label="props.helpLabel ?? props.label"
      >
        <p class="demo-form-field__tooltip-copy"><slot name="hint">{{ props.hint }}</slot></p>
        <dl v-if="props.minimum !== undefined && props.maximum !== undefined" class="demo-form-field__bounds">
          <div><dt>{{ props.minimumLabel }}</dt><dd>{{ props.minimum }}</dd></div>
          <div><dt>{{ props.maximumLabel }}</dt><dd>{{ props.maximum }}</dd></div>
        </dl>
      </DemoTooltip>
    </div>
    <FormDescription v-if="props.hint !== undefined || slots['hint']" as="span" class="demo-form-field__description">
      <slot name="hint">{{ props.hint }}</slot>
      <template v-if="props.minimum !== undefined && props.maximum !== undefined">
        {{ props.minimumLabel }} {{ props.minimum }}. {{ props.maximumLabel }} {{ props.maximum }}.
      </template>
    </FormDescription>
    <slot />
    <FormMessage class="demo-form-field__message" />
  </FormField>
</template>

<style scoped>
.demo-form-field {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: .5rem;
}

.demo-form-field__heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
}

.demo-form-field__label {
  min-width: 0;
  color: var(--sectile-content-secondary);
  font-size: .78rem;
  font-weight: 700;
  line-height: 1.35;
}

.demo-form-field__description {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.demo-form-field__tooltip-copy {
  margin: 0;
}

.demo-form-field__bounds {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .4rem;
  margin: .6rem 0 0;
  font-variant-numeric: tabular-nums;
}

.demo-form-field__bounds div {
  display: grid;
  gap: .05rem;
  border-top: 1px solid var(--sectile-border-subtle);
  padding-top: .4rem;
}

.demo-form-field__bounds dt {
  color: var(--sectile-content-tertiary);
  font-size: .66rem;
  font-weight: 650;
}

.demo-form-field__bounds dd {
  margin: 0;
  color: var(--sectile-content-primary);
  font-weight: 720;
}

.demo-form-field__message {
  color: var(--sectile-feedback-critical);
  font-size: .7rem;
  font-weight: 650;
  line-height: 1.4;
}

.demo-form-field__message[hidden] { display: none; }
</style>
