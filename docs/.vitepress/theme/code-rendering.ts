import { codeToHtml } from 'shiki';

type CodeTheme = 'github-dark-default' | 'github-light-default';

const prettierOptions = Object.freeze({
  htmlWhitespaceSensitivity: 'ignore' as const,
  printWidth: 88,
  proseWrap: 'preserve' as const,
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all' as const,
  vueIndentScriptAndStyle: false,
});

function normalizedLanguage(language: string): string {
  return language.trim().toLowerCase();
}

export async function formatCodeSource(source: string, language: string): Promise<string> {
  const normalized = source.replaceAll('\r\n', '\n').trim();
  const target = normalizedLanguage(language);
  const prettier = await import('prettier/standalone');

  if (target === 'vue') {
    const [html, typescript, estree, postcss] = await Promise.all([
      import('prettier/plugins/html'),
      import('prettier/plugins/typescript'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/postcss'),
    ]);
    return (await prettier.format(normalized, {
      ...prettierOptions,
      parser: 'vue',
      plugins: [html, typescript, estree, postcss],
    })).trimEnd();
  }

  if (target === 'ts' || target === 'typescript') {
    const [typescript, estree] = await Promise.all([
      import('prettier/plugins/typescript'),
      import('prettier/plugins/estree'),
    ]);
    return (await prettier.format(normalized, {
      ...prettierOptions,
      parser: 'typescript',
      plugins: [typescript, estree],
    })).trimEnd();
  }

  if (target === 'js' || target === 'javascript') {
    const [babel, estree] = await Promise.all([
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
    ]);
    return (await prettier.format(normalized, {
      ...prettierOptions,
      parser: 'babel',
      plugins: [babel, estree],
    })).trimEnd();
  }

  return normalized;
}

export async function renderCodeSource(
  source: string,
  language: string,
  theme: CodeTheme,
): Promise<{ formatted: string; html: string }> {
  const formatted = await formatCodeSource(source, language);
  const html = await codeToHtml(formatted, { lang: language, theme });
  return { formatted, html };
}
