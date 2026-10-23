<script setup lang="ts" generic="Receipt, ID extends string">
import { computed, type ComputedRef } from 'vue';
import { useFileUpload, useFileUploadGroup, type FileUploadAdapter, type FileUploadItem } from '@sectile/vue/form/file-upload';
const props = defineProps<{ file: File; adapter: FileUploadAdapter<File, Receipt>; items: readonly FileUploadItem<ID, File>[]; selectedID: ID }>();
const adapter = computed<FileUploadAdapter<File, Receipt>>(() => props.adapter);
const upload = useFileUpload({ file: () => props.file, adapter });
const receipt: ComputedRef<Receipt | undefined> = computed(() => {
  const state = upload.snapshot.value?.state;
  return state?.status === 'succeeded' ? state.receipt : undefined;
});
const group = useFileUploadGroup({ items: () => props.items, adapter });
const row = group.useItem(() => props.selectedID);
const queried = group.getItem(props.selectedID)?.state;
const queriedReceipt: Receipt | undefined = queried?.status === 'succeeded' ? queried.receipt : undefined;
void queriedReceipt;
const groupReceipt: ComputedRef<Receipt | undefined> = computed(() => row.value?.state.status === 'succeeded' ? row.value.state.receipt : undefined);
</script>
<template>
  <button :disabled="!upload.ready.value" @click="upload.start">Upload</button>
  <output>{{ receipt }}</output>
  <button :disabled="!group.ready.value" @click="group.start([selectedID])">Upload selected</button>
  <output>{{ groupReceipt }}</output>
</template>
