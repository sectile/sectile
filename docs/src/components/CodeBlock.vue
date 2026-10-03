<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { CodeLanguage, CodeToken } from '../code-highlighting.js';
import { codePresentation } from '../code-disclosure.js';
import CopyButton from './CopyButton.vue';
import DocsDisclosure from './DocsDisclosure.vue';
import DocsNotice from './DocsNotice.vue';

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

</script>

<template>
  <div class="docs-code-section">
    <DocsDisclosure v-model="codeOpen" class="docs-code-disclosure">
      <template #label><span class="docs-code-label" :title="label ?? 'Code'">{{ label ?? 'Code' }}</span><span class="docs-code-disclosure__hint">{{ codeOpen ? 'Hide code' : 'Show code' }} · {{ presentation.lineCount }} {{ presentation.lineCount === 1 ? 'line' : 'lines' }}</span></template>
      <template #actions><CopyButton class="docs-code-copy" :source="source" @copied="message = ''" @error="message = $event" /></template>
      <pre tabindex="0" :aria-label="label ?? 'Code'" :data-language="language"><code><template v-if="tokens"><span v-for="(token, index) in tokens" :key="index" :style="{ color: token.color }">{{ token.content }}</span></template><template v-else>{{ source }}</template></code></pre>
    </DocsDisclosure>
    <DocsNotice v-if="highlightingFailed" class="docs-code-message" live>Syntax highlighting unavailable. The source is still readable and can be copied.</DocsNotice>
    <DocsNotice v-if="message" class="docs-code-message" live>{{ message }}</DocsNotice>
  </div>
</template>

<style scoped>
.docs-code-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.docs-code-disclosure__hint {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--docs-code-muted);
  font-size: var(--docs-font-size-caption);
  font-weight: 400;
}

.docs-code-section {
  min-width: 0;
  overflow: hidden;
  border: var(--docs-border-width) solid var(--docs-code-border);
  border-radius: var(--docs-radius);
  background: var(--docs-code-bg);
  color: var(--docs-code-text);
}

.docs-code-copy {
  --docs-button-height: var(--docs-disclosure-content-height);
  --docs-button-padding: var(--docs-space-2);
  --docs-button-font-size: var(--docs-font-size-caption);
  --docs-copy-width: calc(var(--docs-space-8) + var(--docs-space-6));
}

.docs-code-section pre {
  max-height: 560px;
  margin: 0;
  overflow: auto;
  padding: var(--docs-space-5);
  font-family: var(--docs-font-mono);
  font-size: var(--docs-font-size-code);
  line-height: 1.75;
  tab-size: 2;
  scrollbar-color: var(--docs-code-control-border) transparent;
}

.docs-code-section pre:focus-visible {
  outline-offset: -3px;
}

.docs-code-section pre code {
  padding: 0;
  background: none;
  color: inherit;
}

.docs-code-message {
  margin: 0;
  padding: 0 var(--docs-space-5) var(--docs-space-4);
  color: var(--docs-code-muted);
  font-size: var(--docs-font-size-caption);
}

@media (max-width: 760px) {
  .docs-code-section pre {
    padding: var(--docs-space-4);
    font-size: var(--docs-font-size-caption);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .docs-code-disclosure[data-state="open"] pre {
    animation: docs-code-reveal var(--docs-motion-reveal) var(--docs-ease-out);
  }
  @keyframes docs-code-reveal {
    from {
      clip-path: inset(0 0 12%);
    }
    to {
      clip-path: inset(0);
    }
  }
}
</style>
