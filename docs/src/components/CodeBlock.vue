<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { CodeLanguage, CodeToken } from '../code-highlighting.js';
import { codePresentation } from '../code-disclosure.js';

const props = withDefaults(defineProps<{ source: string; language: CodeLanguage; label?: string; active?: boolean }>(), { active: true });
const source = computed(() => props.source.trim());
const presentation = computed(() => codePresentation(source.value));
const codeOpen = ref(presentation.value.initiallyOpen);
const tokens = shallowRef<readonly CodeToken[]>();
const highlightingFailed = ref(false);
const message = ref('');
watch(() => props.source, () => { message.value = ''; });
let generation = 0;
onScopeDispose(() => { generation++; });

// SSR and initial client markup stay identical. Closed disclosures do not load
// the engine or tokenize hidden snippets. Vue escapes every token as text.
onMounted(() => {
  watch([source, () => props.language, () => props.active, codeOpen], async ([code, language, active, expanded]) => {
    const request = ++generation;
    tokens.value = undefined;
    highlightingFailed.value = false;
    if (!active || !expanded) return;
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

function toggleCode(event: Event): void {
  codeOpen.value = (event.currentTarget as HTMLDetailsElement).open;
}

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
    <details class="docs-code-disclosure" :open="codeOpen" @toggle="toggleCode">
      <summary><span class="docs-code-label">{{ label ?? 'Code' }}</span><span class="docs-code-disclosure__hint">{{ codeOpen ? 'Hide code' : 'Show code' }} · {{ presentation.lineCount }} {{ presentation.lineCount === 1 ? 'line' : 'lines' }}</span></summary>
      <pre tabindex="0" :aria-label="label ?? 'Code'" :data-language="language"><code><template v-if="tokens"><span v-for="(token, index) in tokens" :key="index" :style="{ color: token.color }">{{ token.content }}</span></template><template v-else>{{ source }}</template></code></pre>
    </details>
    <button class="docs-code-copy" type="button" @click="copy">Copy code</button>
    <p v-if="highlightingFailed" class="docs-code-message" role="status">Syntax highlighting unavailable. The source is still readable and can be copied.</p>
    <p v-if="message" class="docs-code-message" role="status">{{ message }}</p>
  </div>
</template>
