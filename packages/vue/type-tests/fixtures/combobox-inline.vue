<script setup lang="ts">
import { ComboboxRoot, ComboboxInput, ComboboxContent, ComboboxItem, type ComboboxRootProps } from '@sectile/vue/combobox';
const props = defineProps<ComboboxRootProps>();
const mode: 'inline' | 'popup' | undefined = props.presentation;
void mode;
</script>
<template>
  <ComboboxRoot :items="props.items" :rendered-items="props.renderedItems" presentation="inline" :open="true" :item-id="id => 'option-' + id">
    <ComboboxInput aria-label="Commands" aria-controls="commands-results" />
    <ComboboxContent id="commands-results"><ComboboxItem v-for="item in props.items" :key="item.id" :value="item.id">{{ item.label }}</ComboboxItem></ComboboxContent>
  </ComboboxRoot>
</template>
