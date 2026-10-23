<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { TextField, type TextFieldExpose } from '@sectile/vue/text';
import type { TextFieldExpose as RootTextFieldExpose } from '@sectile/vue';
import { ComboboxRoot, ComboboxEditor, ComboboxContent, ComboboxItem } from '@sectile/vue/combobox';
const field = useTemplateRef<InstanceType<typeof TextField>>('field');
const action: () => TextFieldExpose | RootTextFieldExpose | null = () => field.value;
const clear = () => { const accepted: boolean = action()?.clear() ?? false; return accepted; };
const replace = async () => {
  const current = action(), snapshot = current?.getTextSnapshot();
  if (!current || !snapshot) return;
  const result = await current.replaceText({ snapshot, startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '안녕 ' });
  return result.status === 'accepted' ? result.snapshot.selection.focusCodeUnitOffset : result.reason;
};
void replace;
const query = () => action()?.getTextQuery({ trigger: '@', maxQueryCodeUnits: 32 });
void query;
const value: () => string | number | undefined = () => field.value?.modelValue;
void value;
</script>
<template><ComboboxRoot :items="[{ id: 'ada', label: 'Ada' }]" input-value="Ad" :position="false"><ComboboxEditor><TextField ref="field" default-value="Hi @Ad" @snapshot-change="query" /></ComboboxEditor><ComboboxContent><ComboboxItem value="ada">Ada</ComboboxItem></ComboboxContent></ComboboxRoot><button type="button" @click="clear">Clear</button></template>
