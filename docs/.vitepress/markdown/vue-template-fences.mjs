import { resolveVueCodeLanguage } from '../code-language.mjs';

const vueFencePattern = /^(\s*)vue(?=$|[\s:{=])/u;

export function isVueTemplateFragment(info, source) {
  return vueFencePattern.test(info) && resolveVueCodeLanguage('vue', source) === 'vue-html';
}

export function vueTemplateFencePlugin(markdown) {
  const renderFence = markdown.renderer.rules.fence;
  if (renderFence === undefined) {
    throw new Error('Vue template highlighting requires a Markdown fence renderer.');
  }

  markdown.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
    const token = tokens[index];
    if (!vueFencePattern.test(token.info)) {
      return renderFence(tokens, index, options, environment, renderer);
    }

    const language = resolveVueCodeLanguage('vue', token.content);
    if (language === 'vue') {
      return renderFence(tokens, index, options, environment, renderer);
    }

    const originalInfo = token.info;
    token.info = originalInfo.replace(vueFencePattern, `$1${language}`);

    let rendered;
    try {
      rendered = renderFence(tokens, index, options, environment, renderer);
    } finally {
      token.info = originalInfo;
    }

    return rendered;
  };
}
