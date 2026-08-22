<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Code2, Eye } from '@lucide/vue';
import { highlightVue } from '../highlight.js';
import type { EventEntry } from '../types.js';

const props = defineProps<{
  readonly title: string;
  readonly revision: number;
  readonly state: Readonly<Record<string, unknown>>;
  readonly entries: readonly EventEntry[];
  readonly interaction: 'enabled' | 'readonly' | 'disabled';
  readonly code: string;
}>();

const mode = ref<'view' | 'code'>('view');
const highlightedCode = ref<string>();
const highlightedSource = ref<string>();
const serializedState = computed(() => JSON.stringify({
  ...props.state,
  interaction: props.interaction,
}, null, 2));

watch([() => props.code, mode], async ([code, displayMode], _, onCleanup) => {
  if (displayMode !== 'code' || highlightedSource.value === code) return;
  let active = true;
  onCleanup(() => {
    active = false;
  });
  try {
    const html = await highlightVue(code);
    if (active) {
      highlightedCode.value = html;
      highlightedSource.value = code;
    }
  } catch {
    if (active) {
      highlightedCode.value = undefined;
      highlightedSource.value = undefined;
    }
  }
});
</script>

<template>
  <article class="example-card" :data-interaction="interaction">
    <section class="example-main">
      <div class="panel-heading">
        <h2>{{ title }}</h2>
        <div class="panel-heading-actions">
          <div class="view-mode-control" role="group" :aria-label="`${title} display mode`">
            <button
              type="button"
              class="view-mode-button"
              :aria-pressed="mode === 'view'"
              @click="mode = 'view'"
            >
              <Eye :size="13" aria-hidden="true" />
              View
            </button>
            <button
              type="button"
              class="view-mode-button"
              :aria-pressed="mode === 'code'"
              @click="mode = 'code'"
            >
              <Code2 :size="13" aria-hidden="true" />
              Code
            </button>
          </div>
          <span class="badge">revision {{ revision }}</span>
        </div>
      </div>

      <div v-show="mode === 'view'" class="demo-surface">
        <p v-if="interaction !== 'enabled'" class="interaction-note">
          {{ interaction === 'disabled'
            ? 'Disabled: focus, pointer, and keyboard interaction are unavailable.'
            : 'Read-only: focus remains available; value changes are rejected.' }}
        </p>
        <slot />
      </div>
      <div v-show="mode === 'code'" class="demo-code" tabindex="0">
        <div v-if="highlightedCode" v-html="highlightedCode" />
        <pre v-else><code>{{ code }}</code></pre>
      </div>
    </section>

    <aside class="example-inspector">
      <section class="inspector-section">
        <div class="panel-heading"><h2>State</h2></div>
        <pre>{{ serializedState }}</pre>
      </section>

      <section class="inspector-section">
        <div class="panel-heading"><h2>Events &amp; effects</h2></div>
        <ol class="event-log">
          <li v-if="entries.length === 0" class="empty-log">
            Component updates will appear here.
          </li>
          <li v-for="entry in entries" v-else :key="entry.revision" class="event-entry">
            <span class="event-revision">r{{ entry.revision }}</span>
            <div>
              <div class="event-name">
                {{ entry.event }} · {{ entry.accepted ? 'accepted' : 'rejected' }}
              </div>
              <div class="event-effects">
                {{ entry.effects.length === 0 ? 'no effects' : entry.effects.join(', ') }}
              </div>
            </div>
          </li>
        </ol>
      </section>
    </aside>
  </article>
</template>
