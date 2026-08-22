import { createNumberField, type NumberFieldConnection } from '@sectile/dom/number-field';
import { createCalculatorExpression, type NumericExpressionEvaluator } from '@sectile/primitives/number-field';
import { unwrap } from '@sectile/primitives/result';
import { createTextEditingState, type TextEditingState } from '@sectile/primitives/text';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const calculator = unwrap(createCalculatorExpression({ precision: 12, rounding: 'half-even' }));

export const numberFieldDemo: DemoDefinition = {
  id: 'number-field',
  label: 'Number field',
  title: 'Number field',
  description: 'Exact decimal text input with optional calculator expressions, commit, cancel, and controlled ownership.',
  shortcuts: [
    { keys: ['Enter'], label: 'evaluate / commit' },
    { keys: ['Esc'], label: 'cancel draft' },
    { keys: ['←', '→'], label: 'move caret' },
  ],
  cases: [
    {
      id: 'exact-decimal',
      title: 'Exact decimal input',
      mount: (context) => mountNumberField(context, {
        label: 'Decimal value', initial: '0.000000000000000001', examples: ['0.1', '1.2300', '-0.000001'],
        copy: 'No step lattice and no floating-point coercion. The committed value stays decimal text.',
      }),
    },
    {
      id: 'calculator',
      title: 'Calculator expressions',
      mount: (context) => mountNumberField(context, {
        label: 'Price calculation', initial: '50', draft: '50-20%', evaluator: calculator,
        examples: ['50-20%', '50+10%', '1/3'],
        copy: 'Calculator percentages follow the left operand: 50-20% commits 40.',
      }),
    },
    {
      id: 'exponent',
      title: 'Exponent and controlled value',
      mount: (context) => mountNumberField(context, {
        label: 'Power expression', initial: '2', draft: '2^3^2', evaluator: calculator,
        examples: ['2^8', '10^-2', '(2+3)^4'], controlled: true,
        copy: 'The caret operator is right-associative: 2^3^2 evaluates as 2^(3^2).',
      }),
    },
    {
      id: 'bounded',
      title: 'Bounded required value',
      mount: (context) => mountNumberField(context, {
        label: 'Allocation', initial: '25', draft: '120', evaluator: calculator,
        examples: ['0', '75.5', '120'], min: '0', max: '100', required: true,
        copy: 'Commit rejects empty values and results outside 0–100 without discarding the draft.',
      }),
    },
  ],
};

function mountNumberField(context: DemoContext, options: {
  readonly label: string;
  readonly initial: string;
  readonly draft?: string;
  readonly evaluator?: NumericExpressionEvaluator;
  readonly examples: readonly string[];
  readonly copy: string;
  readonly min?: string;
  readonly max?: string;
  readonly required?: boolean;
  readonly controlled?: boolean;
}): DemoSession {
  const root = document.createElement('div');
  root.className = 'number-field-demo';
  const label = document.createElement('label');
  label.textContent = options.label;
  const input = document.createElement('input');
  input.className = 'number-field-input';
  const copy = document.createElement('p');
  copy.className = 'demo-copy';
  copy.textContent = options.copy;
  const examples = document.createElement('div');
  examples.className = 'number-field-examples';
  const status = document.createElement('p');
  status.className = 'number-field-status';
  root.append(label, input, copy, examples, status);
  context.surface.append(root);

  let externalValue: string | null = options.initial;
  let externalInput = editing(options.draft ?? options.initial);
  let connection!: NumberFieldConnection;
  connection = unwrap(createNumberField({
    input,
    ...context.interaction,
    label: options.label,
    inputMode: options.evaluator === undefined ? 'decimal' : 'text',
    policies: {
      ...(options.evaluator === undefined ? {} : { evaluator: options.evaluator }),
      ...(options.min === undefined ? {} : { min: options.min }),
      ...(options.max === undefined ? {} : { max: options.max }),
      ...(options.required === undefined ? {} : { required: options.required }),
    },
    ...(options.controlled ? {
      value: externalValue,
      inputState: externalInput,
      onValueChange: ({ value }) => { externalValue = value; queueMicrotask(sync); },
      onInputStateChange: ({ value }) => { externalInput = value; queueMicrotask(sync); },
    } : {
      defaultValue: options.initial,
      ...(options.draft === undefined ? {} : { defaultInputState: editing(options.draft) }),
    }),
    onUpdate: render,
  }));

  for (const expression of options.examples) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-field-example';
    button.textContent = expression;
    button.disabled = context.interaction.disabled === true || context.interaction.readOnly === true;
    button.addEventListener('click', () => {
      if (!connection.handleEvent(replaceAll(connection.getSnapshot().state.inputState, expression))) return;
      connection.handleEvent('commit');
      input.focus();
      render();
    });
    examples.append(button);
  }
  input.addEventListener('keydown', () => queueMicrotask(render));
  input.addEventListener('blur', () => queueMicrotask(render));

  function sync(): void {
    connection.syncControlledValues({ value: externalValue, inputState: externalInput });
  }

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    const invalid = input.getAttribute('aria-invalid') === 'true';
    const text = state.inputState.snapshot.text;
    status.textContent = invalid
      ? `Not committed · ${text || 'empty'} is invalid for this field`
      : `Committed · ${state.value ?? 'empty'}${text === (state.value ?? '') ? '' : `  ·  input ${text}`}`;
    status.dataset['invalid'] = String(invalid);
    context.showState(revision, {
      value: state.value,
      input: text,
      selection: state.inputState.snapshot.selection,
      composition: state.inputState.composition,
      ownership: options.controlled ? 'controlled' : 'uncontrolled',
      exactDecimal: true,
    });
  }

  render();
  return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}

function editing(text: string): TextEditingState {
  return unwrap(createTextEditingState(text, {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  }));
}

function replaceAll(state: TextEditingState, text: string) {
  return {
    type: 'text' as const,
    event: {
      type: 'replace' as const,
      startCodeUnitOffset: 0,
      endCodeUnitOffset: state.snapshot.text.length,
      text,
      selection: { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length },
    },
  };
}
