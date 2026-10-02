<script setup lang="ts">
import { ref } from 'vue';
import { TextField } from '@sectile/vue/text';

const name = ref('Ada');
</script>

<template>
  <div data-example-text-fields>
    <label>Display name<TextField v-model.lazy="name" autocomplete="off" /></label>
    <output aria-live="polite">Committed name: {{ name }}</output>
  </div>
</template>
