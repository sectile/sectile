<script setup lang="ts">
import { computed } from 'vue';
import { Check, ChevronDown } from '@lucide/vue';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@sectile/vue/select';

export interface DemoSelectOption {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
}

const props = defineProps<{
  readonly options: readonly DemoSelectOption[];
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly defaultOpen?: boolean;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly required?: boolean;
  readonly label: string;
  readonly placeholder?: string;
  readonly compact?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const itemIDs = computed(() => props.options.map(({ id }) => id));
const valueBindings = computed(() => ({
  ...(props.modelValue !== undefined ? { modelValue: props.modelValue } : {}),
  ...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {}),
}));
const optionLabel = (id: string): string => (
  props.options.find((option) => option.id === id)?.label ?? id
);
</script>

<template>
  <div class="demo-select" :class="{ 'demo-select--compact': compact }">
    <SelectRoot
      v-bind="valueBindings"
      :items="itemIDs"
      :default-open="defaultOpen"
      :disabled-items="disabledItems ?? []"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :label="label"
      :text-value="optionLabel"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <SelectTrigger class="demo-select__trigger demo-collection-field">
        <SelectValue :placeholder="placeholder ?? ''" v-slot="{ value }">
          {{ value === null ? (placeholder ?? '') : optionLabel(value) }}
        </SelectValue>
        <ChevronDown class="demo-select__chevron" :size="16" aria-hidden="true" />
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          class="demo-select__content demo-collection-surface"
          :class="{ 'demo-select__content--compact': compact }"
        >
          <SelectItem
            v-for="option in options"
            :key="option.id"
            :value="option.id"
            class="demo-select__option demo-collection-option"
            :class="{
              'demo-collection-option--detailed': option.detail !== undefined,
              'demo-select__option--compact': compact,
            }"
          >
            <span class="demo-collection-copy">
              <strong>{{ option.label }}</strong>
              <small v-if="option.detail !== undefined">{{ option.detail }}</small>
            </span>
            <SelectItemIndicator class="demo-collection-indicator">
              <Check :size="15" :stroke-width="2.4" aria-hidden="true" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>

<style scoped>
.demo-select {
  position: relative;
  width: 100%;
}

.demo-select__trigger {
  display: flex;
  width: 100%;
  height: 2.75rem;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  border: 1px solid var(--sectile-border-control);
  border-radius: .625rem;
  padding: 0 .75rem;
  color: var(--sectile-content-primary);
  background: var(--sectile-surface);
  font: inherit;
  font-size: .84rem;
  text-align: left;
  cursor: pointer;
}

.demo-select__trigger:hover:not(:disabled) {
  border-color: var(--sectile-border-strong);
  background: var(--sectile-surface);
}

.demo-select__trigger:active:not(:disabled) {
  background: var(--sectile-surface-selected);
}

.demo-select__trigger:focus-visible {
  border-color: var(--sectile-action);
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

.demo-select__trigger:disabled {
  color: var(--sectile-content-disabled);
  background: var(--sectile-surface-disabled);
  cursor: not-allowed;
}

.demo-select__chevron {
  flex: 0 0 auto;
  color: var(--sectile-content-secondary);
}

.demo-select__content {
  z-index: 40;
  display: grid;
  width: max-content;
  min-width: var(--sectile-position-anchor-width, 12rem);
  max-width: min(22rem, var(--sectile-position-available-width, calc(100vw - 1rem)));
  max-height: var(--sectile-position-available-height, min(24rem, calc(100vh - 1rem)));
  overflow-y: auto;
  gap: .125rem;
  border: 1px solid var(--sectile-border-control);
  border-radius: .625rem;
  padding: .3rem;
  color: var(--sectile-content-primary);
  background: var(--sectile-surface);
  box-shadow: var(--sectile-shadow-floating);
}

.demo-select__content[hidden] {
  display: none;
}

.demo-select__option {
  display: flex;
  min-height: 2.35rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: .45rem;
  padding: .45rem .6rem;
  color: var(--sectile-content-primary);
  cursor: pointer;
  outline: none;
}

.demo-select__option:hover:not([aria-disabled="true"]):not([data-selected]):not([data-state="checked"]),
.demo-select__option[data-highlighted]:not([aria-disabled="true"]):not([data-selected]):not([data-state="checked"]) {
  background: var(--sectile-surface-hover);
}

.demo-select__option:is([data-selected], [data-state="checked"]) {
  background: var(--sectile-surface-interactive);
}

.demo-select__option[aria-disabled="true"] {
  color: var(--sectile-content-disabled);
  cursor: not-allowed;
}

.demo-collection-option--detailed {
  min-height: 3rem;
}

.demo-collection-copy {
  display: grid;
  min-width: 0;
  gap: .15rem;
}

.demo-collection-copy strong {
  font-size: .84rem;
  font-weight: 650;
  line-height: 1.3;
}

.demo-collection-copy small {
  color: var(--sectile-content-secondary);
  font-size: .72rem;
  line-height: 1.35;
}

.demo-collection-indicator {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: var(--sectile-action);
}

.demo-collection-indicator[hidden] {
  display: none;
}

.demo-select--compact {
  width: 5.25rem;
}

.demo-select--compact .demo-select__trigger {
  height: 2.4rem;
  padding: 0 .65rem;
  border-radius: .55rem;
  background: var(--sectile-surface);
  font-size: .78rem;
}

.demo-select__content--compact {
  min-width: var(--sectile-position-anchor-width, 5.25rem);
  padding: .3rem;
  border-radius: .6rem;
}

.demo-select__option--compact {
  min-height: 2rem;
  padding: .3rem .5rem;
  font-size: .78rem;
}
</style>
