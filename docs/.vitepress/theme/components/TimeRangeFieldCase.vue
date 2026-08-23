<script setup lang="ts">
import { computed, ref } from 'vue'; import { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput, type TimeRange } from '@sectile/vue/time-range-field'; import DemoCard from './DemoCard.vue'; import type { EventEntry } from '../types.js';
const props = defineProps<{ readonly title: string; readonly description: string; readonly initialValue: TimeRange; readonly controlled?: boolean; readonly stepped?: boolean }>(); const value = ref<TimeRange | null>(props.initialValue); const revision = ref(0); const entries = ref<EventEntry[]>([]); const ownershipProps = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: props.initialValue }); const policyProps = computed(() => props.stepped ? { policies: { step: { minute: 15 } } } : {}); const state = computed(() => ({ value: value.value, ownership: props.controlled ? 'controlled' : 'uncontrolled' })); const code = `<script setup lang="ts">
import { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput } from '@sectile/vue/time-range-field';
<\/script>
<template>
  <TimeRangeFieldRoot :default-value="hours">
    <TimeRangeFieldStartInput name="start" /><span>to</span><TimeRangeFieldEndInput name="end" />
  </TimeRangeFieldRoot>
</template>`;
function update(next: TimeRange | null): void { value.value = next; revision.value += 1; entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: ['commit-range'] }, ...entries.value].slice(0, 12); }
</script>
<template><DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code"><div class="native-field-demo"><p class="demo-copy">{{ description }}</p><TimeRangeFieldRoot v-bind="{ ...ownershipProps, ...policyProps }" start-label="Start time" end-label="End time" class="catalog-inline" @update:model-value="update"><TimeRangeFieldStartInput class="text-field" name="start" /><span>to</span><TimeRangeFieldEndInput class="text-field" name="end" /></TimeRangeFieldRoot><p class="text-value">Committed: {{ value }}</p></div></DemoCard></template>
