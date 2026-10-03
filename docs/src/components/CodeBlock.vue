<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { CodeLanguage, CodeToken } from '../code-highlighting.js';
import { codePresentation } from '../code-disclosure.js';
import CopyButton from './CopyButton.vue';

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
</script>

<template>
  <div class="docs-code-section">
    <details class="docs-code-disclosure" :open="codeOpen" @toggle="toggleCode">
      <summary>
        <svg class="docs-code-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m4 2 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
        <span class="docs-code-heading"><span class="docs-code-label" :title="label ?? 'Code'">{{ label ?? 'Code' }}</span><span class="docs-code-disclosure__hint">{{ codeOpen ? 'Hide code' : 'Show code' }} · {{ presentation.lineCount }} {{ presentation.lineCount === 1 ? 'line' : 'lines' }}</span></span>
        <CopyButton class="docs-code-copy" :source="source" @copied="message = ''" @error="message = $event" />
      </summary>
      <pre tabindex="0" :aria-label="label ?? 'Code'" :data-language="language"><code><template v-if="tokens"><span v-for="(token, index) in tokens" :key="index" :style="{ color: token.color }">{{ token.content }}</span></template><template v-else>{{ source }}</template></code></pre>
    </details>
    <p v-if="highlightingFailed" class="docs-code-message" role="status">Syntax highlighting unavailable. The source is still readable and can be copied.</p>
    <p v-if="message" class="docs-code-message" role="status">{{ message }}</p>
  </div>
</template>

<style scoped>
.docs-code-disclosure > summary {
  display: flex;
  align-items: center;
  gap: var(--docs-space-2);
  height: var(--docs-code-header-height);
  padding: var(--docs-code-header-inset);
  font-size: var(--docs-font-size-label);
  font-weight: 600;
  cursor: pointer;
}

.docs-code-disclosure > summary::-webkit-details-marker { display: none; }
.docs-code-chevron { flex: none; }
.docs-code-disclosure[open] .docs-code-chevron { transform: rotate(90deg); }
.docs-code-heading {
  flex: 1;
  min-width: 0;
  height: var(--docs-code-header-content-height);
  display: flex;
  align-items: center;
  gap: var(--docs-space-3);
}
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

.docs-code-disclosure[open] > summary {
  box-shadow: inset 0 calc(-1 * var(--docs-border-width)) var(--docs-code-border);
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
  --docs-button-height: var(--docs-code-header-content-height);
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
  .docs-code-disclosure[open] pre {
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
