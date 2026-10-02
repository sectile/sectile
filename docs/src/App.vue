<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { areas, areaPath, components, componentPath, examplesFor, findExample, hosts } from './examples/catalog.js';
import { currentPath, currentRoute, handleRouteClick, routeHref, routes } from './router.js';
import CodeBlock from './components/CodeBlock.vue';
import ExampleGallery from './components/ExampleGallery.vue';
import ExamplePage from './components/ExamplePage.vue';
import GuidePage from './components/GuidePage.vue';

const menuOpen = ref(false);
const menuButton = ref<HTMLButtonElement>();
const main = ref<HTMLElement>();
const activeHost = computed(() => hosts.find((host) => host.id === currentRoute.value?.host) ?? hosts[0]);
const activeArea = computed(() => areas.find((area) => area.id === currentRoute.value?.area));
const activeExample = computed(() => findExample(currentRoute.value?.exampleId ?? ''));
const areaExamples = computed(() => activeArea.value ? examplesFor(activeHost.value.id, activeArea.value.id) : []);
const componentRoutes = routes.filter((route) => route.kind === 'component');
const guideRoutes = routes.filter((route) => route.kind === 'guide');
const subjectExamples = computed(() => areaExamples.value.filter((example) => example.subject === currentRoute.value?.subject));
const installation = 'pnpm add @sectile/vue';
const activeComponent = computed(() => components.find((component) => component.subject === currentRoute.value?.subject));
watchEffect(() => { document.title = `${currentRoute.value?.title ?? 'Not found'} · Sectile`; });
watch(currentPath, async () => {
  menuOpen.value = false;
  await nextTick();
  main.value?.focus({ preventScroll: true });
});
function closeMenu(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !menuOpen.value) return;
  menuOpen.value = false;
  menuButton.value?.focus();
}
</script>

