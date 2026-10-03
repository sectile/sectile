<script setup lang="ts">
import { ref } from 'vue';
import {
  CheckboxGroupIndicator,
  CheckboxGroupItem,
  CheckboxGroupRoot,
} from '@sectile/vue/checkbox-group';
const channels = ['Email', 'SMS', 'Push'];
const selected = ref<readonly string[]>(['Email']);
</script>

<template>
  <div>
    <CheckboxGroupRoot v-model="selected" :items="channels" label="Notification channels">
      <CheckboxGroupItem v-for="channel in channels" :key="channel" :value="channel">
        <span data-example-checkbox-box>
          <CheckboxGroupIndicator>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="m3 8 3 3 7-7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </CheckboxGroupIndicator>
        </span>
        {{ channel }}
      </CheckboxGroupItem>
    </CheckboxGroupRoot>
    <output aria-live="polite">Channels: {{ selected.join(', ') || 'none' }}</output>
  </div>
</template>
