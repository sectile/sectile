import { defineAsyncComponent, h, type Component } from 'vue';
import type { ExampleDefinition } from './catalog.js';

export interface ExampleCodeSection {
  readonly path: string;
  readonly label: string;
  readonly language: 'vue' | 'ts';
  readonly source: string;
}

export interface ExampleRuntime {
  readonly preview: Component;
  readonly code: readonly ExampleCodeSection[];
}

const loaders = import.meta.glob('./**/Preview.vue', {
  import: 'default',
}) as Record<string, () => Promise<Component>>;

const previews: Record<string, Component> = Object.fromEntries(Object.entries(loaders).map(([path, loader]) => [path, defineAsyncComponent({
  loader,
  delay: 150,
  loadingComponent: { render: () => h('p', { role: 'status' }, 'Loading example…') },
  errorComponent: { render: () => h('p', { role: 'alert' }, 'This example could not be loaded. Reload this page to retry.') },
})]));

const sources = import.meta.glob(['./**/Preview.vue', './**/example.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export function runtimeFor(example: ExampleDefinition): ExampleRuntime {
  const preview = previews[example.previewPath];
  if (preview === undefined) throw new TypeError(`Missing preview module: ${example.previewPath}`);

  const code = example.code.map((section) => {
    const source = sources[section.path];
    if (source === undefined) throw new TypeError(`Missing example source: ${section.path}`);
    return { path: section.path, label: section.label, language: section.language, source };
  });

  return { preview, code };
}
