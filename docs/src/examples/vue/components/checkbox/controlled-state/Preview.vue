<script setup lang="ts">
import { ref } from 'vue';
import {
  CheckboxIndicator,
  CheckboxRoot,
  type CheckboxValue,
} from '@sectile/vue/checkbox';

const checked = ref<CheckboxValue>(false);
</script>

<template>
  <div>
    <CheckboxRoot v-model="checked" aria-label="Deployment notifications">
      <span data-example-checkbox-box aria-hidden="true">
        <CheckboxIndicator>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </CheckboxIndicator>
      </span>
      <span>Deployment notifications</span>
    </CheckboxRoot>
    <p>Application value: {{ checked }}</p>
  </div>
</template>
