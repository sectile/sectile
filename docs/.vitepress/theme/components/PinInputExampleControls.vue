<script setup lang="ts">
import { Check } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';
import { TextField } from '@sectile/vue/text';
import { useDocsLocale } from '../locale.js';
import type { PinInputExampleOptions } from '../pin-input-example-options.js';

const props = defineProps<{
  readonly modelValue: PinInputExampleOptions;
  readonly scenario: string;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: PinInputExampleOptions];
}>();
const { isKorean } = useDocsLocale();

function update(patch: Partial<PinInputExampleOptions>): void {
  emit('update:modelValue', Object.freeze({ ...props.modelValue, ...patch }));
}

function updateLength(value: string | number): void {
  const length = Math.min(8, Math.max(1, Number.parseInt(String(value), 10) || 1));
  update({ length, value: Array.from(props.modelValue.value).slice(0, length).join('') });
}

function updateText(property: 'value' | 'placeholder', value: string | number): void {
  const limit = property === 'value' ? props.modelValue.length : 1;
  update({ [property]: Array.from(String(value)).slice(0, limit).join('') });
}

function updateBoolean(property: 'mask' | 'otp' | 'readonly' | 'disabled', value: CheckboxValue): void {
  update({ [property]: value === true });
}
</script>

<template>
  <div class="sectile-example-options">
    <label v-if="scenario === 'custom-length'" class="sectile-example-options__field sectile-example-options__field--length">
      <span>{{ isKorean ? '입력 칸 수' : 'Length' }}</span>
      <TextField type="number" min="1" max="8" :model-value="modelValue.length" @update:model-value="updateLength" />
    </label>
    <label v-else-if="scenario === 'placeholders'" class="sectile-example-options__field">
      <span>Placeholder</span>
      <TextField
        maxlength="1"
        :model-value="modelValue.placeholder"
        :placeholder="isKorean ? '없음' : 'None'"
        @update:model-value="updateText('placeholder', $event)"
      />
    </label>
    <label v-else-if="scenario === 'controlled'" class="sectile-example-options__field">
      <span>{{ isKorean ? '값' : 'Value' }}</span>
      <TextField
        inputmode="numeric"
        :maxlength="modelValue.length"
        :model-value="modelValue.value"
        :placeholder="isKorean ? '비어 있음' : 'Empty'"
        @update:model-value="updateText('value', $event)"
      />
    </label>
    <CheckboxRoot v-else-if="scenario === 'masked'" :model-value="modelValue.mask" class="sectile-example-options__toggle" @update:model-value="updateBoolean('mask', $event)">
      <span class="sectile-example-options__check"><CheckboxIndicator><Check :size="12" aria-hidden="true" /></CheckboxIndicator></span> Mask
    </CheckboxRoot>
    <CheckboxRoot v-else-if="scenario === 'otp'" :model-value="modelValue.otp" class="sectile-example-options__toggle" @update:model-value="updateBoolean('otp', $event)">
      <span class="sectile-example-options__check"><CheckboxIndicator><Check :size="12" aria-hidden="true" /></CheckboxIndicator></span> OTP
    </CheckboxRoot>
    <CheckboxRoot v-else-if="scenario === 'readonly'" :model-value="modelValue.readonly" class="sectile-example-options__toggle" @update:model-value="updateBoolean('readonly', $event)">
      <span class="sectile-example-options__check"><CheckboxIndicator><Check :size="12" aria-hidden="true" /></CheckboxIndicator></span> Readonly
    </CheckboxRoot>
    <CheckboxRoot v-else-if="scenario === 'disabled'" :model-value="modelValue.disabled" class="sectile-example-options__toggle" @update:model-value="updateBoolean('disabled', $event)">
      <span class="sectile-example-options__check"><CheckboxIndicator><Check :size="12" aria-hidden="true" /></CheckboxIndicator></span> Disabled
    </CheckboxRoot>
  </div>
</template>
