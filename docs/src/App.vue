<script setup lang="ts">
import DocsPageHeader from './components/DocsPageHeader.vue';
import DocsSection from './components/DocsSection.vue';
import DocsRouteLink from './components/DocsRouteLink.vue';
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { areas, areaPath, components, componentPath, examplesFor, findExample, hosts } from './examples/catalog.js';
import { currentPath, currentRoute } from './router.js';
import CodeBlock from './components/CodeBlock.vue';
import ExampleGallery from './components/ExampleGallery.vue';
import ExamplePage from './components/ExamplePage.vue';
import GuidePage from './components/GuidePage.vue';
import AccessibilityReference from './components/AccessibilityReference.vue';
import { componentAccessibility, domainAccessibility } from './accessibility.js';
import DomainAccessibility from './components/DomainAccessibility.vue';
import DocsButton from './components/DocsButton.vue';
import DocsHeader from './components/DocsHeader.vue';
import DocsSidebar from './components/DocsSidebar.vue';
import DocsBreadcrumbs from './components/DocsBreadcrumbs.vue';
import DocsExampleList from './components/DocsExampleList.vue';
import DocsLinkList from './components/DocsLinkList.vue';
import { DisclosureRoot } from '@sectile/vue/disclosure';

const menuOpen = ref(false);
const header = ref<InstanceType<typeof DocsHeader>>();
const main = ref<HTMLElement>();
const activeHost = computed(() => hosts.find((host) => host.id === currentRoute.value?.host) ?? hosts[0]);
const activeArea = computed(() => areas.find((area) => area.id === currentRoute.value?.area));
const activeExample = computed(() => findExample(currentRoute.value?.exampleId ?? ''));
const areaExamples = computed(() => activeArea.value ? examplesFor(activeHost.value.id, activeArea.value.id) : []);
const subjectExamples = computed(() => areaExamples.value.filter((example) => example.subject === currentRoute.value?.subject));
const installation = 'pnpm add @sectile/vue';
const guides = [{"to":"/vue/guides/styling","title":"Styling","description":"Classes, component parts, and state attributes"},{"to":"/vue/guides/state","title":"State ownership","description":"Controlled values and component-owned defaults"}];
const interactions = [{"to":"/vue/components/checkbox","title":"Checkbox","description":"Checked state, composition, and styling"},{"to":"/vue/components/dialog","title":"Dialog","description":"Open state, dismissal, and modal focus"},{"to":"/vue/form","title":"Form","description":"Native fields and validated submission"}];
const breadcrumbs = computed(() => {
  const items: { to: string; label: string }[] = [{ to: `/${activeHost.value.id}`, label: activeHost.value.label }];
  if (activeArea.value) items.push({ to: areaPath(activeHost.value.id, activeArea.value.id), label: activeArea.value.label });
  if (activeExample.value && activeHost.value.id === 'vue' && activeArea.value?.id === 'components') items.push({ to: componentPath(activeExample.value.subject), label: activeExample.value.subject });
  return items;
});
const activeComponent = computed(() => components.find((component) => component.subject === currentRoute.value?.subject));
watchEffect(() => {
  if (typeof document !== 'undefined') document.title = `${currentRoute.value?.title ?? 'Not found'} · Sectile`;
});
watch(currentPath, async () => {
  menuOpen.value = false;
  await nextTick();
  main.value?.focus({ preventScroll: true });
});
function closeMenu(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !menuOpen.value) return;
  menuOpen.value = false;
  header.value?.focusMenu();
}
</script>

