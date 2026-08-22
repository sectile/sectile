import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const createHighlighter = () => createHighlighterCore({
  themes: [import('@shikijs/themes/dark-plus')],
  langs: [import('@shikijs/langs/vue')],
  engine: createJavaScriptRegexEngine(),
});
let highlighterPromise;

export async function highlightVue(code) {
  highlighterPromise ??= createHighlighter();
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code, {
    lang: 'vue',
    theme: 'dark-plus',
  });
}
