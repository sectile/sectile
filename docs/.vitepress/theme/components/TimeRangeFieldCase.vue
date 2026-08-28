<script setup lang="ts">
import { ArrowRight, Clock3 } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
  TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput, type TimeRange,
} from '@sectile/vue/temporal';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';
import { formatDemoTimeRange } from '../temporal-demo-format.js';

const props = defineProps<{
  readonly title: string;
  readonly description: string;
  readonly initialValue: TimeRange;
  readonly controlled?: boolean;
  readonly stepped?: boolean;
}>();
const value = ref<TimeRange | null>(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const ownershipProps = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: props.initialValue });
const policyProps = computed(() => props.stepped ? { policies: { step: { minute: 15 } } } : {});
const state = computed(() => ({ value: value.value, ownership: props.controlled ? 'controlled' : 'uncontrolled' }));
const displayValue = computed(() => formatDemoTimeRange(value.value));
const code = computed(() => `<script setup lang="ts">
import { ref } from 'vue'
import { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput } from '@sectile/vue/temporal'

const hours = ref({ start: { hour: 9, minute: 30 }, end: { hour: 17, minute: 45 } })${props.stepped ? `
const policies = { step: { minute: 15 } }` : ''}
<\/script>

<template>
  <TimeRangeFieldRoot v-model="hours"${props.stepped ? ' :policies="policies"' : ''}>
    <label>Opens <TimeRangeFieldStartInput name="opens" /></label>
    <label>Closes <TimeRangeFieldEndInput name="closes" /></label>
  </TimeRangeFieldRoot>
</template>`);

function update(next: TimeRange | null): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: ['commit-range'],
  }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <div class="native-field-demo">
      <TimeRangeFieldRoot
        v-bind="{ ...ownershipProps, ...policyProps }"
        start-label="Opening time"
        end-label="Closing time"
        class="temporal-range"
        @update:model-value="update"
      >
        <label class="text-label temporal-range__field">
          <span>Opens</span>
          <TimeRangeFieldStartInput class="text-field temporal-input" name="opens" />
        </label>
        <span class="temporal-range__separator" aria-hidden="true"><ArrowRight :size="18" /></span>
        <label class="text-label temporal-range__field">
          <span>Closes</span>
          <TimeRangeFieldEndInput class="text-field temporal-input" name="closes" />
        </label>
      </TimeRangeFieldRoot>
      <p class="temporal-value" role="status" aria-live="polite">
        <span><Clock3 :size="15" aria-hidden="true" />Office hours</span>
        <strong>{{ displayValue }}</strong>
      </p>
    </div>
  </DemoCard>
</template>