<template>
  <DocsRouteLink class="docs-skip-link" to="#docs-content">Skip to content</DocsRouteLink>
  <DisclosureRoot v-model="menuOpen" content-id="docs-navigation" class="docs-shell" @keydown="closeMenu">
    <DocsHeader ref="header" :active-host="activeHost" :menu-open="menuOpen" />
    <div class="docs-body">
      <DocsSidebar :active-host="activeHost" :menu-open="menuOpen" />
      <main id="docs-content" ref="main" class="docs-main" tabindex="-1">
        <article class="docs-page">
          <div class="docs-page__inner">
            <DocsBreadcrumbs v-if="currentRoute && currentRoute.kind !== 'home'" :items="breadcrumbs" />
            <template v-if="currentRoute?.kind === 'home' || (currentRoute?.kind === 'host' && activeHost.id === 'vue')">
              <h1 class="docs-home-title">Interaction without<br class="docs-desktop-break" /> a prescribed look.</h1>
              <p class="docs-page__lede">Sectile is a renderer-neutral interaction system. Its headless Vue components handle state, keyboard input, and focus while your application owns the presentation.</p>
              <div class="docs-home-actions"><DocsButton variant="primary" as-child><DocsRouteLink to="/vue/getting-started">Get started with Vue</DocsRouteLink></DocsButton><span>Vue 3.5+</span></div>
              <CodeBlock label="Install in your Vue application" language="bash" :source="installation" />
              <DocsSection>
                <h2>Behavior and appearance, kept separate</h2>
                <p>Compose the parts you need, connect state to your application, and style the elements with your own CSS. Sectile does not supply a theme or replace your visual system.</p>
                <DocsLinkList :items="guides" />
              </DocsSection>
              <DocsSection>
                <h2>Explore the interactions</h2>
                <p>Focused examples show one behavior at a time, with runnable previews and the source behind them.</p>
                <DocsLinkList :items="interactions" />
              </DocsSection>
              <p class="docs-environment-note">Working without Vue? <DocsRouteLink :to="'/dom'">DOM documentation</DocsRouteLink> covers connections to application-owned elements.</p>
            </template>
            <GuidePage v-else-if="currentRoute?.kind === 'guide' && currentRoute.guide" :guide="currentRoute.guide" />
            <template v-else-if="currentRoute?.kind === 'host'">
              <DocsPageHeader title="DOM documentation" description="Connect Sectile interaction behavior to elements owned by your application. Each connection has an explicit lifecycle." />
              <h2 class="docs-section-heading">Explore the packages</h2>
              <DocsLinkList :items="areas.map(area => ({ to: areaPath('dom', area.id), title: area.label, description: area.description }))" />
            </template>
            <template v-else-if="currentRoute?.kind === 'component' && currentRoute.subject">
              <DocsPageHeader :title="currentRoute.subject" :description="activeComponent?.description ?? ''" />
              <p><DocsRouteLink :to="`#accessibility-${activeComponent?.slug}`">Keyboard interaction and accessibility</DocsRouteLink></p>
              <DocsExampleList :examples="subjectExamples" />
              <DocsSection v-if="activeComponent">
                <h2>Composition</h2>
                <p>Import <template v-for="(part, index) in activeComponent.parts" :key="part"><span v-if="index">, </span><code>{{ part }}</code></template> from <code>{{ activeComponent.module }}</code>.</p>
                <p v-for="paragraph in activeComponent.composition" :key="paragraph">{{ paragraph }}</p>
                <h2>Interaction</h2>
                <p v-for="paragraph in activeComponent.interaction" :key="paragraph">{{ paragraph }}</p>
              </DocsSection>
              <AccessibilityReference v-if="activeComponent && componentAccessibility[activeComponent.subject]" :id="`accessibility-${activeComponent.slug}`" :reference="componentAccessibility[activeComponent.subject]!" />
              <p><DocsRouteLink :to="'/vue/guides/accessibility'">Accessible names, focus, feedback, motion and testing</DocsRouteLink></p>
            </template>
            <template v-else-if="currentRoute?.kind === 'area' && activeArea">
              <DocsPageHeader :title="activeArea.label" :description="activeArea.description ?? ''" />
              <p v-if="activeHost.id === 'vue' && activeArea.id !== 'components'"><DocsRouteLink to="#accessibility">Keyboard interaction and accessibility</DocsRouteLink></p>
              <template v-if="activeArea.id !== 'components' && activeHost.id === 'vue'"><p class="docs-install-note">This integration also needs its domain package.</p><CodeBlock label="Terminal · pnpm" language="bash" :source="`pnpm add @sectile/vue @sectile/${activeArea.id}`" /></template>
              <template v-if="areaExamples.length && activeHost.id === 'vue' && activeArea.id !== 'components'">
                <DocsExampleList :examples="areaExamples" />
              </template>
              <ExampleGallery v-else-if="areaExamples.length" :examples="areaExamples" :component-index="activeHost.id === 'vue' && activeArea.id === 'components'" />
              <div v-else class="docs-empty-state"><h2>Examples are not documented yet</h2><p>This package area has no runnable {{ activeHost.label }} examples on this site yet. This is a documentation gap, not a statement about package availability.</p><DocsRouteLink :to="areaPath(activeHost.id, 'components')">Browse available component examples</DocsRouteLink></div>
              <DomainAccessibility v-if="activeHost.id === 'vue' && activeArea.id in domainAccessibility" :area="activeArea.id as keyof typeof domainAccessibility" />
            </template>
            <ExamplePage v-else-if="currentRoute?.kind === 'example' && activeExample" :example="activeExample" />
            <template v-else><DocsPageHeader title="Page not found" description="This address is not part of the documentation. The overview links to the available guides and examples." /><DocsRouteLink class="docs-next-link" :to="'/'">Return to the overview</DocsRouteLink></template>
            <footer class="docs-page-footer">Sectile · {{ activeHost.label }} documentation</footer>
          </div>
        </article>
      </main>
    </div>
  </DisclosureRoot>
</template>
