<script setup lang="ts">
import { ref } from 'vue';
import { CheckCircle2, FileCode2, Folder, Search, SquareTerminal } from '@lucide/vue';
import {
  WindowSplitterHandle,
  WindowSplitterPane,
  WindowSplitterRoot,
} from '@sectile/vue/window-splitter';

const props = defineProps<{
  readonly scenario: string;
}>();

const horizontalSize = ref('34');
const verticalSize = ref('56');
const mixedSidebarSize = ref('28');
const mixedEditorSize = ref('68');
</script>

<template>
  <WindowSplitterRoot
    v-if="props.scenario === 'horizontal'"
    v-model="horizontalSize"
    orientation="horizontal"
    :min="22"
    :max="72"
    :step="1"
    class="window-splitter-demo window-splitter-demo--horizontal"
  >
    <WindowSplitterPane side="before" class="window-splitter-pane window-splitter-pane--navigation">
      <header class="window-splitter-pane__header">
        <strong>Project</strong>
        <Search :size="16" aria-hidden="true" />
      </header>
      <nav aria-label="Project files" class="window-splitter-tree">
        <span><Folder :size="16" aria-hidden="true" /> src</span>
        <span class="is-current"><FileCode2 :size="16" aria-hidden="true" /> App.vue</span>
        <span><FileCode2 :size="16" aria-hidden="true" /> tokens.ts</span>
      </nav>
    </WindowSplitterPane>
    <WindowSplitterHandle class="window-splitter-handle" aria-label="Resize project and editor panes" />
    <WindowSplitterPane side="after" class="window-splitter-pane window-splitter-pane--editor">
      <header class="window-splitter-pane__header"><strong>App.vue</strong><span>Saved</span></header>
      <pre class="window-splitter-code"><code><span>&lt;script setup&gt;</span>
const release = 'stable'

<span>&lt;template&gt;</span>
  &lt;ReleaseCard :channel="release" /&gt;
<span>&lt;/template&gt;</span></code></pre>
    </WindowSplitterPane>
  </WindowSplitterRoot>

  <WindowSplitterRoot
    v-else-if="props.scenario === 'vertical'"
    v-model="verticalSize"
    orientation="vertical"
    :min="32"
    :max="76"
    :step="1"
    class="window-splitter-demo window-splitter-demo--vertical"
  >
    <WindowSplitterPane side="before" class="window-splitter-pane window-splitter-pane--editor">
      <header class="window-splitter-pane__header"><strong>Editor</strong><span>main.ts</span></header>
      <pre class="window-splitter-code window-splitter-code--compact"><code>import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')</code></pre>
    </WindowSplitterPane>
    <WindowSplitterHandle class="window-splitter-handle" aria-label="Resize editor and terminal panes" />
    <WindowSplitterPane side="after" class="window-splitter-pane window-splitter-pane--terminal">
      <header class="window-splitter-pane__header"><span><SquareTerminal :size="15" aria-hidden="true" /> Terminal</span><span>zsh</span></header>
      <p><span class="window-splitter-prompt">$</span> pnpm test <span class="window-splitter-success">18 passed</span></p>
    </WindowSplitterPane>
  </WindowSplitterRoot>

  <WindowSplitterRoot
    v-else
    v-model="mixedSidebarSize"
    orientation="horizontal"
    :min="22"
    :max="46"
    :step="1"
    class="window-splitter-demo window-splitter-demo--horizontal window-splitter-demo--mixed"
  >
    <WindowSplitterPane side="before" class="window-splitter-pane window-splitter-pane--navigation">
      <header class="window-splitter-pane__header"><strong>Workspace</strong><Search :size="16" aria-hidden="true" /></header>
      <nav aria-label="Workspace files" class="window-splitter-tree">
        <span><Folder :size="16" aria-hidden="true" /> components</span>
        <span class="is-current"><FileCode2 :size="16" aria-hidden="true" /> SplitPane.vue</span>
        <span><Folder :size="16" aria-hidden="true" /> tests</span>
      </nav>
    </WindowSplitterPane>
    <WindowSplitterHandle class="window-splitter-handle" aria-label="Resize workspace and main panes" />
    <WindowSplitterPane side="after" class="window-splitter-pane window-splitter-pane--nested">
      <WindowSplitterRoot
        v-model="mixedEditorSize"
        orientation="vertical"
        :min="42"
        :max="78"
        :step="1"
        class="window-splitter-demo window-splitter-demo--vertical window-splitter-demo--nested"
      >
        <WindowSplitterPane side="before" class="window-splitter-pane window-splitter-pane--editor">
          <header class="window-splitter-pane__header"><strong>SplitPane.vue</strong><span>TypeScript</span></header>
          <pre class="window-splitter-code window-splitter-code--compact"><code>const layout = {
  sidebar: {{ mixedSidebarSize }}%,
  editor: {{ mixedEditorSize }}%
}</code></pre>
        </WindowSplitterPane>
        <WindowSplitterHandle class="window-splitter-handle" aria-label="Resize editor and preview panes" />
        <WindowSplitterPane side="after" class="window-splitter-pane window-splitter-pane--preview">
          <span><CheckCircle2 :size="17" aria-hidden="true" /> Preview ready</span>
          <small>Both separators remain independently adjustable.</small>
        </WindowSplitterPane>
      </WindowSplitterRoot>
    </WindowSplitterPane>
  </WindowSplitterRoot>
</template>
