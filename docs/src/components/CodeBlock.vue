<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ source: string; label?: string }>();
const message = ref('');
watch(() => props.source, () => { message.value = ''; });

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.source.trim());
    message.value = 'Copied';
  } catch {
    message.value = 'Copy unavailable. Select the code to copy it.';
  }
}
</script>

<template>
  <div class="docs-code-section">
    <div class="docs-code-section__header">
      <span>{{ label ?? 'Code' }}</span>
      <button type="button" @click="copy">Copy code</button>
    </div>
    <pre tabindex="0" :aria-label="label ?? 'Code'"><code>{{ source.trim() }}</code></pre>
    <p v-if="message" class="docs-code-message" role="status">{{ message }}</p>
  </div>
</template>
