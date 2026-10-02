<script setup lang="ts">
import { ref } from 'vue';
import { Primitive } from '@sectile/vue/primitive';

const activations = ref(0);
</script>

<template>
  <div>
    <Primitive as-child data-example-adopted-button @click="activations++">
      <button type="button">Application-owned button</button>
    </Primitive>
    <output aria-live="polite">Activations: {{ activations }}</output>
    <p>asChild adopts exactly one element and merges attributes and handlers. It does not add a wrapper or invent button behavior; the native button supplies that behavior.</p>
  </div>
</template>
