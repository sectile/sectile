<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import DocsButton from './DocsButton.vue';

const props = defineProps<{ source: string }>();
const emit = defineEmits<{ copied: []; error: [message: string] }>();
const status = ref<'idle' | 'copied' | 'failed'>('idle');
const failure = 'Copy unavailable. Select the code to copy it.';
let generation = 0;
watch(() => props.source, () => { generation++; status.value = 'idle'; });
onScopeDispose(() => { generation++; });

async function copy(): Promise<void> {
  const request = ++generation;
  try {
    await navigator.clipboard.writeText(props.source);
    if (request !== generation) return;
    status.value = 'copied';
    emit('copied');
  } catch {
    if (request !== generation) return;
    status.value = 'failed';
    emit('error', failure);
  }
}
</script>

<template>
  <DocsButton class="docs-copy-button" variant="quiet" :title="status === 'failed' ? failure : undefined" @click.stop="copy"><span aria-live="polite" aria-atomic="true">{{ status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy code' }}</span></DocsButton>
</template>

<style scoped>
.docs-copy-button { width: var(--docs-copy-width, calc(var(--docs-space-8) + var(--docs-space-7))); }
</style>
