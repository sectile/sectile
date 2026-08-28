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
    class="ds-check"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <CheckboxIndicator>
      <Minus v-if="isIndeterminate" :size="13" :stroke-width="3" aria-hidden="true" />
      <Check v-else :size="13" :stroke-width="3" aria-hidden="true" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
