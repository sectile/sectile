<script setup lang="ts">
import { ref } from 'vue';

withDefaults(defineProps<{
  href?: string;
  variant?: 'primary' | 'secondary' | 'quiet';
}>(), { variant: 'secondary' });

const element = ref<HTMLElement>();
defineExpose({ focus: (options?: FocusOptions) => element.value?.focus(options) });
</script>

<template>
  <component :is="href ? 'a' : 'button'" ref="element" :href="href" :type="href ? undefined : 'button'" class="docs-button" :class="`docs-button--${variant}`"><slot /></component>
</template>

<style scoped>
.docs-button {
  display: var(--docs-button-display, inline-flex);
  flex: none;
  align-items: center;
  justify-content: center;
  gap: var(--docs-space-2);
  height: var(--docs-button-height, var(--docs-control-height));
  min-height: 0;
  padding: 0 var(--docs-button-padding, var(--docs-space-4));
  border: var(--docs-border-width) solid var(--docs-control-border);
  border-radius: var(--docs-control-radius);
  background: var(--docs-bg);
  color: var(--docs-text);
  font-size: var(--docs-button-font-size, var(--docs-font-size-label));
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
}
.docs-button:hover:not(:disabled) { background: var(--docs-bg-muted); }
.docs-button--primary {
  border-color: transparent;
  background: var(--docs-accent);
  color: var(--docs-on-accent);
  font-weight: 600;
}
.docs-button--primary:hover:not(:disabled) { background: var(--docs-accent-hover); }
.docs-button--quiet { border-color: transparent; background: transparent; color: var(--docs-text-muted); }
.docs-button--quiet:hover:not(:disabled) { border-color: var(--docs-control-border); color: var(--docs-text); }
.docs-button:disabled { background: var(--docs-disabled-bg); color: var(--docs-disabled-text); border-color: var(--docs-disabled-border); }
</style>
