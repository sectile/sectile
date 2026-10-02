<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';

const options = [
  { label: 'Read-only delivery', readonly: true, disabled: false },
  { label: 'Disabled delivery', readonly: false, disabled: true },
];
</script>

<template>
  <div>
    <SwitchRoot v-for="option in options" :key="option.label" :default-value="true" :readonly="option.readonly" :disabled="option.disabled">
      <span data-example-switch-track aria-hidden="true"><SwitchThumb /></span>
      <span>{{ option.label }}</span>
    </SwitchRoot>
  </div>
</template>
