<script setup lang="ts">
import { ref } from 'vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';

const checked = ref<CheckboxValue>('indeterminate');
</script>

<template>
  <div>
    <CheckboxRoot v-model="checked">
      <span data-example-checkbox-box aria-hidden="true">
        <CheckboxIndicator v-slot="state">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              v-if="state.isIndeterminate"
              d="M3 8h10"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              v-else
              d="m3 8 3 3 7-7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </CheckboxIndicator>
      </span>
      <span>Some notifications selected</span>
    </CheckboxRoot>
    <button type="button" @click="checked = 'indeterminate'">Restore mixed state</button>
    <output aria-live="polite">Value: {{ checked }}</output>
  </div>
</template>
