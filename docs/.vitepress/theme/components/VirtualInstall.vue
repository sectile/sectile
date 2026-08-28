<script setup lang="ts">
import { computed } from 'vue';
import { useHostPreference, type Host } from '../host-preference.js';
import HostCode from './HostCode.vue';

const commands: Readonly<Record<Host, string>> = Object.freeze({
  core: 'pnpm add @sectile/virtual',
  dom: 'pnpm add @sectile/dom @sectile/virtual',
  terminal: 'pnpm add @sectile/virtual',
  vue: 'pnpm add vue @sectile/vue @sectile/virtual',
});

const { host } = useHostPreference();
const sources = computed(() => ({ [host.value]: commands[host.value] }));
</script>

<template>
  <HostCode
    :sources="sources"
    :languages="{ core: 'sh', dom: 'sh', terminal: 'sh', vue: 'sh' }"
  />
</template>
