import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createMarkdownRenderer } from 'vitepress';
import { resolveVueCodeLanguage } from '../.vitepress/code-language.mjs';
import {
  isVueTemplateFragment,
  vueTemplateFencePlugin,
} from '../.vitepress/markdown/vue-template-fences.mjs';
import { renderCodeSource } from '../.vitepress/theme/code-rendering.ts';

const docsRoot = fileURLToPath(new URL('../', import.meta.url));
const codeFence = (source) => ['```vue', source, '```'].join('\n');

test('Vue template fragments use the Vue HTML grammar', async () => {
  const source = `<FormRoot v-bind="submission">
  <!-- fields -->
  <FormSubmit :disabled="submissionStatus === 'submitting'">
    {{ submissionStatus === 'submitting' ? 'Saving' : 'Save' }}
  </FormSubmit>
</FormRoot>`;
  const markdown = await createMarkdownRenderer(docsRoot, {
    theme: { dark: 'github-dark-default', light: 'github-light-default' },
    lineNumbers: true,
    config: vueTemplateFencePlugin,
  });

  const rendered = markdown.render(codeFence(source));

  assert.equal(isVueTemplateFragment('vue', source), true);
  assert.equal(isVueTemplateFragment('vue:no-line-numbers', source), true);
  assert.match(rendered, /class="language-template(?:\s|")/u);
  assert.match(rendered, /<span class="lang">template<\/span>/u);
  assert.match(rendered, />FormSubmit<\/span>/u);
  assert.match(rendered, />disabled<\/span>/u);
  assert.doesNotMatch(rendered, /class="language-vue(?:\s|")/u);
});

test('complete Vue SFC fences keep the Vue SFC grammar', async () => {
  const source = `<script setup lang="ts">
const dirty = true
</script>

<template>
  <p v-if="dirty">Unsaved changes.</p>
</template>`;
  const markdown = await createMarkdownRenderer(docsRoot, {
    theme: { dark: 'github-dark-default', light: 'github-light-default' },
    lineNumbers: true,
    config: vueTemplateFencePlugin,
  });
  const rendered = markdown.render(codeFence(source));

  assert.equal(isVueTemplateFragment('vue', source), false);
  assert.equal(isVueTemplateFragment('html', '<FormRoot />'), false);
  assert.equal(resolveVueCodeLanguage('vue', source), 'vue');
  assert.match(rendered, /class="language-vue(?:\s|")/u);
});

test('Vue host script fragments use the TypeScript grammar', async () => {
  const source = `const submission = useFormSubmission({
  initialValues: { name: '' },
})`;
  const markdown = await createMarkdownRenderer(docsRoot, {
    theme: { dark: 'github-dark-default', light: 'github-light-default' },
    lineNumbers: true,
    config: vueTemplateFencePlugin,
  });

  const rendered = markdown.render(codeFence(source));

  assert.equal(resolveVueCodeLanguage('vue', source), 'ts');
  assert.equal(resolveVueCodeLanguage('typescript', source), 'typescript');
  assert.match(rendered, /class="language-ts(?:\s|")/u);
  assert.match(rendered, /<span class="lang">ts<\/span>/u);
  assert.doesNotMatch(rendered, /class="language-vue(?:\s|")/u);
});

test('template-only SFC blocks keep the Vue SFC grammar', () => {
  const source = `<template>
  <FormRoot />
</template>`;

  assert.equal(resolveVueCodeLanguage('vue', source), 'vue');
});

test('interactive examples highlight Vue template fragments with nested tokens', async () => {
  const rendered = await renderCodeSource(
    '<FormRoot><FormSubmit :disabled="busy">Save</FormSubmit></FormRoot>',
    'vue',
    'github-light-default',
  );

  assert.match(rendered.html, />FormSubmit<\/span>/u);
  assert.match(rendered.html, />disabled<\/span>/u);
});

test('interactive examples format and highlight Vue host script fragments as TypeScript', async () => {
  const rendered = await renderCodeSource(
    'const table = useDataTable({ source: async request => resolve(request) })',
    'vue',
    'github-light-default',
  );

  assert.match(rendered.formatted, /async \(request\) =>/u);
  assert.match(rendered.html, />const<\/span>/u);
});
