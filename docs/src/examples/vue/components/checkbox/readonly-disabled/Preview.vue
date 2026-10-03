<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';

const options = [
  { label: 'Read-only notifications', readonly: true, disabled: false },
  { label: 'Disabled notifications', readonly: false, disabled: true },
];
</script>

<template>
  <div>
    <CheckboxRoot
      v-for="option in options"
      :key="option.label"
      :default-value="true"
      :readonly="option.readonly"
      :disabled="option.disabled"
    >
      <span data-example-checkbox-box aria-hidden="true">
        <CheckboxIndicator>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="m3 8 3 3 7-7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </CheckboxIndicator>
      </span>
      <span>{{ option.label }}</span>
    </CheckboxRoot>
  </div>
</template>
