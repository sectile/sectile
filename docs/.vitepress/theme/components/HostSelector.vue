<script setup lang="ts">
import { Code2 } from '@lucide/vue';
import { computed, watch } from 'vue';
import { useRoute, useRouter, withBase } from 'vitepress';
import { hostLabels, hosts, type Host, useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';
import NavPreferenceMenu from './NavPreferenceMenu.vue';

const props = defineProps<{ mobile?: boolean }>();

const { host, setHost } = useHostPreference();
const { isKorean } = useDocsLocale();
const route = useRoute();
const router = useRouter();
const formHosts = ['dom', 'vue'] as const satisfies readonly Host[];
const isFormRoute = computed(() => /(?:^|\/)packages\/form(?:\/|$)/u.test(route.path));
const label = computed(() => isKorean.value ? '연결 방식' : 'Integration');
const ariaLabel = computed(() => isKorean.value ? '문서와 코드 연결 방식' : 'Documentation and code integration');
const options = computed(() => (isFormRoute.value ? formHosts : hosts)
  .map((value) => ({ label: hostLabels[value], value })));

const routeHost = (path: string): Host | null => {
  const match = path.match(/(?:^|\/)packages\/form\/(dom|vue)(?:\/|$)/u);
  const value = match?.[1];
  return value === 'dom' || value === 'vue' ? value : null;
};

watch(
  () => [route.path, host.value] as const,
  ([path, preferred]) => {
    if (!/(?:^|\/)packages\/form(?:\/|$)/u.test(path)) return;
    const scoped = routeHost(path);
    if (scoped !== null && scoped !== preferred) {
      setHost(scoped);
      return;
    }
    if (scoped === null && !formHosts.includes(preferred as 'dom' | 'vue')) setHost('vue');
  },
  { immediate: true },
);

function formTarget(path: string, value: 'dom' | 'vue'): string {
  const localePrefix = /(?:^|\/)ko\/packages\/form(?:\/|$)/u.test(path) ? '/ko' : '';
  const api = /\/packages\/form\/(?:dom|vue)\/api(?:\.html)?$/u.test(path);
  return `${localePrefix}/packages/form/${value}${api ? '/api' : '/'}`;
}

function chooseHost(value: string): void {
  const selected = value as Host;
  setHost(selected);
  if (isFormRoute.value && (selected === 'dom' || selected === 'vue')) {
    void router.go(withBase(formTarget(route.path, selected)));
  }
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
