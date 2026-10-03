<script setup lang="ts">
import { ref } from 'vue';
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '@sectile/vue/select';
const methods = ['Standard', 'Express', 'Drone'];
const method = ref<string | null>('Standard');
</script>

<template>
  <div>
    <SelectRoot
      v-model="method"
      :items="methods"
      :disabled-items="['Drone']"
      label="Delivery method"
    >
      <SelectTrigger>
        <SelectValue placeholder="Choose a method" />
        <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </SelectTrigger>
      <SelectContent>
        <SelectViewport>
          <SelectItem v-for="item in methods" :key="item" :value="item">
            <SelectItemText>
              {{ item }}{{ item === 'Drone' ? ' · unavailable' : '' }}
            </SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectRoot>
    <output aria-live="polite">Delivery: {{ method ?? 'none' }}</output>
  </div>
</template>
