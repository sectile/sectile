<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <input v-bind="$attrs" class="docs-inline-editor" type="text">
</template>

<style scoped>
.docs-inline-editor {
  width: 100%;
  min-width: 0;
  height: 31px;
  border: 1px solid var(--sectile-action);
  border-radius: 7px;
  padding: 0 8px;
  outline: 0;
  color: var(--sectile-content-primary);
  background: var(--sectile-surface);
  font: inherit;
}

.docs-inline-editor:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 1px;
}

.docs-inline-editor[hidden] { display: none; }
</style>
