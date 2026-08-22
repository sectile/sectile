<script setup lang="ts">
import { computed, ref } from 'vue';
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput, type DateRange } from '@sectile/vue/date-range-field';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = defineProps<{ readonly title: string; readonly description: string; readonly initialValue: DateRange; readonly controlled?: boolean; readonly bounded?: boolean }>();
const value = ref<DateRange | null>(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const policies = computed(() => props.bounded ? { min: { year: 2026, month: 9, day: 1 }, max: { year: 2026, month: 9, day: 30 } } : undefined);
const ownershipProps = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: props.initialValue });
const policyProps = computed(() => policies.value === undefined ? {} : { policies: policies.value });
const state = computed(() => ({ value: value.value, ownership: props.controlled ? 'controlled' : 'uncontrolled', policies: policies.value ?? null }));
const code = `<script setup lang="ts">
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } from '@sectile/vue/date-range-field';
<\/script>

<template>
  <DateRangeFieldRoot :default-value="range">
    <DateRangeFieldStartInput name="start" />
    <span>to</span>
    <DateRangeFieldEndInput name="end" />
  </DateRangeFieldRoot>
</template>`;

function update(next: DateRange | null): void { value.value = next; revision.value += 1; entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: ['commit-range'] }, ...entries.value].slice(0, 12); }
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <div class="native-field-demo">
      <p class="demo-copy">{{ description }}</p>
      <DateRangeFieldRoot
        v-bind="{ ...ownershipProps, ...policyProps }"
        start-label="Start date"
        end-label="End date"
        class="catalog-inline"
        @update:model-value="update"
      >
        <DateRangeFieldStartInput class="text-field" name="start" />
        <span>to</span>
        <DateRangeFieldEndInput class="text-field" name="end" />
      </DateRangeFieldRoot>
      <p class="text-value">Committed: {{ value }}</p>
    </div>
  </DemoCard>
</template>
