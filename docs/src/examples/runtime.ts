import type { Component } from 'vue';
import type { ExampleDefinition } from './catalog.js';

export interface ExampleCodeSection {
  readonly label: string;
  readonly language: 'vue' | 'ts';
  readonly source: string;
}

export interface ExampleRuntime {
  readonly preview: Component;
  readonly code: readonly ExampleCodeSection[];
}

const previews = import.meta.glob('./**/Preview.vue', {
  eager: true,
  import: 'default',
}) as Record<string, Component>;

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
    return { label: section.label, language: section.language, source };
  });

  return { preview, code };
}
