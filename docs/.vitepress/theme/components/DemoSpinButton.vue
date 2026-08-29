<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue';
import type { ObjectDirective } from 'vue';
import {
  SpinButtonDecrement,
  SpinButtonIncrement,
  SpinButtonInput,
  SpinButtonRoot,
} from '@sectile/vue/spin-button';

const props = withDefaults(defineProps<{
  readonly modelValue: number;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly decrementLabel?: string;
  readonly incrementLabel?: string;
}>(), { step: 1, disabled: false, readonly: false });

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const vLocalizedLabel: ObjectDirective<HTMLElement, string> = {
  mounted: setLocalizedLabel,
  updated: setLocalizedLabel,
};

function setLocalizedLabel(element: HTMLElement, binding: { readonly value: string }): void {
  element.setAttribute('aria-label', binding.value);
}

function update(next: string): void {
  const parsed = Number(next);
  if (Number.isSafeInteger(parsed)) emit('update:modelValue', parsed);
}
</script>

<template>
  <div class="demo-spin-button">
    <SpinButtonRoot
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :readonly="readonly"
      :label="label"
      class="demo-spin-button__control"
      @update:model-value="update"
    >
      <SpinButtonDecrement v-localized-label="decrementLabel ?? `${label}: decrease`" class="demo-spin-button__step">
        <Minus :size="14" aria-hidden="true" />
      </SpinButtonDecrement>
      <SpinButtonInput class="demo-spin-button__input" />
      <SpinButtonIncrement v-localized-label="incrementLabel ?? `${label}: increase`" class="demo-spin-button__step">
        <Plus :size="14" aria-hidden="true" />
      </SpinButtonIncrement>
    </SpinButtonRoot>
  </div>
</template>

<style scoped>
.demo-spin-button {
  display: grid;
  min-width: 0;
  gap: .5rem;
}

.demo-spin-button__control {
  display: grid;
  min-width: 0;
  height: 2.75rem;
  grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
  overflow: hidden;
  border: 1px solid var(--sectile-border-control);
  border-radius: .625rem;
  background: var(--sectile-surface);
}

.demo-spin-button__control:focus-within {
  border-color: var(--sectile-action);
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

.demo-spin-button__control[data-readonly] {
  background: var(--sectile-surface-disabled);
}

.demo-spin-button__control[data-readonly] .demo-spin-button__input {
  color: var(--sectile-content-secondary);
}

.demo-spin-button__step,
.demo-spin-button__input {
  min-width: 0;
  border: 0;
  color: var(--sectile-content-primary);
  background: transparent;
  font: inherit;
}

.demo-spin-button__step {
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--sectile-content-secondary);
  cursor: pointer;
}

.demo-spin-button__step:first-child { border-right: 1px solid var(--sectile-border-subtle); }
.demo-spin-button__step:last-child { border-left: 1px solid var(--sectile-border-subtle); }
.demo-spin-button__step:hover:not(:disabled) { color: var(--sectile-content-primary); background: var(--sectile-surface-hover); }
.demo-spin-button__step:active:not(:disabled) { background: var(--sectile-surface-selected); }
.demo-spin-button__step:disabled { color: var(--sectile-content-disabled); cursor: not-allowed; }

.demo-spin-button__input {
  width: 100%;
  padding: 0 .5rem;
  font-size: .84rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.demo-spin-button__input:focus { outline: 0; }
</style>
