<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HostSelector from './components/HostSelector.vue';

const Layout = DefaultTheme.Layout;
</script>

<template>
  <!--
    THESIS: Sectile makes interaction rules inspectable and actionable; this page rejects the generic feature-card landing page.
    OWN-WORLD: Near-white technical paper, ink text, Sectile violet accents, restrained 11–16px corners, ruled rows, and monospace reserved for live state.
    STORY: Visitors see the behavior model, manipulate it, inspect ownership, rules, effects, and failure handling, then choose a model, component, or install route; formal theory stays advanced.
    FIRST VIEWPORT: A large thesis and primary action sit left of a live single-selection workbench on desktop; small screens stack the thesis, actions, then workbench. Selection updates visible state and requested action.
    FORM: Interactive contract workbench, ranked first and user-pinned; seed 42a60279.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
  -->
  <Layout>
    <template #nav-bar-content-after>
      <div class="docs-preferences">
        <HostSelector />
      </div>
    </template>
    <template #nav-screen-content-after>
      <HostSelector mobile />
    </template>
  </Layout>
</template>
