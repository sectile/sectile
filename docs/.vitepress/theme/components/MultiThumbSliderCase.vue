<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  MultiThumbSliderRange,
  MultiThumbSliderRoot,
  MultiThumbSliderThumb,
  MultiThumbSliderTrack,
} from '@sectile/vue/multi-thumb-slider';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = defineProps<{
  readonly scenario: string;
}>();

const thresholds = props.scenario === 'three-thumb-thresholds';
const constrained = props.scenario === 'crossing-thumbs';
const thumbs = Object.freeze(thresholds ? ['warning', 'review', 'block'] : ['minimum', 'maximum']);
const values = ref<readonly string[]>(thresholds ? ['20', '55', '85'] : constrained ? ['35', '70'] : ['120', '340']);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const min = thresholds || constrained ? 0 : 50;
const max = thresholds || constrained ? 100 : 500;
const step = thresholds || constrained ? 5 : 10;
const heading = thresholds ? 'Release quality gates' : constrained ? 'Search price range' : 'Campaign budget';
const detail = thresholds ? 'Set warning, review, and blocking thresholds' : constrained ? 'Keep at least $10 between both limits' : 'Choose the monthly spend range';
const output = computed(() => thresholds
  ? values.value.map((value) => `${value}%`).join(' · ')
  : `$${values.value[0]} – $${values.value[1]}`);
const scale = computed(() => thresholds
  ? ['0% · Open', '50% · Review', '100% · Block']
  : constrained
    ? ['$0 · Minimum', '$50 · Typical', '$100 · Maximum']
    : ['$50 · Minimum', '$275 · Typical', '$500 · Maximum']);
const state = computed(() => ({ values: values.value, ownership: 'controlled', constraint: constrained ? '$10 minimum gap' : 'ordered' }));
const code = '';

function update(next: readonly string[]): void {
  values.value = Object.freeze([...next]);
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: [`set-range-values values=${next.join(',')}`],
  }, ...entries.value].slice(0, 12);
}

function thumbLabel(id: string): string {
  const labels: Readonly<Record<string, string>> = {
    minimum: 'Minimum budget',
    maximum: 'Maximum budget',
    warning: 'Warning threshold',
    review: 'Review threshold',
    block: 'Blocking threshold',
  };
  return labels[id] ?? id;
}

function formatValue(value: string): string {
  return thresholds ? `${value}%` : `$${value}`;
}
</script>

<template>
  <DemoCard title="Range settings" :revision="revision" :state="state" :entries="entries" :code="code" interaction="enabled">
    <section class="multi-slider-demo" :aria-label="heading">
      <header class="multi-slider-heading">
        <span><strong>{{ heading }}</strong><small>{{ detail }}</small></span>
        <output class="multi-slider-value">{{ output }}</output>
      </header>
      <MultiThumbSliderRoot
        :thumbs="thumbs"
        :model-value="values"
        :min="min"
        :max="max"
        :step="step"
        v-bind="constrained ? { policies: { minGap: 2 } } : {}"
        :label="heading"
        :get-thumb-label="thumbLabel"
        :format-value="formatValue"
        class="multi-slider-control"
        @update:model-value="update"
      >
        <MultiThumbSliderTrack class="multi-slider-track">
          <MultiThumbSliderRange class="multi-slider-range" />
          <MultiThumbSliderThumb
            v-for="(thumb, index) in thumbs"
            :key="thumb"
            :value="thumb"
            class="multi-slider-thumb"
          >
            <span class="multi-slider-thumb-value">{{ formatValue(values[index] ?? '0') }}</span>
          </MultiThumbSliderThumb>
        </MultiThumbSliderTrack>
      </MultiThumbSliderRoot>
      <div class="multi-slider-scale"><span v-for="label in scale" :key="label">{{ label }}</span></div>
      <p class="multi-slider-help">Drag a handle or use the arrow keys for precise steps.</p>
    </section>
  </DemoCard>
</template>
