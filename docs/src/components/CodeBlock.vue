<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { CodeLanguage, CodeToken } from '../code-highlighting.js';

const props = withDefaults(defineProps<{ source: string; language: CodeLanguage; label?: string; active?: boolean }>(), { active: true });
const source = computed(() => props.source.trim());
const tokens = shallowRef<readonly CodeToken[]>();
const highlightingFailed = ref(false);
const message = ref('');
watch(() => props.source, () => { message.value = ''; });
let generation = 0;
onScopeDispose(() => { generation++; });

// SSR and initial client markup stay identical. Closed disclosures do not load
// the engine or tokenize hidden snippets. Vue escapes every token as text.
onMounted(() => {
  watch([source, () => props.language, () => props.active], async ([code, language, active]) => {
    const request = ++generation;
    tokens.value = undefined;
    highlightingFailed.value = false;
    if (!active) return;
    try {
      const { highlightCode } = await import('../code-highlighting.js');
      if (request !== generation) return;
      const result = await highlightCode(code, language);
      if (request === generation) tokens.value = result;
    } catch {
      if (request === generation) highlightingFailed.value = true;
    }
  }, { immediate: true });
});

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(source.value);
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
    <pre tabindex="0" :aria-label="label ?? 'Code'" :data-language="language"><code><template v-if="tokens"><span v-for="(token, index) in tokens" :key="index" :style="{ color: token.color }">{{ token.content }}</span></template><template v-else>{{ source }}</template></code></pre>
    <p v-if="highlightingFailed" class="docs-code-message" role="status">Syntax highlighting unavailable. The source is still readable and can be copied.</p>
    <p v-if="message" class="docs-code-message" role="status">{{ message }}</p>
  </div>
</template>
