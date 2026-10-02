<script setup lang="ts">
import { ref } from 'vue';
import { CascadeListRoot, CascadeListColumn, CascadeListItem } from '@sectile/vue/cascade-list';

const selected = ref<string | null>('seoul');
const nodes = [
  { id: 'korea', parentID: null },
  { id: 'japan', parentID: null },
  { id: 'seoul', parentID: 'korea' },
  { id: 'busan', parentID: 'korea' },
  { id: 'tokyo', parentID: 'japan' },
];
const labels: Record<string, string> = { korea: 'Korea', japan: 'Japan', seoul: 'Seoul', busan: 'Busan', tokyo: 'Tokyo' };
const textValue = (id: string) => labels[id] ?? id;
</script>

<template>
  <div data-example-cascade>
    <CascadeListRoot v-slot="choice" v-model="selected" :nodes="nodes" :disabled-items="['busan']" :text-value="textValue" label="Delivery city">
      <div data-example-cascade-columns>
        <CascadeListColumn v-for="(_, depth) in choice.columns" :key="depth" v-slot="column" :depth="depth" :label="depth === 0 ? 'Country' : 'City'">
          <CascadeListItem v-for="id in column.items" :key="id" v-slot="item" :value="id" :disabled="id === 'busan'">
            <span>{{ textValue(id) }}</span><span v-if="item.branch" aria-hidden="true">›</span><span v-if="item.selected" aria-hidden="true">✓</span>
          </CascadeListItem>
        </CascadeListColumn>
      </div>
    </CascadeListRoot>
    <output aria-live="polite">Delivery city: {{ selected ? textValue(selected) : 'none' }}</output>
    <p>Country branches open the next column; choosing an available city commits a leaf value. Busan is disabled. Use the arrow keys to navigate between columns.</p>
  </div>
</template>
