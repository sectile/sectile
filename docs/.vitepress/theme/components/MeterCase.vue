<script setup lang="ts">
import { computed } from 'vue';
import { MeterIndicator, MeterRoot, MeterTrack, MeterValueText } from '@sectile/vue/meter';
import DemoCard from './DemoCard.vue';

const props = defineProps<{
  readonly title: string;
  readonly description: string;
  readonly scenario: string;
}>();

const input = computed(() => {
  if (props.scenario === 'exact-decimal') {
    return { value: '0.1', min: '0', max: '0.3', low: '0.1', high: '0.2', optimum: '0.15' } as const;
  }
  if (props.scenario === 'degenerate-range') {
    return { value: '7', min: '7', max: '7' } as const;
  }
  return { value: '82', min: '0', max: '100', low: '35', high: '75', optimum: '20' } as const;
});

const state = computed(() => ({ ...input.value, ownership: 'controlled', interaction: 'none' }));
const code = `<MeterRoot value="82" low="35" high="75" optimum="20" label="Storage health">
  <MeterTrack><MeterIndicator /></MeterTrack>
  <MeterValueText />
</MeterRoot>`;
</script>

<template>
  <DemoCard
    :title="title"
    :revision="0"
    :state="state"
    :entries="[]"
    interaction="readonly"
    :code="code"
  >
    <MeterRoot
      v-slot="{ percentage, zone }"
      v-bind="input"
      label="Storage health"
      :format-value="value => `${value} GB used`"
      class="meter-demo"
    >
      <div class="meter-heading">
        <span>
          <strong>Storage health</strong>
          <small>{{ description }}</small>
        </span>
        <MeterValueText class="meter-value" />
      </div>
      <MeterTrack class="meter-track">
        <MeterIndicator class="meter-indicator" />
      </MeterTrack>
      <div class="meter-scale" aria-hidden="true">
        <span>{{ input.min }}</span>
        <span>{{ Math.round(percentage) }}% · {{ zone }}</span>
        <span>{{ input.max }}</span>
      </div>
    </MeterRoot>
  </DemoCard>
</template>
