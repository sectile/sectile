<script setup lang="ts">
import { ref } from 'vue';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger, type AccordionValue } from '@sectile/vue/accordion';

const sections = ['Delivery', 'Returns'];
const open = ref<AccordionValue>(['Delivery']);
</script>

<template>
  <div>
    <AccordionRoot v-model="open" :items="sections" type="multiple">
      <AccordionItem value="Delivery">
        <AccordionHeader><AccordionTrigger>Delivery</AccordionTrigger></AccordionHeader>
        <AccordionContent>Standard delivery takes three working days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="Returns">
        <AccordionHeader><AccordionTrigger>Returns</AccordionTrigger></AccordionHeader>
        <AccordionContent>Contact support to arrange a return.</AccordionContent>
      </AccordionItem>
    </AccordionRoot>
    <output aria-live="polite">Open panels: {{ Array.isArray(open) && open.length ? open.join(', ') : 'none' }}</output>
  </div>
</template>
