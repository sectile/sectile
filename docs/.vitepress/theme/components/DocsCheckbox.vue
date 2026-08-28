<script setup lang="ts">
import { Check, Minus } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';

defineOptions({ inheritAttrs: false });

defineProps<{
  readonly modelValue: CheckboxValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CheckboxValue];
}>();
</script>

<template>
  <CheckboxRoot
    v-slot="{ isIndeterminate }"
    v-bind="$attrs"
    :model-value="modelValue"
    class="docs-checkbox"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <CheckboxIndicator>
      <Minus v-if="isIndeterminate" :size="13" :stroke-width="3" aria-hidden="true" />
      <Check v-else :size="13" :stroke-width="3" aria-hidden="true" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>

<style scoped>
.docs-checkbox {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  place-items: center;
  border: 1px solid var(--sectile-border-strong);
  border-radius: 6px;
  padding: 0;
  color: var(--sectile-content-on-accent);
  background: var(--sectile-surface-interactive);
  cursor: pointer;
}

.docs-checkbox[data-state='checked'],
.docs-checkbox[data-state='indeterminate'] {
  border-color: var(--sectile-action);
  background: var(--sectile-action);
}

.docs-checkbox:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

.docs-checkbox:disabled {
  border-color: var(--sectile-border-subtle);
  color: var(--sectile-content-disabled);
  background: var(--sectile-surface-disabled);
  cursor: not-allowed;
}
</style>
