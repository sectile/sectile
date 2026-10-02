<script setup lang="ts">
import { ref } from 'vue';
import { TextField } from '@sectile/vue/text';

const notes = ref('Leave the parcel at reception.');
</script>

<template>
  <div data-example-text-fields>
    <label>Delivery notes<TextField v-model="notes" multiline :rows="3" placeholder="Add delivery instructions" /></label>
    <output aria-live="polite">Value: {{ notes }}</output>
  </div>
</template>
