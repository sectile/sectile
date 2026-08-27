<script setup lang="ts">
import { computed } from 'vue';
import { Check, ChevronDown, ChevronRight } from '@lucide/vue';
import {
  CascadeSelectColumn,
  CascadeSelectContent,
  CascadeSelectItem,
  CascadeSelectItemChevron,
  CascadeSelectItemIndicator,
  CascadeSelectRoot,
  CascadeSelectTrigger,
  CascadeSelectValue,
  type CascadeSelectRootProps,
} from '@sectile/vue/cascade-select';

const props = defineProps<{
  readonly nodes: CascadeSelectRootProps['nodes'];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly label: string;
  readonly columnLabels?: readonly string[];
  readonly placeholder?: string;
  readonly separator?: string;
  readonly textValue?: CascadeSelectRootProps['textValue'];
  readonly floating?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  'update:open': [value: boolean];
}>();

const valueBindings = computed(() => ({
  ...(props.modelValue !== undefined ? { modelValue: props.modelValue } : {}),
  ...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {}),
  ...(props.textValue !== undefined ? { textValue: props.textValue } : {}),
}));
</script>

<template>
  <CascadeSelectRoot
    v-bind="valueBindings"
    :nodes="nodes"
    :disabled-items="disabledItems ?? []"
    :disabled="disabled"
    :readonly="readonly"
    :label="label"
    class="demo-cascade-select"
    :class="{ 'demo-cascade-select--floating': floating }"
    @update:model-value="emit('update:modelValue', $event)"
    @update:open="emit('update:open', $event)"
    v-slot="{ columns, open }"
  >
    <CascadeSelectTrigger class="cascade-select-trigger">
      <CascadeSelectValue :placeholder="placeholder ?? ''" :separator="separator ?? ' / '" />
      <ChevronDown class="cascade-select-trigger__chevron" :class="{ 'is-open': open }" :size="16" aria-hidden="true" />
    </CascadeSelectTrigger>

    <CascadeSelectContent class="cascade-select-content">
      <CascadeSelectColumn
        v-for="(_, depth) in columns"
        :key="depth"
        :depth="depth"
        :label="columnLabels?.[depth] ?? label"
        class="cascade-select-column"
        v-slot="{ items }"
      >
        <CascadeSelectItem v-for="item in items" :key="item" :value="item" class="cascade-select-item">
          <span>{{ textValue?.(item) ?? item }}</span>
          <span class="cascade-select-item__end">
            <CascadeSelectItemIndicator><Check :size="14" aria-hidden="true" /></CascadeSelectItemIndicator>
            <CascadeSelectItemChevron><ChevronRight :size="14" aria-hidden="true" /></CascadeSelectItemChevron>
          </span>
        </CascadeSelectItem>
      </CascadeSelectColumn>
    </CascadeSelectContent>
  </CascadeSelectRoot>
</template>

<style scoped>
.demo-cascade-select { position: relative; width: 100%; }
.demo-cascade-select[data-state='open'] { z-index: 20; }
.cascade-select-trigger { display: flex; width: 100%; min-height: 2.75rem; align-items: center; justify-content: space-between; gap: 0.75rem; border: 1px solid var(--sectile-border-control); border-radius: 0.7rem; padding: 0.68rem 1rem; color: var(--sectile-content-secondary); background: var(--sectile-surface); font: inherit; text-align: left; cursor: pointer; }
.cascade-select-trigger:hover:not(:disabled) { border-color: var(--sectile-border-strong); background: var(--sectile-surface-hover); }
.cascade-select-trigger:focus-visible, .cascade-select-item:focus-visible { outline: 2px solid var(--sectile-focus-ring); outline-offset: 2px; }
.cascade-select-trigger > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cascade-select-trigger__chevron { flex: 0 0 auto; transition: transform 180ms var(--sectile-ease-standard); }
.cascade-select-trigger__chevron.is-open { transform: rotate(180deg); }
.cascade-select-content { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(11rem, 1fr); overflow-x: auto; border: 1px solid var(--sectile-border-control); border-radius: 0.65rem; color: var(--sectile-content-primary); background: var(--sectile-surface); box-shadow: var(--sectile-shadow-floating); }
.cascade-select-content[hidden] { display: none; }
.demo-cascade-select--floating .cascade-select-content { position: absolute; z-index: 20; top: calc(100% + 0.35rem); right: 0; left: 0; max-height: 260px; overflow: auto; }
.cascade-select-column { display: grid; min-width: 0; min-height: 15rem; align-content: start; gap: 0.1rem; padding: 0.25rem; border-inline-end: 1px solid var(--sectile-border-control); }
.cascade-select-column:last-child { border-inline-end: 0; }
.cascade-select-item { display: flex; min-width: 0; min-height: 2.7rem; align-items: center; justify-content: space-between; gap: 1rem; border: 0; border-radius: 0.4rem; padding: 0.55rem 0.65rem; color: inherit; background: transparent; text-align: left; cursor: pointer; outline: 0; }
.cascade-select-item > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cascade-select-item:hover:not([aria-disabled='true']), .cascade-select-item[data-highlighted]:not([data-selected]) { background: var(--sectile-surface-subtle); }
.cascade-select-item[data-selected] { color: var(--sectile-content-primary); background: transparent; }
.cascade-select-item__end { display: inline-flex; flex: 0 0 auto; align-items: center; color: var(--sectile-action); }

@media (max-width: 640px) {
  .cascade-select-content { grid-auto-columns: minmax(9.5rem, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .cascade-select-trigger__chevron { transition: none; }
}
</style>
