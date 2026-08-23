<script setup lang="ts">
import { computed } from 'vue';
import { type Host, useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';
import HostCode from './HostCode.vue';

const commands: Readonly<Record<Host, string>> = Object.freeze({
  core: 'pnpm add @sectile/core',
  dom: 'pnpm add @sectile/dom',
  terminal: 'pnpm add @sectile/terminal',
  vue: 'pnpm add @sectile/vue',
});

const { host } = useHostPreference();
const { isKorean } = useDocsLocale();
const sources = computed(() => ({ [host.value]: commands[host.value] }));
const note = computed(() => {
  if (host.value !== 'vue') return null;
  return isKorean.value
    ? 'Vue 패키지는 아직 배포 전이며 현재 작업 공간에서만 미리 사용할 수 있습니다.'
    : 'The Vue package is a workspace preview and is not published yet.';
});
</script>

<template>
  <div class="host-install">
    <HostCode :sources="sources" :languages="{ core: 'sh', dom: 'sh', terminal: 'sh', vue: 'sh' }" />
    <p v-if="note" class="host-install__note">{{ note }}</p>
  </div>
</template>
