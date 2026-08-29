<script setup lang="ts">
import { computed } from 'vue';
import { Check, ChevronRight } from '@lucide/vue';
import {
  CascadeListColumn,
  CascadeListItem,
  CascadeListItemChevron,
  CascadeListItemIndicator,
  CascadeListRoot,
  CascadeListValue,
  type CascadeListRootProps,
} from '@sectile/vue/cascade-list';

const props = withDefaults(defineProps<{
  readonly nodes: CascadeListRootProps['nodes'];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly label: string;
  readonly columnLabels?: readonly string[];
  readonly columnCount?: number;
  readonly placeholder?: string;
  readonly separator?: string;
  readonly textValue?: CascadeListRootProps['textValue'];
  readonly showValue?: boolean;
}>(), {
  disabledItems: () => [],
  columnLabels: () => [],
  placeholder: '',
  separator: ' / ',
  showValue: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const valueBindings = computed(() => ({
  ...(props.modelValue !== undefined ? { modelValue: props.modelValue } : {}),
  ...(props.defaultValue !== undefined ? { defaultValue: props.defaultValue } : {}),
  ...(props.textValue !== undefined ? { textValue: props.textValue } : {}),
}));

function columnDepths(columns: readonly (readonly string[])[]): readonly number[] {
  const requested = props.columnCount ?? props.columnLabels.length;
  const count = Math.max(columns.length, Number.isFinite(requested) ? Math.floor(requested) : 0, 1);
  return Array.from({ length: count }, (_, depth) => depth);
}
</script>

<template>
  <CascadeListRoot
    v-bind="valueBindings"
    :nodes="nodes"
    :disabled-items="disabledItems"
    :disabled="disabled"
    :readonly="readonly"
    :label="label"
    class="demo-cascade-list"
    @update:model-value="emit('update:modelValue', $event)"
    v-slot="{ columns }"
  >
    <div v-if="showValue" class="demo-cascade-list__selection">
      <span class="demo-cascade-list__selection-label">{{ label }}</span>
      <CascadeListValue class="demo-cascade-list__value" :placeholder="placeholder" :separator="separator" />
    </div>

    <div class="demo-cascade-list__columns">
      <CascadeListColumn
        v-for="depth in columnDepths(columns)"
        :key="depth"
        :depth="depth"
        :label="columnLabels[depth] ?? label"
        class="cascade-list-column"
        v-slot="{ items }"
      >
        <CascadeListItem v-for="item in items" :key="item" :value="item" class="cascade-list-item">
          <span>{{ textValue?.(item) ?? item }}</span>
          <span class="cascade-list-item__end">
            <CascadeListItemIndicator><Check :size="14" aria-hidden="true" /></CascadeListItemIndicator>
            <CascadeListItemChevron><ChevronRight :size="14" aria-hidden="true" /></CascadeListItemChevron>
          </span>
        </CascadeListItem>
      </CascadeListColumn>
    </div>
  </CascadeListRoot>
</template>

<style scoped>
.demo-cascade-list { display: grid; width: 100%; min-width: 0; gap: 0.55rem; color: var(--sectile-content-primary); }
.demo-cascade-list__selection { display: flex; min-width: 0; min-height: 1.25rem; align-items: baseline; gap: 0.65rem; }
.demo-cascade-list__selection-label { flex: 0 0 auto; color: var(--sectile-content-tertiary); font-size: 0.7rem; font-weight: 700; }
.demo-cascade-list__value { min-width: 0; overflow: hidden; color: var(--sectile-content-secondary); font-size: 0.76rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.demo-cascade-list__columns { display: grid; min-width: 0; grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; border: 1px solid var(--sectile-border-control); border-radius: 0.7rem; background: var(--sectile-surface); }
.cascade-list-column { display: grid; min-width: 10rem; min-height: 12rem; align-content: start; gap: 0.1rem; padding: 0.3rem; border-inline-end: 1px solid var(--sectile-border-control); }
.cascade-list-column:last-child { border-inline-end: 0; }
.cascade-list-column[hidden] { display: grid; visibility: hidden; }
.cascade-list-item { display: flex; min-width: 0; min-height: 2.55rem; align-items: center; justify-content: space-between; gap: 1rem; border: 0; border-radius: 0.4rem; padding: 0.5rem 0.65rem; color: inherit; background: transparent; font: inherit; text-align: left; cursor: pointer; outline: 0; }
.cascade-list-item > span:first-child { flex: 0 0 auto; white-space: nowrap; }
.cascade-list-item:hover:not([aria-disabled='true']), .cascade-list-item[data-highlighted]:not([data-expanded]):not([data-selected]) { background: var(--sectile-surface-subtle); }
.cascade-list-item:is([data-expanded], [data-selected]) { color: var(--sectile-action); font-weight: 650; }
.cascade-list-item:focus-visible { outline: 2px solid var(--sectile-focus-ring); outline-offset: -2px; }
.cascade-list-item[aria-disabled='true'] { color: var(--sectile-content-tertiary); cursor: not-allowed; }
.cascade-list-item__end { display: inline-flex; flex: 0 0 auto; align-items: center; color: var(--sectile-content-tertiary); }
.cascade-list-item:is([data-expanded], [data-selected]) .cascade-list-item__end { color: var(--sectile-action); }

@media (max-width: 640px) {
  .cascade-list-column { min-width: 9rem; }
}
</style>
