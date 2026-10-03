<script setup lang="ts">
import DocsLinkCard from './DocsLinkCard.vue';
import DocsPageHeader from './DocsPageHeader.vue';
import DocsSection from './DocsSection.vue';
import DocsRouteLink from './DocsRouteLink.vue';
import CodeBlock from './CodeBlock.vue';
import AccessibilityGuide from './AccessibilityGuide.vue';
defineProps<{ guide: 'getting-started' | 'styling' | 'state' | 'accessibility' }>();

const installation = 'pnpm add @sectile/vue';
const checkboxImport = `import { CheckboxRoot, CheckboxIndicator } from '@sectile/vue/checkbox';`;
const controlled = `<CheckboxRoot v-model="checked">\n  <CheckboxIndicator />\n  Notifications\n</CheckboxRoot>`;
const uncontrolled = `<CheckboxRoot :default-value="false">\n  <CheckboxIndicator />\n  Notifications\n</CheckboxRoot>`;
</script>

<template>
  <template v-if="guide === 'getting-started'">
    <DocsPageHeader title="Getting started" description="Add headless interaction components to a Vue application. Sectile supplies the behavior; your application supplies the appearance." />
    <DocsSection id="prerequisites">
      <h2>Before you begin</h2>
      <p>You need a Vue 3.5 or later application in the Vue 3 release line, with support for Vue single-file components. These examples use TypeScript and the Composition API.</p>
      <p>Sectile does not ship a component stylesheet or require a global component registration step.</p>
    </DocsSection>
    <DocsSection id="installation">
      <h2>Install the Vue package</h2>
      <p>Add Sectile to your existing application. Vue is a peer dependency, so keep the Vue version already used by your application.</p>
      <CodeBlock label="Terminal · pnpm" language="bash" :source="installation" />
      <p>Import components from their public subpaths. Each subpath groups the parts of one interaction.</p>
      <CodeBlock label="TypeScript" language="ts" :source="checkboxImport" />
    </DocsSection>
    <DocsSection id="first-component">
      <h2>Your first component</h2>
      <p>A checkbox combines a root that manages its checked state with an indicator that appears when selected. With <code>v-model</code>, that state lives in your application.</p>
      <DocsLinkCard :to="'/vue/components/checkbox/controlled-state'" title="Try a controlled checkbox" description="Interactive preview and the complete Vue source" stacked />
    </DocsSection>
    <DocsSection id="next-steps">
      <h2>Make it your own</h2>
      <p><DocsRouteLink :to="'/vue/guides/styling'">Style the component parts</DocsRouteLink> with application CSS, then <DocsRouteLink :to="'/vue/guides/state'">choose where state lives</DocsRouteLink>. Neither choice changes the component import.</p>
      <p>Domain integrations need their matching package too. The <DocsRouteLink :to="'/vue/form'">Form example</DocsRouteLink>, for instance, uses <code>@sectile/vue/form</code> with <code>@sectile/form</code>.</p>
    </DocsSection>
  </template>
  <template v-else-if="guide === 'styling'">
    <DocsPageHeader title="Styling" description="Sectile components are unstyled. Classes and state attributes connect interaction behavior to your application's visual system." />
    <DocsSection>
      <h2>Example styling</h2>
      <p>Behavior examples use shared preview styles that are not included in their source or the published packages. Styling examples include their own CSS. Your application owns colors, spacing, layout, and motion.</p>
    </DocsSection>
    <DocsSection>
      <h2>Style the part that renders</h2>
      <p>Pass a class to the component part that owns the element you want to style. For a checkbox, the root owns the interactive surface, while the indicator represents its selected state.</p>
      <p>Keep the visible checkbox box separate from the conditional indicator. Otherwise, the unchecked control loses its visible outline when the indicator is absent.</p>
      <DocsLinkCard :to="'/vue/components/checkbox/state-styling'" title="Style a checkbox" description="Vue markup and the CSS used by the preview" stacked />
    </DocsSection>
    <DocsSection>
      <h2>Respond to state</h2>
      <p>Checkbox roots expose <code>data-state="checked"</code>, <code>data-state="unchecked"</code>, or <code>data-state="indeterminate"</code>. Use these attributes to change appearance without duplicating the interaction state in a separate class binding.</p>
      <p>Keep keyboard focus visible with <code>:focus-visible</code>. A state color alone should not be the only signal that a control is selected.</p>
    </DocsSection>
    <DocsSection>
      <h2>Style portaled content</h2>
      <p>A dialog portal moves content outside the trigger's DOM ancestry. Apply a class directly to <code>DialogOverlay</code> and <code>DialogContent</code>; a selector that depends on the trigger's parent will not reach them.</p>
    </DocsSection>
  </template>
  <AccessibilityGuide v-else-if="guide === 'accessibility'" />
  <template v-else>
    <DocsPageHeader title="State ownership" description="A component can manage its own state, or reflect state managed by your application. Choose the owner when the component mounts." />
    <DocsSection>
      <h2>Controlled state</h2>
      <p>Use controlled state when another part of your application needs to read or change the value. A checkbox uses <code>modelValue</code> and emits <code>update:modelValue</code>; Vue's <code>v-model</code> connects both.</p>
      <CodeBlock label="Vue · checked is an application ref" language="vue" :source="controlled" />
      <p>Handle updates by changing the supplied value. If the application leaves it unchanged, the component continues to reflect that value.</p>
    </DocsSection>
    <DocsSection>
      <h2>Uncontrolled state</h2>
      <p>Use a default value when the component should own subsequent changes. The default initializes state; it is not a live binding.</p>
      <CodeBlock label="Vue · component-owned state" language="vue" :source="uncontrolled" />
      <p>Keep the ownership mode stable for a mounted component. Do not alternate between an omitted controlled prop and an application-supplied value.</p>
    </DocsSection>
    <DocsSection>
      <h2>Open state uses the same pattern</h2>
      <p>Dialogs use <code>open</code> and <code>update:open</code>. Bind <code>v-model:open</code> for application-owned state, or omit it for component-owned state. <code>defaultOpen</code> supplies an initial value.</p>
      <DocsLinkCard :to="'/vue/components/dialog/controlled-open'" title="Control a dialog" description="Inspect open state, dismissal, and focus return" stacked />
    </DocsSection>
  </template>
</template>
