<script setup lang="ts">
import { computed } from 'vue';
import type { ExampleDefinition } from '../examples/catalog.js';
import DocsIcon from './DocsIcon.vue';
const props = defineProps<{ example: ExampleDefinition }>();
const descriptions: Readonly<Record<string, readonly [string, string, string]>> = {
  Calendar: ['Delivery date', 'October 2026', 'Selected day: 3'],
  VirtualList: ['Deliveries', '500 items', 'Nearby rows only'],
  DataTable: ['Project members', 'Ada · Engineer', 'Grace · Designer'],
  Chart: ['Weekday deliveries', 'Stable records and numeric axes', 'Keyboard inspection'],
  Accordion: ['Delivery', 'Standard delivery takes three working days.', 'Returns'],
  Popover: ['Delivery details', 'Email notifications', 'Close details'],
  Dialog: ['Notification settings', 'Manage delivery preferences.', 'Close'],
  Disclosure: ['Delivery preferences', 'Present → exiting → hidden', 'Hide details'],
};
const summary = computed(() => descriptions[props.example.subject] ?? [props.example.subject, props.example.title, props.example.focus]);
</script>

<template>
  <div v-if="example.subject === 'Text' || example.area === 'form'" class="docs-thumbnail-form"><span>{{ example.subject === 'Text' ? 'Display name' : 'Email address' }}</span><i>{{ example.subject === 'Text' ? 'Ada' : 'you@example.com' }}</i><strong v-if="example.area === 'form'">Save preferences</strong></div>
  <div v-else-if="example.subject === 'Switch'" class="docs-thumbnail-switch-label"><span class="docs-thumbnail-switch"><i /></span>Email notifications</div>
  <div v-else-if="example.subject === 'ToggleButton' || example.subject === 'ToggleGroup'" class="docs-thumbnail-choice-row"><span class="is-selected">{{ example.subject === 'ToggleButton' ? 'Pin conversation' : 'bold' }}</span><span v-if="example.subject === 'ToggleGroup'">italic</span></div>
  <div v-else-if="example.subject === 'RadioGroup'" class="docs-thumbnail-radio"><span />Standard delivery</div>
  <div v-else-if="example.subject === 'Tabs'" class="docs-thumbnail-tabs"><div><strong>Overview</strong><span>Activity</span></div><p>Project settings</p></div>
  <div v-else-if="example.subject === 'Checkbox'" class="docs-thumbnail-checkbox"><span><DocsIcon name="check" :size="14" /></span>Notifications</div>
  <div v-else class="docs-thumbnail-dialog"><strong>{{ summary[0] }}</strong><span>{{ summary[1] }}</span><i v-if="summary[2]">{{ summary[2] }}</i></div>
</template>

<style scoped>
.docs-thumbnail-checkbox {
  display: flex;
  align-items: center;
  gap: var(--docs-space-3);
}

.docs-thumbnail-checkbox > span {
  display: grid;
  width: var(--docs-checkbox-size);
  height: var(--docs-checkbox-size);
  flex: none;
  place-items: center;
  border: var(--docs-border-width) solid var(--docs-accent);
  border-radius: var(--docs-small-radius);
  background: var(--docs-accent);
  color: var(--docs-on-accent);
}

.docs-thumbnail-checkbox svg { display: block; }

.docs-thumbnail-dialog {
  display: grid;
  width: 220px;
  max-width: 100%;
  gap: var(--docs-space-1);
  padding: var(--docs-space-4);
  border: var(--docs-border-width) solid var(--docs-control-border);
  border-radius: var(--docs-radius);
  background: var(--docs-bg);
}

.docs-thumbnail-dialog span {
  color: var(--docs-text-muted);
  font-size: 11px;
}

.docs-thumbnail-dialog i {
  justify-self: start;
  margin-top: var(--docs-space-2);
  font-size: 11px;
  font-style: normal;
}

.docs-thumbnail-form {
  display: grid;
  width: 210px;
  max-width: 100%;
  gap: var(--docs-space-2);
}

.docs-thumbnail-form i {
  padding: var(--docs-space-2) var(--docs-space-3);
  border: var(--docs-border-width) solid var(--docs-control-border);
  border-radius: var(--docs-field-radius);
  background: var(--docs-bg);
  color: var(--docs-text-muted);
  font-style: normal;
}

.docs-thumbnail-form strong {
  justify-self: start;
  padding: var(--docs-space-2) var(--docs-space-3);
  border-radius: var(--docs-control-radius);
  background: var(--docs-accent);
  color: var(--docs-on-accent);
  font-size: 11px;
  font-weight: 500;
}
</style>
