<script setup lang="ts">
import { ref } from 'vue';
import { SelectContent, SelectItem, SelectItemText, SelectRoot, SelectTrigger, SelectValue, SelectViewport } from '@sectile/vue/select';
const methods = ['Standard', 'Express', 'Drone'];
const method = ref<string | null>('Standard');
</script>

<template>
  <div><SelectRoot v-model="method" :items="methods" :disabled-items="['Drone']" label="Delivery method"><SelectTrigger><SelectValue placeholder="Choose a method" /></SelectTrigger><SelectContent><SelectViewport><SelectItem v-for="item in methods" :key="item" :value="item"><SelectItemText>{{ item }}{{ item === 'Drone' ? ' · unavailable' : '' }}</SelectItemText></SelectItem></SelectViewport></SelectContent></SelectRoot><output aria-live="polite">Delivery: {{ method ?? 'none' }}</output></div>
</template>
