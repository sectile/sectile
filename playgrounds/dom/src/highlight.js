import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const createHighlighter = () => createHighlighterCore({
  themes: [import('@shikijs/themes/dark-plus')],
  langs: [import('@shikijs/langs/javascript')],
  engine: createJavaScriptRegexEngine(),
});
let highlighterPromise;

export async function highlightJavaScript(code) {
  highlighterPromise ??= createHighlighter();
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code, {
    lang: 'javascript',
    theme: 'dark-plus',
  });
}
