<script setup lang="ts">
import { ref } from 'vue';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@sectile/vue/dialog';

const open = ref(false);
</script>

<template>
  <div>
    <DialogRoot v-model:open="open">
      <DialogTrigger>Notification settings</DialogTrigger>
      <DialogPortal>
        <DialogOverlay class="docs-example-dialog-overlay" />
        <DialogContent class="docs-example-dialog-content">
          <DialogTitle>Notification settings</DialogTitle>
          <DialogDescription>This modal keeps focus inside until you dismiss it. Press Escape or use the close button.</DialogDescription>
          <DialogClose>Close settings</DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
    <p>Application open state: {{ open }}</p>
  </div>
</template>
