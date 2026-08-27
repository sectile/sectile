<script setup lang="ts">
import { computed } from 'vue';
import { tryCreateMeterGroupState } from '@sectile/core/meter-group';
import {
  MeterGroupIndicator,
  MeterGroupItem,
  MeterGroupItemIndicator,
  MeterGroupItemLabel,
  MeterGroupItemValue,
  MeterGroupList,
  MeterGroupRoot,
  MeterGroupSegment,
  MeterGroupTrack,
  MeterGroupValueText,
  type MeterGroupEntry,
} from '@sectile/vue/meter-group';
import DemoCard from './DemoCard.vue';

const props = defineProps<{
  readonly title: string;
  readonly description: string;
  readonly scenario: string;
}>();

const items = computed<readonly MeterGroupEntry[]>(() => {
  if (props.scenario === 'zero-values') {
    return Object.freeze([
      { id: 'documents', label: 'Documents', value: '42' },
      { id: 'archives', label: 'Archives', value: '0' },
    ]);
  }
  if (props.scenario === 'exact-decimal') {
    return Object.freeze([
      { id: 'documents', label: 'Documents', value: '0.1' },
      { id: 'media', label: 'Media', value: '0.2' },
    ]);
  }
  return Object.freeze([
    { id: 'documents', label: 'Documents', value: '42' },
    { id: 'media', label: 'Media', value: '31' },
    { id: 'archives', label: 'Archives', value: '7' },
  ]);
});
const max = computed(() => props.scenario === 'exact-decimal' ? '0.6' : '100');
const invalidResult = computed(() => props.scenario === 'invalid-input'
  ? tryCreateMeterGroupState({
      max: '100',
      items: [{ id: 'documents', value: '70' }, { id: 'media', value: '40' }],
    })
  : null);
const invalidCode = computed(() => {
  const result = invalidResult.value;
  return result !== null && !result.ok ? result.error.code : null;
});
const state = computed(() => ({
  max: max.value,
  items: items.value.map(({ id, value }) => ({ id, value })),
  validation: invalidCode.value ?? 'valid',
  ownership: 'controlled',
  interaction: 'none',
}));
const code = `<MeterGroupRoot :items="items" max="100" label="Storage capacity">
  <MeterGroupTrack>
    <MeterGroupSegment v-for="item in items" :key="item.id" :id="item.id">
      <MeterGroupIndicator />
    </MeterGroupSegment>
  </MeterGroupTrack>
  <MeterGroupList>…</MeterGroupList>
</MeterGroupRoot>`;
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
    <MeterGroupRoot
      v-slot="{ percentage, remaining, zone }"
      :items="items"
      :max="max"
      label="Storage capacity"
      :format-value="(value, entry) => `${entry.label}: ${value} GB`"
      :format-total="(total, maximum) => `${total} / ${maximum} GB`"
      class="meter-group-demo"
    >
      <div class="meter-group-heading">
        <span>
          <strong>Storage capacity</strong>
          <small>{{ description }}</small>
        </span>
        <MeterGroupValueText class="meter-group-total" />
      </div>
      <MeterGroupTrack class="meter-group-track">
        <MeterGroupSegment
          v-for="item in items"
          :key="item.id"
          :id="item.id"
          class="meter-group-segment"
        >
          <MeterGroupIndicator class="meter-group-indicator" />
        </MeterGroupSegment>
      </MeterGroupTrack>
      <div class="meter-group-scale" aria-hidden="true">
        <span>{{ Math.round(percentage) }}% allocated</span>
        <span>{{ remaining }} GB remaining · {{ zone }}</span>
      </div>
      <MeterGroupList class="meter-group-list">
        <MeterGroupItem
          v-for="item in items"
          :key="item.id"
          :id="item.id"
          class="meter-group-item"
        >
          <MeterGroupItemIndicator class="meter-group-item-indicator" />
          <MeterGroupItemLabel class="meter-group-item-label" />
          <MeterGroupItemValue class="meter-group-item-value" />
        </MeterGroupItem>
      </MeterGroupList>
      <p v-if="invalidCode" class="meter-group-error" role="status">
        Rejected input: {{ invalidCode }}
      </p>
    </MeterGroupRoot>
  </DemoCard>
</template>