<template>
  <a class="docs-skip-link" href="#docs-content">Skip to content</a>
  <div class="docs-shell" @keydown="closeMenu">
    <header class="docs-header">
      <a class="docs-brand" :href="routeHref('/')" @click="handleRouteClick($event, '/')">
        Sectile <span>Docs</span>
      </a>
      <nav class="docs-primary-nav" aria-label="Documentation environments">
        <a :href="routeHref('/vue')" :aria-current="activeHost.id === 'vue' ? 'location' : undefined" @click="handleRouteClick($event, '/vue')">Vue</a>
        <a :href="routeHref('/dom')" :aria-current="activeHost.id === 'dom' ? 'location' : undefined" @click="handleRouteClick($event, '/dom')">DOM</a>
      </nav>
      <button ref="menuButton" class="docs-menu-button" type="button" :aria-expanded="menuOpen" aria-controls="docs-navigation" @click="menuOpen = !menuOpen">{{ menuOpen ? 'Close menu' : 'Menu' }}</button>
    </header>
    <div class="docs-body">
      <aside id="docs-navigation" class="docs-sidebar" :class="{ 'is-open': menuOpen }">
        <nav :aria-label="`${activeHost.label} documentation`">
          <div class="docs-sidebar__group">
            <p class="docs-sidebar__label">{{ activeHost.label }} documentation</p>
            <a class="docs-sidebar__link" :href="routeHref(activeHost.id === 'vue' ? '/' : '/dom')" :aria-current="currentRoute?.kind === 'home' || currentRoute?.kind === 'host' ? 'page' : undefined" @click="handleRouteClick($event, activeHost.id === 'vue' ? '/' : '/dom')">Overview</a>
            <a v-if="activeHost.id === 'vue'" class="docs-sidebar__link" :href="routeHref('/vue/getting-started')" :aria-current="currentPath === '/vue/getting-started' ? 'page' : undefined" @click="handleRouteClick($event, '/vue/getting-started')">Getting started</a>
          </div>
          <div v-if="activeHost.id === 'vue'" class="docs-sidebar__group">
            <p class="docs-sidebar__label">Guides</p>
            <a v-for="route in guideRoutes.filter((route) => route.guide !== 'getting-started')" :key="route.path" class="docs-sidebar__link" :href="routeHref(route.path)" :aria-current="currentPath === route.path ? 'page' : undefined" @click="handleRouteClick($event, route.path)">{{ route.label }}</a>
          </div>
          <div class="docs-sidebar__group">
            <p class="docs-sidebar__label">Explore</p>
            <template v-for="area in areas" :key="area.id">
              <a class="docs-sidebar__link" :class="{ 'is-parent': currentRoute?.area === area.id }" :href="routeHref(areaPath(activeHost.id, area.id))" :aria-current="currentPath === areaPath(activeHost.id, area.id) ? 'page' : undefined" @click="handleRouteClick($event, areaPath(activeHost.id, area.id))">{{ area.label }}<span class="docs-sidebar__count" :aria-label="`${examplesFor(activeHost.id, area.id).length} examples`">{{ examplesFor(activeHost.id, area.id).length }}</span></a>
              <template v-if="activeHost.id === 'vue' && area.id === 'components'">
                <a v-for="route in componentRoutes" :key="route.path" class="docs-sidebar__link docs-sidebar__link--nested" :class="{ 'is-parent': currentPath.startsWith(`${route.path}/`) }" :href="routeHref(route.path)" :aria-current="currentPath === route.path ? 'page' : undefined" @click="handleRouteClick($event, route.path)">{{ route.label }}</a>
              </template>
            </template>
          </div>
        </nav>
        <p class="docs-sidebar__note">Headless components.<br>Your visual system.</p>
      </aside>
      <main id="docs-content" ref="main" class="docs-main" tabindex="-1">
        <article class="docs-page">
          <div class="docs-page__inner">
            <nav v-if="currentRoute && currentRoute.kind !== 'home'" class="docs-breadcrumb" aria-label="Breadcrumb">
              <a :href="routeHref(`/${activeHost.id}`)" @click="handleRouteClick($event, `/${activeHost.id}`)">{{ activeHost.label }}</a>
              <template v-if="activeArea"><span aria-hidden="true">/</span><a :href="routeHref(areaPath(activeHost.id, activeArea.id))" @click="handleRouteClick($event, areaPath(activeHost.id, activeArea.id))">{{ activeArea.label }}</a></template>
              <template v-if="activeExample && activeHost.id === 'vue' && activeArea?.id === 'components'"><span aria-hidden="true">/</span><a :href="routeHref(componentPath(activeExample.subject))" @click="handleRouteClick($event, componentPath(activeExample.subject))">{{ activeExample.subject }}</a></template>
            </nav>
            <template v-if="currentRoute?.kind === 'home' || (currentRoute?.kind === 'host' && activeHost.id === 'vue')">
              <h1 class="docs-home-title">Interaction without<br class="docs-desktop-break" /> a prescribed look.</h1>
              <p class="docs-page__lede">Sectile is a renderer-neutral interaction system. Its headless Vue components handle state, keyboard input, and focus while your application owns the presentation.</p>
              <div class="docs-home-actions"><a class="docs-button" :href="routeHref('/vue/getting-started')" @click="handleRouteClick($event, '/vue/getting-started')">Get started with Vue</a><span>Vue 3.5+</span></div>
              <CodeBlock label="Install in your Vue application" :source="installation" />
              <section class="docs-prose-section">
                <h2>Behavior and appearance, kept separate</h2>
                <p>Compose the parts you need, connect state to your application, and style the elements with your own CSS. Sectile does not supply a theme or replace your visual system.</p>
                <div class="docs-reading-links">
                  <a :href="routeHref('/vue/guides/styling')" @click="handleRouteClick($event, '/vue/guides/styling')"><strong>Styling</strong><span>Classes, component parts, and state attributes</span></a>
                  <a :href="routeHref('/vue/guides/state')" @click="handleRouteClick($event, '/vue/guides/state')"><strong>State ownership</strong><span>Controlled values and component-owned defaults</span></a>
                </div>
              </section>
              <section class="docs-prose-section">
                <h2>Explore the interactions</h2>
                <p>Focused examples show one behavior at a time, with runnable previews and the source behind them.</p>
                <div class="docs-reading-links">
                  <a :href="routeHref('/vue/components/checkbox')" @click="handleRouteClick($event, '/vue/components/checkbox')"><strong>Checkbox</strong><span>Checked state, composition, and styling</span></a>
                  <a :href="routeHref('/vue/components/dialog')" @click="handleRouteClick($event, '/vue/components/dialog')"><strong>Dialog</strong><span>Open state, dismissal, and modal focus</span></a>
                  <a :href="routeHref('/vue/form')" @click="handleRouteClick($event, '/vue/form')"><strong>Form</strong><span>Native fields and validated submission</span></a>
                </div>
              </section>
              <p class="docs-environment-note">Working without Vue? <a :href="routeHref('/dom')" @click="handleRouteClick($event, '/dom')">DOM documentation</a> covers connections to application-owned elements.</p>
            </template>
            <GuidePage v-else-if="currentRoute?.kind === 'guide' && currentRoute.guide" :guide="currentRoute.guide" />
            <template v-else-if="currentRoute?.kind === 'host'">
              <h1>DOM documentation</h1><p class="docs-page__lede">Connect Sectile interaction behavior to elements owned by your application. Each connection has an explicit lifecycle.</p>
              <h2 class="docs-section-heading">Explore the packages</h2>
              <div class="docs-reading-links"><a v-for="area in areas" :key="area.id" :href="routeHref(areaPath('dom', area.id))" @click="handleRouteClick($event, areaPath('dom', area.id))"><strong>{{ area.label }}</strong><span>{{ area.description }}</span></a></div>
            </template>
            <template v-else-if="currentRoute?.kind === 'component' && currentRoute.subject">
              <h1>{{ currentRoute.subject }}</h1><p class="docs-page__lede">{{ activeComponent?.description }}</p>
              <h2 class="docs-section-heading">Examples</h2><ExampleGallery :examples="subjectExamples" />
              <section v-if="activeComponent" class="docs-prose-section">
                <h2>Composition</h2>
                <p>Import <template v-for="(part, index) in activeComponent.parts" :key="part"><span v-if="index">, </span><code>{{ part }}</code></template> from <code>{{ activeComponent.module }}</code>.</p>
                <p v-for="paragraph in activeComponent.composition" :key="paragraph">{{ paragraph }}</p>
                <h2>Interaction</h2>
                <p v-for="paragraph in activeComponent.interaction" :key="paragraph">{{ paragraph }}</p>
              </section>
            </template>
            <template v-else-if="currentRoute?.kind === 'area' && activeArea">
              <h1>{{ activeArea.label }}</h1><p class="docs-page__lede">{{ activeArea.description }}</p>
              <template v-if="activeArea.id === 'form' && activeHost.id === 'vue'"><p class="docs-install-note">Form integration also needs its domain package.</p><CodeBlock label="Terminal · pnpm" source="pnpm add @sectile/vue @sectile/form" /></template>
              <ExampleGallery v-if="areaExamples.length" :examples="areaExamples" />
              <div v-else class="docs-empty-state"><h2>Examples are not documented yet</h2><p>This package area has no runnable {{ activeHost.label }} examples on this site yet. This is a documentation gap, not a statement about package availability.</p><a :href="routeHref(areaPath(activeHost.id, 'components'))" @click="handleRouteClick($event, areaPath(activeHost.id, 'components'))">Browse available component examples</a></div>
            </template>
            <ExamplePage v-else-if="currentRoute?.kind === 'example' && activeExample" :example="activeExample" />
            <template v-else><h1>Page not found</h1><p class="docs-page__lede">This address is not part of the documentation. The overview links to the available guides and examples.</p><a class="docs-next-link" :href="routeHref('/')" @click="handleRouteClick($event, '/')">Return to the overview</a></template>
            <footer class="docs-page-footer">Sectile · {{ activeHost.label }} documentation</footer>
          </div>
        </article>
      </main>
    </div>
  </div>
</template>
