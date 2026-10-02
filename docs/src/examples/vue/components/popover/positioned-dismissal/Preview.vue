<script setup lang="ts">
import { ref } from 'vue';
import {
  PopoverClose, PopoverContent, PopoverDescription, PopoverPortal,
  PopoverRoot, PopoverTitle, PopoverTrigger,
} from '@sectile/vue/popover';

const open = ref(false);
</script>

<template>
  <div>
    <PopoverRoot v-model:open="open" side="bottom" align="start" :side-offset="8">
      <PopoverTrigger>Delivery details</PopoverTrigger>
      <PopoverPortal>
        <PopoverContent class="docs-example-popover-content">
          <PopoverTitle>Delivery details</PopoverTitle>
          <PopoverDescription>Updates are delivered to your email address. Click outside or press Escape to dismiss this surface.</PopoverDescription>
          <PopoverClose>Close details</PopoverClose>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
    <output aria-live="polite">Open: {{ open }}</output>
  </div>
</template>
