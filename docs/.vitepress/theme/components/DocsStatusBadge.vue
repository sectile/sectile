<script setup lang="ts">
withDefaults(defineProps<{
  readonly intent?: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
}>(), {
  intent: 'neutral',
});
</script>

<template>
  <span class="docs-status-badge" :data-intent="intent"><slot /></span>
</template>

<style scoped>
.docs-status-badge {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  border: 1px solid var(--sectile-border-control);
  border-radius: 999px;
  padding: 1px 7px;
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface-subtle);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.docs-status-badge[data-intent='info'] {
  border-color: color-mix(in srgb, var(--sectile-feedback-info) 35%, transparent);
  color: var(--sectile-feedback-info);
  background: color-mix(in srgb, var(--sectile-feedback-info) 10%, transparent);
}

.docs-status-badge[data-intent='success'] {
  border-color: color-mix(in srgb, var(--sectile-feedback-success) 35%, transparent);
  color: var(--sectile-feedback-success);
  background: color-mix(in srgb, var(--sectile-feedback-success) 10%, transparent);
}

.docs-status-badge[data-intent='warning'] {
  border-color: color-mix(in srgb, var(--sectile-feedback-warning) 40%, transparent);
  color: var(--sectile-feedback-warning);
  background: color-mix(in srgb, var(--sectile-feedback-warning) 10%, transparent);
}

.docs-status-badge[data-intent='critical'] {
  border-color: color-mix(in srgb, var(--sectile-feedback-critical) 40%, transparent);
  color: var(--sectile-feedback-critical);
  background: color-mix(in srgb, var(--sectile-feedback-critical) 10%, transparent);
}
</style>
