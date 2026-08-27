<script setup lang="ts">
import { computed, ref } from 'vue';
import DemoCard from './DemoCard.vue'; import type { EventEntry } from '../types.js';
import DemoCascadeSelect from './DemoCascadeSelect.vue';
const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly initialValue?: string | null; readonly controlled?: boolean; readonly disabledItems?: readonly string[]; readonly preview?: boolean }>(), { initialValue: null, controlled: false, disabledItems: () => [], preview: false });
const nodes = [{ id: 'asia', parentID: null }, { id: 'europe', parentID: null }, { id: 'america', parentID: null }, { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' }, { id: 'fr', parentID: 'europe' }, { id: 'us', parentID: 'america' }, { id: 'seoul', parentID: 'kr' }, { id: 'busan', parentID: 'kr' }, { id: 'tokyo', parentID: 'jp' }, { id: 'paris', parentID: 'fr' }, { id: 'nyc', parentID: 'us' }];
const labels: Readonly<Record<string, string>> = { asia: 'Asia', europe: 'Europe', america: 'Americas', kr: 'South Korea', jp: 'Japan', fr: 'France', us: 'United States', seoul: 'Seoul', busan: 'Busan', tokyo: 'Tokyo', paris: 'Paris', nyc: 'New York' };
const value = ref<string | null>(props.initialValue); const open = ref(false); const revision = ref(0); const entries = ref<EventEntry[]>([]);
const bindings = computed(() => ({ nodes, textValue: (id: string) => labels[id] ?? id, disabledItems: props.disabledItems, ...(props.controlled ? { modelValue: value.value } : { defaultValue: props.initialValue }) }));
const state = computed(() => ({ value: value.value, open: open.value, ownership: props.controlled ? 'controlled' : 'uncontrolled', disabledItems: props.disabledItems }));
const code = `<script setup lang="ts">
import { CascadeSelectRoot, CascadeSelectTrigger, CascadeSelectValue, CascadeSelectContent, CascadeSelectColumn, CascadeSelectItem } from '@sectile/vue/cascade-select'
const nodes = [{ id: 'asia', parentID: null }, { id: 'kr', parentID: 'asia' }, { id: 'seoul', parentID: 'kr' }]
<\/script>
<template>
  <CascadeSelectRoot :nodes="nodes" default-value="seoul" v-slot="{ columns }">
    <CascadeSelectTrigger><CascadeSelectValue placeholder="Choose a destination" /></CascadeSelectTrigger>
    <CascadeSelectContent>
      <CascadeSelectColumn v-for="(_, depth) in columns" :key="depth" :depth="depth" v-slot="{ items }">
        <CascadeSelectItem v-for="item in items" :key="item" :value="item">{{ item }}</CascadeSelectItem>
      </CascadeSelectColumn>
    </CascadeSelectContent>
  </CascadeSelectRoot>
</template>`;
function update(next: string | null): void { value.value = next; revision.value += 1; entries.value = [{ revision: revision.value, event: 'select', accepted: true, effects: next === null ? [] : [`select-value id=${next}`] }, ...entries.value].slice(0, 12); }
</script>
<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <div class="cascade-select-demo">
      <p class="demo-copy">{{ description }}</p>
      <DemoCascadeSelect v-bind="bindings" :default-open="preview" label="Destination" :column-labels="['Region', 'Country', 'City']" placeholder="Choose a destination" @update:model-value="update" @update:open="open = $event" />
    </div>
  </DemoCard>
</template>
