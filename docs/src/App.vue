<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import {
  areas,
  areaPath,
  examplesFor,
  findExample,
  hosts,
} from './examples/catalog.js';
import { runtimeFor } from './examples/runtime.js';
import {
  currentPath,
  currentRoute,
  handleRouteClick,
  routeHref,
  routes,
} from './router.js';

const hostRoutes = routes.filter((route) => route.kind === 'host');
const activeHost = computed(() => hosts.find((host) => host.id === currentRoute.value?.host));
const activeArea = computed(() => areas.find((area) => area.id === currentRoute.value?.area));
const activeExample = computed(() => currentRoute.value?.exampleId === undefined
  ? undefined
  : findExample(currentRoute.value.exampleId));
const activeRuntime = computed(() => activeExample.value === undefined
  ? undefined
  : runtimeFor(activeExample.value));
const areaExamples = computed(() => currentRoute.value?.host === undefined || currentRoute.value?.area === undefined
  ? []
  : examplesFor(currentRoute.value.host, currentRoute.value.area));

watchEffect(() => {
  document.title = currentRoute.value?.title
    ? `${currentRoute.value.title} · Sectile`
    : 'Not found · Sectile';
});
</script>

<template>
  <a class="docs-skip-link" href="#docs-content">Skip to content</a>

  <div class="docs-shell">
    <header class="docs-header">
      <a class="docs-brand" :href="routeHref('/')" @click="handleRouteClick($event, '/')">
        Sectile
      </a>

      <nav class="docs-primary-nav" aria-label="Documentation environment">
        <a
          v-for="route in hostRoutes"
          :key="route.path"
          class="docs-primary-nav__link"
          :class="{ 'is-active': currentRoute?.host === route.host }"
          :href="routeHref(route.path)"
          :aria-current="currentPath === route.path ? 'page' : undefined"
          @click="handleRouteClick($event, route.path)"
        >
          {{ route.label }}
        </a>
      </nav>
    </header>

    <div class="docs-body">
      <aside class="docs-sidebar" aria-label="Package navigation">
        <div v-if="activeHost" class="docs-sidebar__group">
          <p class="docs-sidebar__label">Environment</p>
          <p class="docs-sidebar__title">{{ activeHost.label }}</p>
          <a
            v-for="area in areas"
            :key="area.id"
            class="docs-sidebar__link"
            :class="{ 'is-active': currentRoute?.area === area.id }"
            :href="routeHref(areaPath(activeHost.id, area.id))"
            :aria-current="currentRoute?.area === area.id ? 'page' : undefined"
            @click="handleRouteClick($event, areaPath(activeHost.id, area.id))"
          >
            {{ area.label }}
          </a>
        </div>

        <div v-else class="docs-sidebar__group">
          <p class="docs-sidebar__label">Examples</p>
          <p class="docs-sidebar__title">Choose an environment</p>
          <a
            v-for="route in hostRoutes"
            :key="route.path"
            class="docs-sidebar__link"
            :href="routeHref(route.path)"
            @click="handleRouteClick($event, route.path)"
          >
            {{ route.label }}
          </a>
        </div>
      </aside>

      <main id="docs-content" class="docs-main" tabindex="-1">
        <article class="docs-page">
          <div class="docs-page__inner">
            <template v-if="currentRoute?.kind === 'home'">
              <p class="docs-page__eyebrow">Examples</p>
              <h1>Choose your environment</h1>
              <p class="docs-page__lede">
                Vue and DOM examples are documented separately. Each area is organized around focused, runnable situations rather than long package walkthroughs.
              </p>
              <div class="docs-choice-grid">
                <a
                  v-for="route in hostRoutes"
                  :key="route.path"
                  class="docs-choice-card"
                  :href="routeHref(route.path)"
                  @click="handleRouteClick($event, route.path)"
                >
                  <span class="docs-choice-card__title">{{ route.label }}</span>
                  <span>{{ hosts.find((host) => host.id === route.host)?.description }}</span>
                </a>
              </div>
            </template>

            <template v-else-if="currentRoute?.kind === 'host' && activeHost">
              <p class="docs-page__eyebrow">{{ activeHost.label }}</p>
              <h1>{{ activeHost.label }} examples</h1>
              <p class="docs-page__lede">Choose a package area, then open one focused example.</p>
              <div class="docs-choice-grid">
                <a
                  v-for="area in areas"
                  :key="area.id"
                  class="docs-choice-card"
                  :href="routeHref(areaPath(activeHost.id, area.id))"
                  @click="handleRouteClick($event, areaPath(activeHost.id, area.id))"
                >
                  <span class="docs-choice-card__title">{{ area.label }}</span>
                  <span>{{ area.description }}</span>
                  <small>{{ examplesFor(activeHost.id, area.id).length }} examples</small>
                </a>
              </div>
            </template>

            <template v-else-if="currentRoute?.kind === 'area' && activeHost && activeArea">
              <p class="docs-page__eyebrow">{{ activeHost.label }} · {{ activeArea.label }}</p>
              <h1>{{ activeArea.label }}</h1>
              <p class="docs-page__lede">{{ activeArea.description }}</p>

              <div v-if="areaExamples.length > 0" class="docs-example-grid">
                <a
                  v-for="example in areaExamples"
                  :key="example.id"
                  class="docs-example-card"
                  :href="routeHref(`/${example.host}/${example.area}/${example.slug}`)"
                  @click="handleRouteClick($event, `/${example.host}/${example.area}/${example.slug}`)"
                >
                  <div class="docs-example-card__thumbnail" aria-hidden="true">
                    <span>{{ example.subject }}</span>
                    <strong>{{ example.focus }}</strong>
                  </div>
                  <div class="docs-example-card__body">
                    <p>{{ example.subject }}</p>
                    <h2>{{ example.title }}</h2>
                    <span>{{ example.description }}</span>
                    <ul class="docs-tag-list" aria-label="Example topics">
                      <li v-for="tag in example.tags" :key="tag">{{ tag }}</li>
                    </ul>
                  </div>
                </a>
              </div>

              <div v-else class="docs-empty-state">
                <strong>No examples yet</strong>
                <span>This area is ready for focused examples without changing the navigation structure.</span>
              </div>
            </template>

            <template v-else-if="currentRoute?.kind === 'example' && activeExample && activeRuntime">
              <p class="docs-page__eyebrow">{{ activeHost?.label }} · {{ activeArea?.label }} · {{ activeExample.subject }}</p>
              <h1>{{ activeExample.title }}</h1>
              <p class="docs-page__lede">{{ activeExample.description }}</p>

              <section class="docs-example-detail" aria-labelledby="preview-title">
                <div class="docs-example-detail__heading">
                  <div>
                    <p class="docs-page__eyebrow">Preview</p>
                    <h2 id="preview-title">{{ activeExample.focus }}</h2>
                  </div>
                  <span class="docs-example-kind">{{ activeExample.kind }}</span>
                </div>

                <div class="docs-preview" :class="`docs-preview--${activeExample.fixture}`">
                  <component :is="activeRuntime.preview" />
                </div>

                <div class="docs-example-focus">
                  <strong>This example isolates</strong>
                  <span>{{ activeExample.focus }}</span>
                  <ul class="docs-tag-list" aria-label="Focused APIs">
                    <li v-for="tag in activeExample.tags" :key="tag">{{ tag }}</li>
                  </ul>
                </div>

                <details class="docs-code-disclosure">
                  <summary>Relevant code</summary>
                  <div class="docs-code-stack">
                    <section v-for="section in activeRuntime.code" :key="section.label" class="docs-code-section">
                      <div class="docs-code-section__header">
                        <span>{{ section.label }}</span>
                        <code>{{ section.language }}</code>
                      </div>
                      <pre><code>{{ section.source.trim() }}</code></pre>
                    </section>
                  </div>
                </details>
              </section>
            </template>

            <template v-else>
              <p class="docs-page__eyebrow">404</p>
              <h1>Page not found</h1>
              <p class="docs-page__lede">This route is not part of this documentation environment.</p>
              <a class="docs-text-link" :href="routeHref('/')" @click="handleRouteClick($event, '/')">Return home</a>
            </template>
          </div>
        </article>
      </main>
    </div>
  </div>
</template>
