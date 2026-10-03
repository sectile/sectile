<script setup lang="ts">
import { ref } from 'vue';
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group';

const alignments = ['Left', 'Center', 'Right'];
const selected = ref<readonly string[]>(['Left']);
</script>

<template>
  <div>
    <ToggleGroupRoot
      v-model="selected"
      :items="alignments"
      :deselectable="false"
      label="Text alignment"
    >
      <ToggleGroupItem v-for="alignment in alignments" :key="alignment" :value="alignment">
        {{ alignment }}
      </ToggleGroupItem>
    </ToggleGroupRoot>
    <output aria-live="polite">Alignment: {{ selected[0] }}</output>
  </div>
</template>
