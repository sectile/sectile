<script setup lang="ts">
import { shallowRef } from 'vue';
import { Primitive, type PrimitiveAs } from '@sectile/vue/primitive';

withDefaults(defineProps<{
  as?: PrimitiveAs;
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet';
}>(), { variant: 'secondary', as: 'button', asChild: false });

const element = shallowRef<HTMLElement | null>(null);
function setElement(value: unknown): void { element.value = value as HTMLElement | null; }
defineExpose({ element, focus: (options?: FocusOptions) => element.value?.focus(options) });
</script>

<template>
  <Primitive :as="as" :as-child="asChild" :element-ref="setElement" :type="as === 'button' && !asChild ? 'button' : undefined" class="docs-button" :class="`docs-button--${variant}`"><slot /></Primitive>
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
.docs-button:hover:not(:disabled) { background: var(--docs-hover-bg); }
.docs-button--primary {
  border-color: transparent;
  background: var(--docs-accent);
  color: var(--docs-on-accent);
  font-weight: 600;
}
.docs-button--primary:hover:not(:disabled) { background: var(--docs-accent-hover); }
.docs-button--quiet { border-color: transparent; background: transparent; color: var(--docs-text-muted); }
.docs-button--quiet:hover:not(:disabled) { color: var(--docs-text); }
.docs-button--quiet:focus { outline: none; }
.docs-button--quiet:focus-visible {
  color: var(--docs-text);
  text-decoration: underline;
  text-decoration-thickness: var(--docs-border-width);
  text-underline-offset: 3px;
}
.docs-button:disabled { background: var(--docs-disabled-bg); color: var(--docs-disabled-text); border-color: var(--docs-disabled-border); }
.docs-button--quiet:disabled { border-color: transparent; }
</style>
