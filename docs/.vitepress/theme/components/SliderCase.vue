<script setup lang="ts">
import { computed, ref } from 'vue';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const value = ref('40');
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const state = computed(() => ({ value: value.value, unit: 'percent', ownership: 'controlled' }));
const code = `<script setup lang="ts">
import { ref } from 'vue';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider';

const value = ref('40');
<\/script>

<template>
  <SliderRoot v-model="value" min="0" max="100" step="1">
    <SliderTrack>
      <SliderRange />
      <SliderThumb />
    </SliderTrack>
  </SliderRoot>
</template>`;
function update(next: string): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: [`set-range-value value=${next}`] }, ...entries.value];
}
</script>

<template>
  <DemoCard title="Deployment traffic" :revision="revision" :state="state" :entries="entries" :code="code" interaction="enabled">
    <div class="slider-demo">
      <div class="slider-value">{{ value }}%</div>
      <SliderRoot :model-value="value" min="0" max="100" step="1" name="traffic" label="Deployment traffic" class="slider-control" @update:model-value="update">
        <SliderTrack class="slider-track">
          <SliderRange class="slider-range" />
          <SliderThumb class="slider-thumb" />
        </SliderTrack>
      </SliderRoot>
      <div class="slider-scale"><span>0%</span><span>50%</span><span>100%</span></div>
    </div>
  </DemoCard>
</template>
