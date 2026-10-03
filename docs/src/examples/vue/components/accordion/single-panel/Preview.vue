<script setup lang="ts">
import { ref } from 'vue';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
  type AccordionValue,
} from '@sectile/vue/accordion';

const sections = ['Delivery', 'Returns'];
const open = ref<AccordionValue>('Delivery');
</script>

<template>
  <div>
    <AccordionRoot v-model="open" :items="sections" type="single" :collapsible="false">
      <AccordionItem value="Delivery">
        <AccordionHeader>
          <AccordionTrigger>
            Delivery
            <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="m4 6 4 4 4-4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>Standard delivery takes three working days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="Returns">
        <AccordionHeader>
          <AccordionTrigger>
            Returns
            <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="m4 6 4 4 4-4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent>Contact support to arrange a return.</AccordionContent>
      </AccordionItem>
    </AccordionRoot>
    <output aria-live="polite">Open panel: {{ open }}</output>
  </div>
</template>
