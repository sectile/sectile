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
  <div class="transition-dialog-demo">
    <DialogRoot v-model:open="open">
      <DialogTrigger class="transition-dialog-demo__button">Open transition dialog</DialogTrigger>
      <DialogPortal>
        <DialogOverlay class="transition-dialog-demo__overlay" />
        <DialogContent class="transition-dialog-demo__content">
          <DialogTitle>Delivery preferences</DialogTitle>
          <DialogDescription>
            Close this dialog to see its exit transition. Open it again before the fade ends to test
            retained reopening.
          </DialogDescription>
          <DialogClose class="transition-dialog-demo__button">Close preferences</DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
    <output aria-live="polite">Open: {{ open }}</output>
  </div>
</template>
