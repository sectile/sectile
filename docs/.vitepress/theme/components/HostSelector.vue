<script setup lang="ts">
import { Code2 } from '@lucide/vue';
import { computed } from 'vue';
import { hostLabels, hosts, type Host, useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';
import NavPreferenceMenu from './NavPreferenceMenu.vue';

const props = defineProps<{ mobile?: boolean }>();

const { host, setHost } = useHostPreference();
const { isKorean } = useDocsLocale();
const label = computed(() => isKorean.value ? '예제 환경' : 'Examples');
const ariaLabel = computed(() => isKorean.value ? '코드 예시 실행 환경' : 'Code example environment');
const options = hosts.map((value) => ({ label: hostLabels[value], value }));

function chooseHost(value: string): void {
  setHost(value as Host);
}
</script>

<template>
  <NavPreferenceMenu
    :accessible-label="ariaLabel"
    :current-label="hostLabels[host]"
    :label="label"
    :mobile="props.mobile"
    :model-value="host"
    :options="options"
    @update:model-value="chooseHost"
  >
    <template #icon>
      <Code2 :size="15" aria-hidden="true" />
    </template>
  </NavPreferenceMenu>
</template>
