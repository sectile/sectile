<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check } from '@lucide/vue';
import {
  ListboxItem,
  ListboxItemIndicator,
  ListboxItemText,
  ListboxRoot,
  type ListboxValue,
} from '@sectile/vue/listbox';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly description: string;
  readonly multiple?: boolean;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
}>(), {
  multiple: false,
  controlled: false,
  disabled: false,
  readonly: false,
});

const channels = [
  { value: 'production', label: 'Production', copy: 'Customer-facing environment' },
  { value: 'staging', label: 'Staging', copy: 'Pre-release verification' },
  { value: 'development', label: 'Development', copy: 'Local team workspace' },
  { value: 'archive', label: 'Archived preview', copy: 'No longer available', disabled: true },
] as const;
const items = channels.map((channel) => channel.value);
const initialValue: ListboxValue = props.multiple ? ['production', 'development'] : 'production';
const value = ref<ListboxValue>(initialValue);
const highlighted = ref<string | null>('production');
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const ownershipProps = computed(() => props.controlled
  ? { modelValue: value.value }
  : { defaultValue: initialValue });
const state = computed<Readonly<Record<string, unknown>>>(() => ({
  value: value.value,
  highlighted: highlighted.value,
  selectionMode: props.multiple ? 'multiple' : 'single',
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
}));
const sourceCode = computed(() => `<script setup lang="ts">
import { ListboxItem, ListboxItemIndicator, ListboxItemText, ListboxRoot } from '@sectile/vue/listbox';

const items = ['production', 'staging', 'development'];
<\/script>

<template>
  <ListboxRoot :items="items" ${props.multiple ? 'selection-mode="multiple"' : ''} default-value="production">
    <ListboxItem v-for="item in items" :key="item" :value="item">
      <ListboxItemText>{{ item }}</ListboxItemText>
      <ListboxItemIndicator><Check /></ListboxItemIndicator>
    </ListboxItem>
  </ListboxRoot>
</template>`);

function record(event: string, effects: readonly string[]): void {
  revision.value += 1;
  entries.value = [{ revision: revision.value, event, accepted: true, effects }, ...entries.value].slice(0, 12);
}

function updateValue(next: ListboxValue): void {
  value.value = next;
  record('update:modelValue', [`set-selection value=${JSON.stringify(next)}`]);
}

function updateHighlight(next: string | null): void {
  highlighted.value = next;
  record('highlight', next === null ? [] : [`focus-option id=${next}`]);
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="state"
    :entries="entries"
    :code="sourceCode"
    :interaction="disabled ? 'disabled' : readonly ? 'readonly' : 'enabled'"
  >
    <div class="listbox-demo">
      <p class="demo-copy">{{ description }}</p>
      <ListboxRoot
        v-bind="ownershipProps"
        :items="items"
        :selection-mode="multiple ? 'multiple' : 'single'"
        :disabled-items="['archive']"
        :disabled="disabled"
        :readonly="readonly"
        class="listbox-control"
        name="release-channel"
        @update:model-value="updateValue"
        @highlight="updateHighlight"
      >
        <ListboxItem
          v-for="channel in channels"
          :key="channel.value"
          v-slot="{ selected, highlighted: active, disabled: unavailable }"
          :value="channel.value"
          :disabled="'disabled' in channel && channel.disabled"
          class="listbox-option"
        >
          <span class="listbox-copy">
            <ListboxItemText as="strong">{{ channel.label }}</ListboxItemText>
            <small>{{ channel.copy }}</small>
          </span>
          <ListboxItemIndicator class="listbox-indicator">
            <Check :size="16" aria-hidden="true" />
            <span>Selected</span>
          </ListboxItemIndicator>
          <span v-if="unavailable" class="listbox-meta">Unavailable</span>
          <span v-else-if="active && !selected" class="listbox-meta">Focused</span>
        </ListboxItem>
      </ListboxRoot>
    </div>
  </DemoCard>
</template>
