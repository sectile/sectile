const vueSfcBlockPattern = /^(?:<script|<style|<template)(?:\s|>)/mu;
const vueTemplateStartPattern = /^(?:<|\{\{)/u;

export function resolveVueCodeLanguage(language, source) {
  if (language.trim().toLowerCase() !== 'vue') {
    return language;
  }

  if (vueSfcBlockPattern.test(source)) {
    return 'vue';
  }

  return vueTemplateStartPattern.test(source.trimStart()) ? 'vue-html' : 'ts';
}
