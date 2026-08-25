<script setup lang="ts">
import { computed } from 'vue';
import { Check, ChevronDown } from '@lucide/vue';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
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
        <SelectValue v-if="placeholder !== undefined" :placeholder="placeholder" />
        <SelectValue v-else />
        <ChevronDown class="demo-select__chevron" :size="16" aria-hidden="true" />
      </SelectTrigger>

      <SelectContent class="demo-select__content demo-collection-surface">
        <SelectItem
          v-for="option in options"
          :key="option.id"
          :value="option.id"
          class="demo-select__option demo-collection-option"
          :class="{ 'demo-collection-option--detailed': option.detail !== undefined }"
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
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  text-align: left;
}

.demo-select__chevron {
  flex: 0 0 auto;
}

.demo-select__content {
  position: absolute;
  z-index: 12;
  top: calc(100% + .35rem);
  right: 0;
  left: 0;
}

.demo-select--compact {
  width: 5.25rem;
}

.demo-select--compact .demo-select__trigger {
  height: 2.4rem;
  padding: 0 .65rem;
  border-radius: .55rem;
  background: var(--demo-surface);
  font-size: .78rem;
}

.demo-select--compact .demo-select__content {
  left: auto;
  min-width: 100%;
  padding: .3rem;
  border-radius: .6rem;
}

.demo-select--compact .demo-select__option {
  min-height: 2rem;
  padding: .3rem .5rem;
  font-size: .78rem;
}
</style>
