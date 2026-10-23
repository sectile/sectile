<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { FileInputRoot, FileInputInput, FileInputTrigger, FileInputClear, FileInputDropzone } from '@sectile/vue/form/file-input';
const files = shallowRef<readonly File[]>([]);
const field = useTemplateRef<InstanceType<typeof FileInputRoot>>('field');
function inspect(): void { const input: HTMLInputElement | null = field.value?.input ?? null; void input; field.value?.refresh(); }
</script>
<template>
  <FileInputRoot ref="field" v-model="files" name="attachments" :policy="{ multiple: true, accept: '.txt' }">
    <template #default="state">
      <FileInputInput aria-label="Attachments" />
      <FileInputTrigger>Choose files</FileInputTrigger>
      <FileInputClear>Clear</FileInputClear>
      <FileInputDropzone>Drop files</FileInputDropzone>
      <output>{{ state.files.length }} · {{ state.totalSize }}</output>
    </template>
  </FileInputRoot>
  <button type="button" @click="inspect">Inspect</button>
</template>
