import type { Host } from './host-preference.js';

export interface NumberFieldExampleConfig {
  readonly initialValue: string;
  readonly draft: string | null;
  readonly calculator: boolean;
  readonly min?: string;
  readonly max?: string;
  readonly controlled: boolean;
}

const examples: Readonly<Record<string, NumberFieldExampleConfig>> = Object.freeze({
  'exact-decimal': Object.freeze({
    initialValue: '0.1',
    draft: null,
    calculator: false,
    controlled: false,
  }),
  calculator: Object.freeze({
    initialValue: '50',
    draft: '50-20%',
    calculator: true,
    controlled: false,
  }),
  exponent: Object.freeze({
    initialValue: '2',
    draft: '2^3^2',
    calculator: true,
    controlled: false,
  }),
  bounded: Object.freeze({
    initialValue: '40.25',
    draft: null,
    calculator: false,
    min: '0',
    max: '100',
    controlled: false,
  }),
  controlled: Object.freeze({
    initialValue: '1',
    draft: '1/3',
    calculator: true,
    controlled: true,
  }),
});

const fallback = examples['exact-decimal'] as NumberFieldExampleConfig;

export function numberFieldExampleConfig(scenario: string): NumberFieldExampleConfig {
  return examples[scenario] ?? fallback;
}

function policiesSource(config: NumberFieldExampleConfig): string {
  const entries = [
    ...(config.calculator ? ['evaluator'] : []),
    ...(config.min === undefined ? [] : [`min: '${config.min}'`]),
    ...(config.max === undefined ? [] : [`max: '${config.max}'`]),
  ];
  return entries.length === 0 ? '' : `\n  policies: { ${entries.join(', ')} },`;
}

function calculatorSetup(config: NumberFieldExampleConfig): string {
  if (!config.calculator) return '';
  return `const calculator = createCalculatorExpression({ precision: 12, rounding: 'half-even' })\nif (!calculator.ok) throw new Error(calculator.error.message)\nconst evaluator = calculator.value\n`;
}

function terminalSource(config: NumberFieldExampleConfig): string {
  const draftPrelude = config.draft === null ? '' : `import { createTextEditingState } from '@sectile/core/text'\n`;
  const draftState = config.draft === null ? '' : `\nconst inputState = createTextEditingState('${config.draft}', {\n  anchorCodeUnitOffset: ${config.draft.length},\n  focusCodeUnitOffset: ${config.draft.length},\n})\nif (!inputState.ok) throw new Error(inputState.error.message)\n`;
  const controlledState = config.controlled
    ? `\nlet value = '${config.initialValue}'\nlet input = inputState.value\nlet field\nfield = createNumberField({\n  value,\n  inputState: input,${policiesSource(config)}\n  onValueChange: (change) => { value = change.value ?? ''; sync() },\n  onInputStateChange: (change) => { input = change.value; sync() },\n  onUpdate: render,\n})\n\nfunction sync() {\n  field.syncControlledValues({ value, inputState: input })\n}`
    : `\nconst field = createNumberField({\n  defaultValue: '${config.initialValue}',${config.draft === null ? '' : '\n  defaultInputState: inputState.value,'}${policiesSource(config)}\n  onUpdate: render,\n})`;
  const calculatorImport = config.calculator
    ? `import { createCalculatorExpression } from '@sectile/core/number-field'\n`
    : '';
  return `import { createNumberField } from '@sectile/terminal/number-field'\n${draftPrelude}${calculatorImport}\n${calculatorSetup(config)}${draftState}${controlledState}\n\nfunction render() {\n  const snapshot = field.getSnapshot()\n  process.stdout.write(\`\\rvalue=\${snapshot.state.value ?? ''}\`)\n}`;
}

function domSource(config: NumberFieldExampleConfig): string {
  const calculatorImport = config.calculator
    ? `\nimport { createCalculatorExpression } from '@sectile/core/number-field'`
    : '';
  return `import { createNumberField } from '@sectile/dom/number-field'${calculatorImport}\n\n${calculatorSetup(config)}const input = document.querySelector<HTMLInputElement>('[data-number-field]')\nif (!input) throw new Error('Number Field input was not found')\n\ncreateNumberField({\n  input,\n  defaultValue: '${config.initialValue}',${policiesSource(config)}\n  label: 'Amount',\n  onValueChange: ({ value }) => console.log(value),\n})`;
}

function vueSource(config: NumberFieldExampleConfig): string {
  const hasPolicies = config.calculator || config.min !== undefined || config.max !== undefined;
  const policyExpression = config.calculator
    ? `const calculator = createCalculatorExpression({ precision: 12, rounding: 'half-even' })\nif (!calculator.ok) throw new Error(calculator.error.message)\nconst policies = { evaluator: calculator.value${config.min === undefined ? '' : `, min: '${config.min}'`}${config.max === undefined ? '' : `, max: '${config.max}'`} }`
    : hasPolicies
      ? `const policies = {${config.min === undefined ? '' : ` min: '${config.min}',`}${config.max === undefined ? '' : ` max: '${config.max}',`} }`
      : '';
  const vueImport = config.controlled ? "import { ref } from 'vue'\n" : '';
  const setup = [
    config.controlled ? `const value = ref('${config.initialValue}')` : '',
    policyExpression,
  ].filter(Boolean).join('\n');
  return `<script setup lang="ts">\n${vueImport}import { NumberField } from '@sectile/vue/number-field'${config.calculator ? "\nimport { createCalculatorExpression } from '@sectile/core/number-field'" : ''}${setup === '' ? '' : `\n\n${setup}`}\n<\/script>\n\n<template>\n  <label>\n    Amount\n    <NumberField${config.controlled ? ' v-model="value"' : ` default-value="${config.initialValue}"`}${hasPolicies ? ' :policies="policies"' : ''} />\n  </label>\n</template>`;
}

function coreSource(config: NumberFieldExampleConfig): string {
  const numberFieldImports = [
    'applyNumberFieldEvent',
    ...(config.calculator ? ['createCalculatorExpression'] : []),
    'createNumberFieldState',
  ];
  const inputImport = config.draft === null
    ? ''
    : `\nimport { createTextEditingState } from '@sectile/core/text'`;
  const inputSetup = config.draft === null
    ? ''
    : `\nconst input = createTextEditingState('${config.draft}', {\n  anchorCodeUnitOffset: ${config.draft.length},\n  focusCodeUnitOffset: ${config.draft.length},\n})\nif (!input.ok) throw new Error(input.error.message)\n`;
  const initialInput = config.draft === null ? '' : ', input.value';
  return `import { ${numberFieldImports.join(', ')} } from '@sectile/core/number-field'${inputImport}\n\n${calculatorSetup(config)}${inputSetup}const initial = createNumberFieldState('${config.initialValue}'${initialInput})\nif (!initial.ok) throw new Error(initial.error.message)\n\nconst update = applyNumberFieldEvent(initial.value, 'commit', {${config.calculator ? ' evaluator,' : ''}${config.min === undefined ? '' : ` min: '${config.min}',`}${config.max === undefined ? '' : ` max: '${config.max}',`} })\nif (!update.ok) throw new Error(update.error.message)\n\nconsole.log(update.value.state.value)`;
}

export function numberFieldExampleSources(scenario: string): Partial<Record<Host, string>> {
  const config = numberFieldExampleConfig(scenario);
  return {
    core: coreSource(config),
    dom: domSource(config),
    terminal: terminalSource(config),
    vue: vueSource(config),
  };
}
