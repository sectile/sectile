<script setup lang="ts">
import { computed, ref } from 'vue';
import DemoCard from './DemoCard.vue';
import DemoCascadeList from './DemoCascadeList.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly description: string;
  readonly initialValue?: string | null;
  readonly controlled?: boolean;
  readonly disabledItems?: readonly string[];
}>(), {
  initialValue: null,
  controlled: false,
  disabledItems: () => [],
});

const nodes = [
  { id: 'asia', parentID: null }, { id: 'europe', parentID: null }, { id: 'america', parentID: null },
  { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' }, { id: 'fr', parentID: 'europe' }, { id: 'us', parentID: 'america' },
  { id: 'seoul', parentID: 'kr' }, { id: 'busan', parentID: 'kr' }, { id: 'tokyo', parentID: 'jp' }, { id: 'paris', parentID: 'fr' }, { id: 'nyc', parentID: 'us' },
] as const;
const labels: Readonly<Record<string, string>> = {
  asia: 'Asia', europe: 'Europe', america: 'Americas', kr: 'South Korea', jp: 'Japan', fr: 'France', us: 'United States',
  seoul: 'Seoul', busan: 'Busan', tokyo: 'Tokyo', paris: 'Paris', nyc: 'New York',
};
const value = ref<string | null>(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const bindings = computed(() => ({
  nodes,
  textValue: (id: string) => labels[id] ?? id,
  disabledItems: props.disabledItems,
  ...(props.controlled ? { modelValue: value.value } : { defaultValue: props.initialValue }),
}));
const state = computed(() => ({
  value: value.value,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
  disabledItems: props.disabledItems,
}));
const code = `<script setup lang="ts">
import { CascadeListColumn, CascadeListItem, CascadeListRoot, CascadeListValue } from '@sectile/vue/cascade-list'
const nodes = [{ id: 'asia', parentID: null }, { id: 'kr', parentID: 'asia' }, { id: 'seoul', parentID: 'kr' }]
<\/script>
<template>
  <CascadeListRoot :nodes="nodes" default-value="seoul" label="Destination" v-slot="{ columns }">
    <CascadeListValue placeholder="Choose a destination" />
    <CascadeListColumn v-for="(_, depth) in columns" :key="depth" :depth="depth" v-slot="{ items }">
      <CascadeListItem v-for="item in items" :key="item" :value="item">{{ item }}</CascadeListItem>
    </CascadeListColumn>
  </CascadeListRoot>
</template>`;

function update(next: string | null): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'select',
    accepted: true,
    effects: next === null ? [] : [`select-value id=${next}`],
  }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <div class="cascade-list-demo">
      <p class="demo-copy">{{ description }}</p>
      <DemoCascadeList
        v-bind="bindings"
        label="Destination"
        :column-labels="['Region', 'Country', 'City']"
        :column-count="3"
        placeholder="Choose a destination"
        @update:model-value="update"
      />
    </div>
  </DemoCard>
</template>
