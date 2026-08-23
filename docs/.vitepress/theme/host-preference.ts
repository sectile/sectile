import { onMounted, ref, watch, type Ref } from 'vue';

export const hosts = ['core', 'dom', 'terminal', 'vue'] as const;
export type Host = typeof hosts[number];

export const hostLabels: Readonly<Record<Host, string>> = Object.freeze({
  core: 'Core',
  dom: 'DOM',
  terminal: 'Terminal',
  vue: 'Vue',
});

const storageKey = 'sectile-docs-host';
const host = ref<Host>('vue');
let initialized = false;

export function useHostPreference(): {
  readonly host: Ref<Host>;
  readonly setHost: (value: Host) => void;
} {
  onMounted(() => {
    if (initialized) return;
    initialized = true;
    const stored = localStorage.getItem(storageKey);
    if (isHost(stored)) host.value = stored;
    watch(host, (value) => localStorage.setItem(storageKey, value));
  });

  return {
    host,
    setHost(value) {
      host.value = value;
    },
  };
}

function isHost(value: string | null): value is Host {
  return value !== null && hosts.some((host) => host === value);
}
