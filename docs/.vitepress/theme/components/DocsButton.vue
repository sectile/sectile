<script setup lang="ts">
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  readonly appearance?: 'primary' | 'outline' | 'ghost';
  readonly compact?: boolean;
  readonly href?: string;
  readonly iconOnly?: boolean;
  readonly large?: boolean;
}>(), {
  appearance: 'outline',
  compact: false,
  iconOnly: false,
  large: false,
});
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    v-bind="$attrs"
    class="docs-button"
    :href="href"
    :type="href ? undefined : 'button'"
    :data-appearance="appearance"
    :data-compact="compact ? '' : undefined"
    :data-icon-only="iconOnly ? '' : undefined"
    :data-large="large ? '' : undefined"
  >
    <slot />
  </component>
</template>

<style scoped>
.docs-button {
  display: inline-flex;
  min-height: 36px;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--sectile-border-control);
  border-radius: 9px;
  padding: 0 11px;
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface-interactive);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color var(--sectile-motion-standard) var(--sectile-ease-standard),
    color var(--sectile-motion-standard) var(--sectile-ease-standard),
    background var(--sectile-motion-standard) var(--sectile-ease-standard),
    transform var(--sectile-motion-standard) var(--sectile-ease-standard);
}

.docs-button[data-compact] {
  min-height: var(--sectile-control-height-compact);
  border-radius: 8px;
  padding-inline: 10px;
}

.docs-button[data-icon-only] {
  width: 28px;
  min-height: 28px;
  padding: 0;
}

.docs-button[data-large] {
  min-height: 46px;
  border-radius: 11px;
  padding-inline: 17px;
  font-size: 0.94rem;
  font-weight: 680;
}

.docs-button[data-appearance='primary'] {
  border-color: var(--sectile-action);
  color: var(--sectile-content-on-accent);
  background: var(--sectile-action);
}

.docs-button[data-appearance='ghost'] {
  border-color: transparent;
  color: var(--sectile-content-tertiary);
  background: transparent;
}

.docs-button:hover {
  border-color: var(--sectile-border-strong);
  color: var(--sectile-content-primary);
  background: var(--sectile-surface-hover);
}

.docs-button[data-large]:hover {
  transform: translateY(-1px);
}

.docs-button[data-appearance='primary']:hover {
  border-color: var(--sectile-action-hover);
  color: var(--sectile-content-on-accent);
  background: var(--sectile-action-hover);
}

.docs-button:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

.docs-button:disabled {
  border-color: var(--sectile-border-subtle);
  color: var(--sectile-content-disabled);
  background: var(--sectile-surface-disabled);
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .docs-button {
    transition: none;
  }
}
</style>
