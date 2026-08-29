<script setup lang="ts">
import { ref } from 'vue';
import { CircleHelp } from '@lucide/vue';
import {
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
} from '@sectile/vue/tooltip';

const props = withDefaults(defineProps<{
  readonly label: string;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
}>(), { side: 'top', align: 'end' });

const open = ref(false);
</script>

<template>
  <TooltipRoot
    v-model:open="open"
    :label="props.label"
    :side="props.side"
    :align="props.align"
    :side-offset="7"
    :collision-padding="12"
  >
    <TooltipTrigger class="demo-tooltip__trigger" @click="open = true">
      <CircleHelp :size="15" :stroke-width="2.2" aria-hidden="true" />
      <span class="demo-tooltip__visually-hidden">{{ props.label }}</span>
    </TooltipTrigger>
    <TooltipPortal>
      <TooltipContent class="demo-tooltip__content">
        <slot />
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>

<style scoped>
.demo-tooltip__trigger {
  display: inline-grid;
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: .375rem;
  padding: 0;
  color: var(--sectile-content-tertiary);
  background: transparent;
  cursor: help;
}

.demo-tooltip__trigger:hover,
.demo-tooltip__trigger[data-state="open"] {
  color: var(--sectile-content-primary);
  background: var(--sectile-surface-hover);
}

.demo-tooltip__trigger:active {
  background: var(--sectile-surface-selected);
}

.demo-tooltip__trigger:focus-visible {
  color: var(--sectile-content-primary);
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 1px;
}

.demo-tooltip__content {
  z-index: 60;
  box-sizing: border-box;
  width: max-content;
  max-width: min(20rem, var(--sectile-position-available-width, calc(100vw - 1.5rem)));
  overflow-wrap: anywhere;
  border: 1px solid var(--sectile-border-control);
  border-radius: .625rem;
  padding: .7rem .75rem;
  color: var(--sectile-content-primary);
  background: var(--sectile-surface);
  box-shadow: var(--sectile-shadow-floating);
  font-size: .74rem;
  line-height: 1.5;
}

.demo-tooltip__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
