<script setup lang="ts">
import DocsAnchorNav from './DocsAnchorNav.vue';
const topics = [{"to":"#names","label":"Names and descriptions"},{"to":"#keyboard","label":"Keyboard and focus"},{"to":"#feedback","label":"Validation and feedback"},{"to":"#motion","label":"Presentation and motion"},{"to":"#composition","label":"Composition and Presence"},{"to":"#testing","label":"Testing"},{"to":"#component-index","label":"Component reference"}];
import DocsPageHeader from './DocsPageHeader.vue';
import DocsSection from './DocsSection.vue';
import DocsRouteLink from './DocsRouteLink.vue';
import { components, componentPath } from '../examples/catalog.js';
import CodeBlock from './CodeBlock.vue';

const labelExample = `<label for="notification-email">Notification email</label>
<TextField
  id="notification-email"
  v-model="email"
  type="email"
  autocomplete="email"
  aria-describedby="notification-email-help"
/>
<p id="notification-email-help">We send deployment reports to this address.</p>`;
const focusExample = `.control:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 3px;
}

@media (forced-colors: active) {
  .control:focus-visible { outline-color: Highlight; }
}

@media (prefers-reduced-motion: reduce) {
  .popup { animation: none; transition: none; }
}`;
</script>

<template>
  <DocsPageHeader title="Accessibility" description="Sectile projects interaction roles, state and focus behavior. Your application supplies names, instructions, presentation and a usable complete workflow." />
  <DocsAnchorNav :items="topics" label="Accessibility topics" />
  <DocsSection id="names">
    <h2>Name the control, describe the task</h2>
    <p>An accessible name identifies a control; a description explains how to use it. Prefer a visible label connected to a native input. Use <code>aria-labelledby</code> when existing text names a compound control, or <code>aria-label</code> for a control with no suitable visible text, such as an icon-only button.</p>
    <p>Keep the name consistent with the visible label. A placeholder, tooltip, selected value or conditional indicator is not a substitute for the field’s name. Connect help and errors with <code>aria-describedby</code>, using unique IDs that resolve to actual elements.</p>
    <p>This fragment labels TextField using its native input ID. Import TextField from <code>@sectile/vue/text</code> and supply the application-owned <code>email</code> ref.</p>
    <CodeBlock label="Vue · a persistent label and help text" language="vue" :source="labelExample" />
    <p>For dialogs and popovers, render their Title and Description parts, or supply a title label. For collections, name both the group and each choice. Decorative icons should not create duplicate names.</p>
    <p><DocsRouteLink to="https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/">WAI-ARIA accessible-name guidance</DocsRouteLink> explains how native labels and ARIA references contribute to a control’s name.</p>
  </DocsSection>
  <DocsSection id="keyboard">
    <h2>Keyboard interaction is more than shortcuts</h2>
    <p>Tab and Shift+Tab normally move between controls. A composite may use one tab entry and arrow keys internally. Some components move DOM focus between items; Listbox and Combobox retain root/input focus and expose an active descendant. A highlighted item is not necessarily selected.</p>
    <p>Each component reference describes its actual mapping, including activation mode, orientation and RTL behavior. Do not assign a generic ARIA pattern’s full shortcut set to every component. Native browser and assistive-technology commands can differ by platform.</p>
    <p>Align DOM and reading order and avoid positive <code>tabindex</code> values. Keep focus visible and its target mounted during data changes and virtualization. Choose a useful replacement when a focused element is removed. Changing <code>as</code> or <code>asChild</code> must preserve native semantics and keyboard behavior.</p>
    <p>Modal dialogs normally move focus inside, contain Tab navigation and restore the opening control. Non-modal popovers do not make the rest of the page unavailable. Changed autofocus, trapping or restoration policies need an explicit replacement focus path.</p>
    <p>Disabled and readonly differ: disabled prevents interaction and may remove a native control from tab order and submission; readonly prevents changes without necessarily preventing focus. Explain why controls are unavailable. <code>aria-disabled</code> alone does not disable application handlers.</p>
    <p><DocsRouteLink to="https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/">WAI-ARIA keyboard guidance</DocsRouteLink> covers composite focus, focus versus selection and shortcut conflicts.</p>
  </DocsSection>
  <DocsSection id="feedback">
    <h2>Explain changes, errors and waiting</h2>
    <p>Show validation messages in text and connect them to the visible control. Form’s Field parts coordinate labels, descriptions, issues and invalid focus; hidden submission inputs are not substitutes for visible validation targets.</p>
    <p>Keep live announcements concise. Status is suitable for a result that should not interrupt reading; urgent errors may need alert semantics. Do not add a second live region around a component that already announces the same update. Loading, no matches, network failure and retry must be discoverable without relying on a spinner or color.</p>
    <p>Timers intentionally do not announce every tick. Toasts must not be the only home for important instructions. Preserve input after rejected submission and keep focused controls available while asynchronous work is pending.</p>
    <p>Text and Combobox preserve native composition. Application shortcuts must not use an IME composition Enter to submit, commit an editor or accept a result.</p>
  </DocsSection>
  <DocsSection id="motion">
    <h2>Presentation is part of access</h2>
    <p>Distinguish focus, selection, errors and disabled state through more than color. Keep readable text contrast, identifiable control boundaries and usable pointer targets. Check zoom and high-contrast/forced-colors settings instead of depending on subtle shadows or fixed-height text boxes.</p>
    <p>Respect <code>prefers-reduced-motion</code>. Give autoplay a pause/resume control and provide non-drag alternatives for reordering, resizing and chart navigation. Reduced motion must not hide information or postpone focus until an animation finishes.</p>
    <p>This fragment uses application-owned classes and a focus token. Define <code>--app-focus</code> in your palette; Sectile does not ship this stylesheet.</p>
    <CodeBlock label="CSS · visible focus and motion preferences" language="css" :source="focusExample" />
  </DocsSection>
  <DocsSection id="composition">
    <h2>Keep relationships intact through composition</h2>
    <p>Presence coordinates retained rendering for transitions; it does not decide whether content should stay interactive. Integrated popup and conditional parts mark exiting or inactive retained content unavailable. Standalone Presence around custom content still needs your own focus, inert, hidden and announcement policy.</p>
    <p>Closing must end keyboard interaction while exit motion is visible. Restore or move focus before hiding its target. Reopening during exit must make the intended target interactive again. Reduced motion follows the same state and focus rules.</p>
    <p>Portals change DOM ancestry, not the need for names, ownership IDs and a logical focus path. HostProvider direction and IDs must match rendered markup and SSR. Virtual rendering must retain active-descendant targets and editor nodes; removing offscreen content also removes it from the accessibility tree.</p>
    <p>Windowing does not create selection behavior, and a canvas does not expose readable data points. Tables, grids and charts need semantic structure and textual alternatives as part of the application.</p>
  </DocsSection>
  <DocsSection id="testing">
    <h2>Test the assembled workflow</h2>
    <p>Use only a keyboard to enter/leave controls, navigate, edit, cancel, submit invalid data, retry, open nested popups and return from them. Repeat with disabled items, empty lists, long labels, dynamic data, RTL, zoom, forced colors and reduced motion.</p>
    <p>Inspect the browser’s accessibility tree for role, name, state and valid ID references. Test announcements and focus with the screen readers and browsers your audience uses, including NVDA on Windows and VoiceOver on macOS. Test actual Korean or other composition input when users rely on it.</p>
    <p>Rendered ARIA and automated tests are evidence, not a screen-reader guarantee or accessibility certification. Final styling, content, portal layout and data updates need real-environment checks.</p>
  </DocsSection>
  <DocsSection id="component-index">
    <h2>Component reference</h2>
    <p>Every component page includes supported keys, semantics, focus behavior and application responsibilities. Read-only/renderless parts identify when they add no keyboard commands.</p>
    <ul class="docs-accessibility-index"><li v-for="component in components" :key="component.subject"><DocsRouteLink :to="`${componentPath(component.subject)}#accessibility-${component.slug}`">{{ component.subject }}</DocsRouteLink></li></ul>
    <h2>Domain integrations</h2>
    <p>Domain pages include expandable references for their component families alongside the examples.</p>
    <ul><li v-for="area in ['form', 'temporal', 'virtual', 'tabular', 'chart']" :key="area"><DocsRouteLink :to="`${`/vue/${area}`}#accessibility`">{{ area.charAt(0).toUpperCase() + area.slice(1) }} keyboard interaction and accessibility</DocsRouteLink></li></ul>
    <p><DocsRouteLink :to="'/vue/getting-started'">Getting started</DocsRouteLink> covers Vue setup; <DocsRouteLink :to="'/vue/guides/styling'">Styling</DocsRouteLink> explains visible controls around conditional state parts.</p>
  </DocsSection>
</template>

<style scoped>
.docs-accessibility-index { columns: 2; column-gap: var(--docs-space-5); }
.docs-accessibility-index li { break-inside: avoid; margin-bottom: var(--docs-space-2); }
@media (max-width: 480px) { .docs-accessibility-index { columns: 1; } }
</style>
