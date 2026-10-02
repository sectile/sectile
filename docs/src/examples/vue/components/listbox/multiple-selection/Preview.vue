<script setup lang="ts">
import { ref } from 'vue';
import { ListboxItem, ListboxRoot } from '@sectile/vue/listbox';
const destinations = ['Email', 'SMS', 'Push'];
const selected = ref<readonly string[]>(['Email']);
</script>

<template>
  <div><ListboxRoot v-model="selected" :items="destinations" selection-mode="multiple" aria-label="Notification destinations"><ListboxItem v-for="item in destinations" :key="item" :value="item">{{ item }}</ListboxItem></ListboxRoot><output aria-live="polite">Destinations: {{ selected.join(', ') || 'none' }}</output><p>Choose more than one destination. Each item exposes its own selected state.</p></div>
</template>
