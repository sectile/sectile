<script setup lang="ts">
import CodeBlock from './CodeBlock.vue';
import { handleRouteClick, routeHref } from '../router.js';

defineProps<{ guide: 'getting-started' | 'styling' | 'state' }>();

const installation = 'pnpm add @sectile/vue';
const checkboxImport = `import { CheckboxRoot, CheckboxIndicator } from '@sectile/vue/checkbox';`;
const controlled = `<CheckboxRoot v-model="checked">\n  <CheckboxIndicator />\n  Notifications\n</CheckboxRoot>`;
const uncontrolled = `<CheckboxRoot :default-value="false">\n  <CheckboxIndicator />\n  Notifications\n</CheckboxRoot>`;
</script>

<template>
  <template v-if="guide === 'getting-started'">
    <h1>Getting started</h1>
    <p class="docs-page__lede">Add headless interaction components to a Vue application. Sectile supplies the behavior; your application supplies the appearance.</p>
    <section id="prerequisites" class="docs-prose-section">
      <h2>Before you begin</h2>
      <p>You need a Vue 3.5 or later application in the Vue 3 release line, with support for Vue single-file components. These examples use TypeScript and the Composition API.</p>
      <p>Sectile does not ship a component stylesheet or require a global component registration step.</p>
    </section>
    <section id="installation" class="docs-prose-section">
      <h2>Install the Vue package</h2>
      <p>Add Sectile to your existing application. Vue is a peer dependency, so keep the Vue version already used by your application.</p>
      <CodeBlock label="Terminal · pnpm" :source="installation" />
      <p>Import components from their public subpaths. Each subpath groups the parts of one interaction.</p>
      <CodeBlock label="TypeScript" :source="checkboxImport" />
    </section>
    <section id="first-component" class="docs-prose-section">
      <h2>Your first component</h2>
      <p>A checkbox combines a root that manages its checked state with an indicator that appears when selected. With <code>v-model</code>, that state lives in your application.</p>
      <a class="docs-next-link" :href="routeHref('/vue/components/checkbox/controlled-state')" @click="handleRouteClick($event, '/vue/components/checkbox/controlled-state')"><strong>Try a controlled checkbox</strong><span>Interactive preview and the complete Vue source</span></a>
      <p>The behavior example omits presentation CSS. Add your own classes, or follow the styling example to build a visible checkbox control.</p>
    </section>
    <section id="next-steps" class="docs-prose-section">
      <h2>Make it your own</h2>
      <p><a :href="routeHref('/vue/guides/styling')" @click="handleRouteClick($event, '/vue/guides/styling')">Style the component parts</a> with application CSS, then <a :href="routeHref('/vue/guides/state')" @click="handleRouteClick($event, '/vue/guides/state')">choose where state lives</a>. Neither choice changes the component import.</p>
      <p>Domain integrations need their matching package too. The <a :href="routeHref('/vue/form')" @click="handleRouteClick($event, '/vue/form')">Form example</a>, for instance, uses <code>@sectile/vue/form</code> with <code>@sectile/form</code>.</p>
    </section>
  </template>
  <template v-else-if="guide === 'styling'">
    <h1>Styling</h1>
    <p class="docs-page__lede">Sectile components are unstyled. Classes and state attributes connect interaction behavior to your application's visual system.</p>
    <section class="docs-prose-section">
      <h2>Style the part that renders</h2>
      <p>Pass a class to the component part that owns the element you want to style. For a checkbox, the root owns the interactive surface, while the indicator represents its selected state.</p>
      <p>Keep the visible checkbox box separate from the conditional indicator. Otherwise, the unchecked control loses its visible outline when the indicator is absent.</p>
      <a class="docs-next-link" :href="routeHref('/vue/components/checkbox/state-styling')" @click="handleRouteClick($event, '/vue/components/checkbox/state-styling')"><strong>Style a checkbox</strong><span>Vue markup and the CSS used by the preview</span></a>
    </section>
    <section class="docs-prose-section">
      <h2>Respond to state</h2>
      <p>Checkbox roots expose <code>data-state="checked"</code>, <code>data-state="unchecked"</code>, or <code>data-state="indeterminate"</code>. Use these attributes to change appearance without duplicating the interaction state in a separate class binding.</p>
      <p>Keep keyboard focus visible with <code>:focus-visible</code>. A state color alone should not be the only signal that a control is selected.</p>
    </section>
    <section class="docs-prose-section">
      <h2>Style portaled content</h2>
      <p>A dialog portal moves content outside the trigger's DOM ancestry. Apply a class directly to <code>DialogOverlay</code> and <code>DialogContent</code>; a selector that depends on the trigger's parent will not reach them.</p>
      <p>The documentation's neutral preview styles are not part of the published package. Your application owns colors, spacing, layout, and motion.</p>
    </section>
  </template>
  <template v-else>
    <h1>State ownership</h1>
    <p class="docs-page__lede">A component can manage its own state, or reflect state managed by your application. Choose the owner when the component mounts.</p>
    <section class="docs-prose-section">
      <h2>Controlled state</h2>
      <p>Use controlled state when another part of your application needs to read or change the value. A checkbox uses <code>modelValue</code> and emits <code>update:modelValue</code>; Vue's <code>v-model</code> connects both.</p>
      <CodeBlock label="Vue · checked is an application ref" :source="controlled" />
      <p>Handle updates by changing the supplied value. If the application leaves it unchanged, the component continues to reflect that value.</p>
    </section>
    <section class="docs-prose-section">
      <h2>Uncontrolled state</h2>
      <p>Use a default value when the component should own subsequent changes. The default initializes state; it is not a live binding.</p>
      <CodeBlock label="Vue · component-owned state" :source="uncontrolled" />
      <p>Keep the ownership mode stable for a mounted component. Do not alternate between an omitted controlled prop and an application-supplied value.</p>
    </section>
    <section class="docs-prose-section">
      <h2>Open state uses the same pattern</h2>
      <p>Dialogs use <code>open</code> and <code>update:open</code>. Bind <code>v-model:open</code> for application-owned state, or omit it for component-owned state. <code>defaultOpen</code> supplies an initial value.</p>
      <a class="docs-next-link" :href="routeHref('/vue/components/dialog/controlled-open')" @click="handleRouteClick($event, '/vue/components/dialog/controlled-open')"><strong>Control a dialog</strong><span>Inspect open state, dismissal, and focus return</span></a>
    </section>
  </template>
</template>
