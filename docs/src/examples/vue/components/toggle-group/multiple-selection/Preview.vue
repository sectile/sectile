<script setup lang="ts">
import { ref } from 'vue';
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group';

const formats = ['bold', 'italic', 'underline', 'code'];
const selected = ref<readonly string[]>(['bold']);
</script>

<template>
  <div>
    <ToggleGroupRoot
      v-model="selected"
      :items="formats"
      multiple
      label="Text formatting"
      :disabled-items="['code']"
    >
      <ToggleGroupItem v-for="format in formats" :key="format" :value="format">
        {{ format }}
      </ToggleGroupItem>
    </ToggleGroupRoot>
    <output aria-live="polite">
      Selected: {{ selected.length ? selected.join(', ') : 'none' }}
    </output>
  </div>
</template>
