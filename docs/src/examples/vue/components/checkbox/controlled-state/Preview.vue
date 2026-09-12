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
        <CheckboxIndicator>✓</CheckboxIndicator>
      </span>
      <span>Deployment notifications</span>
    </CheckboxRoot>
    <p>Application value: {{ checked }}</p>
  </div>
</template>
