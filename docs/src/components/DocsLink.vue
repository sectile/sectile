<script setup lang="ts">
import { shallowRef } from 'vue';
import { Primitive } from '@sectile/vue/primitive';
defineProps<{ href: string }>();
const element = shallowRef<HTMLElement | null>(null);
function setElement(value: unknown): void { element.value = value as HTMLElement | null; }
defineExpose({ element });
</script>

<template>
  <Primitive as="a" :element-ref="setElement" :href="href"><slot /></Primitive>
</template>
