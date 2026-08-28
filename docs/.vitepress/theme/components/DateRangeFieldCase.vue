<script setup lang="ts">
import { ArrowRight, CalendarRange } from '@lucide/vue';
import { computed, ref } from 'vue';
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput, type DateRange } from '@sectile/vue/temporal';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';
import { formatDemoDateRange } from '../temporal-demo-format.js';

const props = defineProps<{ readonly title: string; readonly description: string; readonly initialValue: DateRange; readonly controlled?: boolean; readonly bounded?: boolean }>();
const value = ref<DateRange | null>(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const policies = computed(() => props.bounded ? { min: { year: 2026, month: 9, day: 1 }, max: { year: 2026, month: 9, day: 30 } } : undefined);
const ownershipProps = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: props.initialValue });
const policyProps = computed(() => policies.value === undefined ? {} : { policies: policies.value });
const state = computed(() => ({ value: value.value, ownership: props.controlled ? 'controlled' : 'uncontrolled', policies: policies.value ?? null }));
const displayValue = computed(() => formatDemoDateRange(value.value));
const code = computed(() => `<script setup lang="ts">
import { ref } from 'vue'
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } from '@sectile/vue/temporal';
const range = ref({
  start: { year: 2026, month: ${props.bounded ? 9 : 8}, day: ${props.bounded ? 8 : 22} },
  end: { year: 2026, month: ${props.bounded ? 9 : 8}, day: ${props.bounded ? 18 : 25} },
})${props.bounded ? `
const policies = {
  min: { year: 2026, month: 9, day: 1 },
  max: { year: 2026, month: 9, day: 30 },
}` : ''}
<\/script>

<template>
  <DateRangeFieldRoot v-model="range"${props.bounded ? ' :policies="policies"' : ''}>
    <label>Start <DateRangeFieldStartInput name="start" /></label>
    <label>End <DateRangeFieldEndInput name="end" /></label>
  </DateRangeFieldRoot>
</template>`);

function update(next: DateRange | null): void { value.value = next; revision.value += 1; entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: ['commit-range'] }, ...entries.value].slice(0, 12); }
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <div class="native-field-demo">
      <DateRangeFieldRoot
        v-bind="{ ...ownershipProps, ...policyProps }"
        start-label="Start date"
        end-label="End date"
        class="temporal-range"
        @update:model-value="update"
      >
        <label class="text-label temporal-range__field">
          <span>Start date</span>
          <DateRangeFieldStartInput class="text-field temporal-input" name="start" />
        </label>
        <span class="temporal-range__separator" aria-hidden="true"><ArrowRight :size="18" /></span>
        <label class="text-label temporal-range__field">
          <span>End date</span>
          <DateRangeFieldEndInput class="text-field temporal-input" name="end" />
        </label>
      </DateRangeFieldRoot>
      <p class="temporal-value" role="status" aria-live="polite">
        <span><CalendarRange :size="15" aria-hidden="true" />Deployment window</span>
        <strong>{{ displayValue }}</strong>
      </p>
    </div>
  </DemoCard>
</template>
