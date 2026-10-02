<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';
</script>

<template>
  <div>
    <CheckboxRoot v-slot="state" :default-value="true">
      <span data-example-checkbox-box aria-hidden="true">
        <CheckboxIndicator><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></CheckboxIndicator>
      </span>
      <span>Weekly summary · {{ state.checked ? 'enabled' : 'disabled' }}</span>
    </CheckboxRoot>
  </div>
</template>
