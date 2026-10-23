<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useImage } from '@sectile/vue/image';

const props = defineProps<{ src?: string }>();
const element = useTemplateRef<HTMLImageElement>('portrait');
const { snapshot, error } = useImage({ element, source: () => props });
</script>

<template>
  <img ref="portrait" :src="src" alt="Profile" />
  <output>{{ snapshot?.status ?? error ?? 'unobserved' }}</output>
</template>
