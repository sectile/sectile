import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogCase = await readFile(
  new URL('../.vitepress/theme/components/CatalogCase.vue', import.meta.url),
  'utf8',
);
const exampleStyles = await readFile(
  new URL('../.vitepress/theme/component-examples.css', import.meta.url),
  'utf8',
);
const catalogCode = await readFile(
  new URL('../.vitepress/theme/catalog-code.ts', import.meta.url),
  'utf8',
);
const terminalSessions = await readFile(
  new URL('../.vitepress/theme/terminal-demo-sessions.mjs', import.meta.url),
  'utf8',
);
const terminalExample = await readFile(
  new URL('../.vitepress/theme/components/TerminalComponentExample.vue', import.meta.url),
  'utf8',
);

test('tags input presents one composed, accessible tag editor', () => {
  assert.match(catalogCase, /class="catalog-tags-input"/u);
  assert.match(catalogCase, /label="Project skills"/u);
  assert.match(catalogCase, /:aria-label="`Remove \$\{tags\[index\]\}`"/u);
  assert.match(catalogCase, /<Trash2[^>]+aria-hidden="true"/u);
  assert.doesNotMatch(catalogCase, /max-tags/u);

  assert.match(exampleStyles, /\.catalog-tags-input\s*\{[^}]*flex-wrap:\s*wrap;[^}]*border:\s*1px solid/su);
  assert.match(exampleStyles, /\.catalog-tag-delete\s*\{[^}]*place-items:\s*center;[^}]*border-radius:/su);
});

test('tags input code uses the same Vue composition and labels', () => {
  const source = catalogCode.match(/'tags-input': sfc\([\s\S]*?\n  \),\n  grid:/u)?.[0] ?? '';
  assert.match(source, /@lucide\/vue/u);
  assert.match(source, /label="Project skills"/u);
  assert.match(source, /\['Vue', 'DOM', 'Accessibility'\]/u);
  assert.equal(source.includes('Remove \\${value[index]}'), true);
});

test('generated tags input pages contain only the representative skills example', async () => {
  for (const locale of ['', 'ko/']) {
    const page = await readFile(new URL(`../${locale}components/tags-input.md`, import.meta.url), 'utf8');
    assert.equal(page.match(/<ComponentExample component="tags-input"/gu)?.length, 1, locale || 'en');
    assert.doesNotMatch(page, /scenario="limited"/u);
  }
});

test('terminal tags input presents the draft on its own row', () => {
  assert.match(terminalSessions, /`\$\{ansi\.dim\}Draft\$\{ansi\.reset\}  \$\{state\.draft\}\$\{terminalInputCursor\}`/u);
  assert.match(terminalSessions, /state\.draft\}\$\{terminalInputCursor\}/u);
  assert.match(terminalExample, /line\.includes\('\\u001b\[s'\)/u);
  assert.match(terminalExample, /terminal\.write\('\\u001b\[u'\)/u);
  assert.doesNotMatch(terminalSessions, /draft=\$\{state\.draft[^}]*\}  tags=/u);
});
