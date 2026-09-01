<script setup lang="ts">
import { computed } from 'vue';
import { useDocsLocale } from '../locale.js';
import source from './FloatingPositionExample.vue?raw';
import ExampleFrame from './ExampleFrame.vue';
import FloatingPositionExample from './FloatingPositionExample.vue';

const { isKorean } = useDocsLocale();
const locale = computed(() => isKorean.value ? 'ko' : 'en');
</script>

<template>
  <ExampleFrame :sources="{ vue: source }" :languages="{ vue: 'vue' }" fixed-host="vue">
    <FloatingPositionExample :locale="locale" />
  </ExampleFrame>
</template>
