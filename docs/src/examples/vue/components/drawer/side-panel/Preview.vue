<script setup lang="ts">
import { ref } from 'vue';
import { DrawerClose, DrawerContent, DrawerDescription, DrawerOverlay, DrawerPortal, DrawerRoot, DrawerTitle, DrawerTrigger } from '@sectile/vue/drawer';
const open = ref(false);
</script>

<template>
  <div><DrawerRoot v-model:open="open" side="right"><DrawerTrigger>Open delivery details</DrawerTrigger><DrawerPortal><DrawerOverlay class="docs-example-dialog-overlay" /><DrawerContent class="docs-example-dialog-content docs-example-drawer-content"><DrawerTitle>Delivery details</DrawerTitle><DrawerDescription>Review the delivery service in a side panel. Close the panel to return to its trigger.</DrawerDescription><p>Standard delivery · three working days</p><DrawerClose>Close details</DrawerClose></DrawerContent></DrawerPortal></DrawerRoot><output aria-live="polite">Drawer open: {{ open }}</output></div>
</template>
