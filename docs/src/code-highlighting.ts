import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export type CodeLanguage = 'vue' | 'ts' | 'css' | 'bash';

export interface CodeToken {
  readonly content: string;
  readonly color?: string | undefined;
}

// This module is loaded only when code is requested. One app-owned highlighter
// retains a fixed grammar set; rendered tokens belong to each CodeBlock.
let highlighter: ReturnType<typeof createHighlighterCore> | undefined;
const grammars = {
  bash: () => import('shiki/langs/bash.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  ts: () => import('shiki/langs/typescript.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
};
const loaded: Partial<Record<CodeLanguage, Promise<void>>> = {};

export async function highlightCode(source: string, language: CodeLanguage): Promise<readonly CodeToken[]> {
  highlighter ??= createHighlighterCore({
    langs: [],
    engine: createJavaScriptRegexEngine(),
    themes: [{
      name: 'sectile-docs',
      type: 'dark',
      colors: { 'editor.background': 'var(--docs-code-bg)', 'editor.foreground': 'var(--docs-code-text)' },
      tokenColors: [
        { scope: ['comment'], settings: { foreground: 'var(--docs-code-muted)' } },
        { scope: ['keyword', 'storage'], settings: { foreground: 'var(--docs-code-keyword)' } },
        { scope: ['string'], settings: { foreground: 'var(--docs-code-string)' } },
        { scope: ['constant', 'support.type', 'entity.name.type'], settings: { foreground: 'var(--docs-code-constant)' } },
        { scope: ['entity.name.function', 'support.function'], settings: { foreground: 'var(--docs-code-function)' } },
        { scope: ['entity.name.tag'], settings: { foreground: 'var(--docs-code-tag)' } },
        { scope: ['entity.other.attribute-name'], settings: { foreground: 'var(--docs-code-attribute)' } },
        { scope: ['punctuation'], settings: { foreground: 'var(--docs-code-punctuation)' } },
      ],
    }],
  }).catch((error: unknown) => {
    highlighter = undefined;
    throw error;
  });
  const engine = await highlighter;
  loaded[language] ??= grammars[language]().then(({ default: grammar }) => engine.loadLanguage(grammar)).catch((error: unknown) => {
    delete loaded[language];
    throw error;
  });
  await loaded[language];
  const lines = engine.codeToTokens(source, { lang: language, theme: 'sectile-docs' }).tokens;
  const separators = source.match(/\r\n|\n|\r/gu) ?? [];
  return lines.flatMap((line, index) => {
    const tokens: CodeToken[] = line.map(({ content, color }) => ({ content, color }));
    if (index < separators.length) tokens.push({ content: separators[index]! });
    return tokens;
  });
}
