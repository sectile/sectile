<script setup lang="ts">
import { computed } from 'vue';
import { hostLabels, hosts, type Host, useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';
import HostCode from './HostCode.vue';

const commands: Readonly<Record<Host, string>> = Object.freeze({
  core: 'pnpm add @sectile/core',
  dom: 'pnpm add @sectile/dom',
  terminal: 'pnpm add @sectile/terminal',
  vue: 'pnpm add @sectile/vue',
});

const { host, setHost } = useHostPreference();
const { isKorean } = useDocsLocale();
const sources = computed(() => ({ [host.value]: commands[host.value] }));
const chooserLabel = computed(() => isKorean.value ? '설치할 패키지' : 'Package to install');
</script>

<template>
  <div class="host-install">
    <fieldset class="host-install__chooser">
      <legend>{{ chooserLabel }}</legend>
      <div>
        <button
          v-for="value in hosts"
          :key="value"
          type="button"
          :aria-pressed="host === value"
          @click="setHost(value)"
        >
          {{ hostLabels[value] }}
        </button>
      </div>
    </fieldset>
    <HostCode :sources="sources" :languages="{ core: 'sh', dom: 'sh', terminal: 'sh', vue: 'sh' }" />
  </div>
</template>

<style scoped>
.host-install {
  display: grid;
  gap: 14px;
}

.host-install__chooser {
  min-width: 0;
  margin: 0;
  border: 0;
  padding: 0;
}

.host-install__chooser legend {
  margin-bottom: 9px;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  font-weight: 700;
}

.host-install__chooser > div {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 11px;
  padding: 4px;
  background: var(--vp-c-bg-soft);
}

.host-install__chooser button {
  min-height: 44px;
  border: 0;
  border-radius: 7px;
  padding: 0 12px;
  color: var(--vp-c-text-2);
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 650;
  cursor: pointer;
}

.host-install__chooser button:hover {
  color: var(--vp-c-text-1);
  background: var(--sectile-surface-hover);
}

.host-install__chooser button[aria-pressed='true'] {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 2px 8px rgb(20 27 45 / 0.1);
}

.host-install__chooser button:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .host-install__chooser > div {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
