<script setup lang="ts">
defineProps<{
  readonly title: string;
  readonly revision: number;
  readonly state: Readonly<Record<string, unknown>>;
  readonly entries: readonly unknown[];
  readonly interaction: 'enabled' | 'readonly' | 'disabled';
  readonly code: string;
}>();
</script>

<template>
  <div class="docs-demo-card">
    <slot />
  </div>
</template>
