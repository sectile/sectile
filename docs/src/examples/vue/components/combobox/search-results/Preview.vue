<script setup lang="ts">
import { ref } from 'vue';
import { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxRoot } from '@sectile/vue/combobox';
const members = [{ id: 'ada', label: 'Ada' }, { id: 'grace', label: 'Grace' }, { id: 'linus', label: 'Linus' }];
const member = ref<string | null>(null);
const search = ref('');
</script>

<template>
  <div><ComboboxRoot v-model="member" v-model:input-value="search" :items="members" label="Assign a member"><ComboboxInput placeholder="Search members" /><ComboboxContent><ComboboxItem v-for="item in members" :key="item.id" :value="item.id">{{ item.label }}</ComboboxItem><ComboboxEmpty>No matching members.</ComboboxEmpty></ComboboxContent></ComboboxRoot><output aria-live="polite">Member: {{ member ?? 'none' }}</output><p>Type a name, move through matches with arrow keys, and accept a member with Enter.</p></div>
</template>
