<script setup lang="ts">
import { ref } from 'vue';
import {
  CascadeSelectRoot,
  CascadeSelectColumn,
  CascadeSelectItem,
  CascadeSelectTrigger,
  CascadeSelectContent,
  CascadeSelectValue,
} from '@sectile/vue/cascade-select';

const selected = ref<string | null>('seoul');
const nodes = [
  { id: 'korea', parentID: null },
  { id: 'japan', parentID: null },
  { id: 'seoul', parentID: 'korea' },
  { id: 'busan', parentID: 'korea' },
  { id: 'tokyo', parentID: 'japan' },
];
const labels: Record<string, string> = {
  korea: 'Korea',
  japan: 'Japan',
  seoul: 'Seoul',
  busan: 'Busan',
  tokyo: 'Tokyo',
};
const textValue = (id: string) => labels[id] ?? id;
</script>

<template>
  <div data-example-cascade>
    <CascadeSelectRoot
      v-slot="choice"
      v-model="selected"
      :nodes="nodes"
      :disabled-items="['busan']"
      :text-value="textValue"
      :position="false"
      label="Delivery city"
    >
      <CascadeSelectTrigger>
        <CascadeSelectValue placeholder="Choose a city" />
        <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </CascadeSelectTrigger>
      <CascadeSelectContent>
        <div data-example-cascade-columns>
          <CascadeSelectColumn
            v-for="(_, depth) in choice.columns"
            :key="depth"
            v-slot="column"
            :depth="depth"
            :label="depth === 0 ? 'Country' : 'City'"
          >
            <CascadeSelectItem
              v-for="id in column.items"
              :key="id"
              v-slot="item"
              :value="id"
              :disabled="id === 'busan'"
            >
              <span>{{ textValue(id) }}</span>
              <span v-if="item.branch" aria-hidden="true">›</span>
              <span v-if="item.selected" aria-hidden="true">✓</span>
            </CascadeSelectItem>
          </CascadeSelectColumn>
        </div>
      </CascadeSelectContent>
    </CascadeSelectRoot>
    <output aria-live="polite">Delivery city: {{ selected ? textValue(selected) : 'none' }}</output>
    <p>
      Country branches open the next column; choosing an available city commits a leaf value. Busan
      is disabled. Use the arrow keys to navigate between columns.
    </p>
  </div>
</template>
