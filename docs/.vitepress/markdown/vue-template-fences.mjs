const vueFencePattern = /^(\s*)vue(?=$|[\s:{=])/u;
const vueSfcScriptOrStylePattern = /^(?:<script|<style)\b/mu;

export function isVueTemplateFragment(info, source) {
  return vueFencePattern.test(info) && !vueSfcScriptOrStylePattern.test(source);
}

export function vueTemplateFencePlugin(markdown) {
  const renderFence = markdown.renderer.rules.fence;
  if (renderFence === undefined) {
    throw new Error('Vue template highlighting requires a Markdown fence renderer.');
  }

  markdown.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
    const token = tokens[index];
    if (!isVueTemplateFragment(token.info, token.content)) {
      return renderFence(tokens, index, options, environment, renderer);
    }

    const originalInfo = token.info;
    token.info = originalInfo.replace(vueFencePattern, '$1vue-html');

    let rendered;
    try {
      rendered = renderFence(tokens, index, options, environment, renderer);
    } finally {
      token.info = originalInfo;
    }

    return rendered;
  };
}
