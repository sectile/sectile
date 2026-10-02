<script setup lang="ts">
import { ref } from 'vue';
import { AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogPortal, AlertDialogRoot, AlertDialogTitle, AlertDialogTrigger } from '@sectile/vue/alert-dialog';
const archived = ref(false);
</script>

<template>
  <div><AlertDialogRoot><AlertDialogTrigger>Archive delivery request</AlertDialogTrigger><AlertDialogPortal><AlertDialogOverlay class="docs-example-dialog-overlay" /><AlertDialogContent class="docs-example-dialog-content"><AlertDialogTitle>Archive this request?</AlertDialogTitle><AlertDialogDescription>This demonstration changes only the preview state. No request is sent to a server.</AlertDialogDescription><div class="docs-example-popup-actions"><AlertDialogClose>Keep request</AlertDialogClose><AlertDialogClose @click="archived = true">Confirm archive</AlertDialogClose></div></AlertDialogContent></AlertDialogPortal></AlertDialogRoot><output aria-live="polite">Request: {{ archived ? 'archived' : 'active' }}</output></div>
</template>
