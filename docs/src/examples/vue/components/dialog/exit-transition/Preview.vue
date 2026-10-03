<script setup lang="ts">
import { ref } from 'vue';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from '@sectile/vue/dialog';
const open = ref(false);
</script>

<template>
  <div class="transition-dialog-demo"><DialogRoot v-model:open="open"><DialogTrigger class="transition-dialog-demo__button">Open transition dialog</DialogTrigger><DialogPortal><DialogOverlay class="transition-dialog-demo__overlay" /><DialogContent class="transition-dialog-demo__content"><DialogTitle>Delivery preferences</DialogTitle><DialogDescription>Close this dialog to see its exit transition. Open it again before the fade ends to test retained reopening.</DialogDescription><DialogClose class="transition-dialog-demo__button">Close preferences</DialogClose></DialogContent></DialogPortal></DialogRoot><output aria-live="polite">Open: {{ open }}</output></div>
</template>

<style scoped>
.transition-dialog-demo__button { min-height: var(--docs-control-height, 44px); padding: 8px 16px; border: 1px solid var(--docs-control-border, #8a8a8a); border-radius: var(--docs-control-radius, 9999px); background: var(--docs-bg, #ffffff); color: var(--docs-text, #171717); font: inherit; font-size: var(--docs-font-size-label, 14px); line-height: 1.5; }
.transition-dialog-demo__overlay { position: fixed; inset: 0; z-index: 50; background: var(--docs-overlay, rgb(0 0 0 / 32%)); opacity: 1; transition: opacity var(--docs-motion-presence, 600ms) var(--docs-ease-out, ease-out); }
.transition-dialog-demo__content { position: fixed; top: 50%; left: 50%; z-index: 51; width: min(440px, calc(100vw - 48px)); max-height: calc(100dvh - 48px); overflow: auto; padding: var(--docs-space-6, 32px); border-radius: var(--docs-radius, 12px); background: var(--docs-bg, #ffffff); color: var(--docs-text, #171717); opacity: 1; transform: translate(-50%, -50%); transition: opacity var(--docs-motion-presence, 600ms) var(--docs-ease-out, ease-out), transform var(--docs-motion-presence, 600ms) var(--docs-ease-out, ease-out); }
.transition-dialog-demo__content [data-part="title"] { margin: 0 0 12px; font-size: var(--docs-font-size-section, 24px); }
.transition-dialog-demo__content [data-part="description"] { margin: 0 0 24px; color: var(--docs-text-muted, #666666); }
.transition-dialog-demo__overlay[data-state="closed"] { opacity: 0; }
.transition-dialog-demo__content[data-state="closed"] { opacity: 0; transform: translate(-50%, calc(-50% + 8px)); }
.transition-dialog-demo output { display: block; margin-top: var(--docs-space-4, 16px); }
@media (prefers-reduced-motion: reduce) { .transition-dialog-demo__overlay, .transition-dialog-demo__content { transition: none; } }
</style>
