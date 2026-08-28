import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createMarkdownRenderer } from 'vitepress';
import {
  isVueTemplateFragment,
  vueTemplateFencePlugin,
} from '../.vitepress/markdown/vue-template-fences.mjs';

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

test('complete Vue SFC fences keep the Vue SFC grammar', () => {
  const source = `<script setup lang="ts">
const dirty = true
</script>

<template>
  <p v-if="dirty">Unsaved changes.</p>
</template>`;

  assert.equal(isVueTemplateFragment('vue', source), false);
  assert.equal(isVueTemplateFragment('html', '<FormRoot />'), false);
});
