<script setup lang="ts">
import { ref } from 'vue';
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';

const enabled = ref(false);
</script>

<template>
  <div>
    <SwitchRoot v-model="enabled">
      <span data-example-switch-track><SwitchThumb /></span>
      Email notifications
    </SwitchRoot>
    <output aria-live="polite">Enabled: {{ enabled }}</output>
  </div>
</template>
