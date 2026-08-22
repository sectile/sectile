import { createQuantityField, type QuantityFieldConnection } from '@sectile/dom/quantity-field';
import { createCalculatorExpression, type NumericExpressionEvaluator } from '@sectile/core/number-field';
import type { QuantityValue } from '@sectile/core/quantity-field';
import { unwrap } from '@sectile/core/result';
import { createTextEditingState, type TextEditingState } from '@sectile/core/text';
import {
  createImperialUnitSystem,
  createMetricUnitSystem,
  createStandardUnitRegistry,
  type UnitRegistry,
  type UnitSystemProfile,
} from '@sectile/core/units';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const calculator = unwrap(createCalculatorExpression({ precision: 12, rounding: 'half-even' }));
const standardUnits = unwrap(createStandardUnitRegistry());
const metricUnits = unwrap(createMetricUnitSystem(standardUnits));
const imperialUnits = unwrap(createImperialUnitSystem(standardUnits));

interface QuantityCase {
  readonly label: string;
  readonly copy: string;
  readonly registry: UnitRegistry;
  readonly canonicalUnit: string;
  readonly quantity: QuantityValue;
  readonly displayUnit?: string;
  readonly unitSystem?: UnitSystemProfile;
  readonly evaluator?: NumericExpressionEvaluator;
  readonly draft?: string;
  readonly examples: readonly string[];
  readonly controlled?: boolean;
}

export const quantityFieldDemo: DemoDefinition = {
  id: 'quantity-field',
  label: 'Quantity field',
  title: 'Quantity field',
  description: 'Exact quantity editing with a standard unit catalog, metric or imperial preferences, compound expressions, and canonical storage.',
  shortcuts: [
    { keys: ['Enter'], label: 'evaluate / commit' },
    { keys: ['Esc'], label: 'cancel draft' },
    { keys: ['Select'], label: 'change preferred unit' },
  ],
  cases: [
    {
      id: 'length', title: 'Length conversion',
      mount: (context) => mountQuantityField(context, {
        label: 'Metric package length', copy: 'The metric profile chooses metres by default. A value may carry any compatible unit, including compact input such as 150cm.',
        registry: standardUnits, unitSystem: metricUnits, canonicalUnit: 'metre', quantity: { value: '1', unit: 'metre' },
        examples: ['150cm', '2.5m', '12in'],
      }),
    },
    {
      id: 'temperature', title: 'Affine temperature conversion',
      mount: (context) => mountQuantityField(context, {
        label: 'Room temperature', copy: 'Celsius and Fahrenheit use exact offsets and ratios; Kelvin remains the canonical storage unit.',
        registry: standardUnits, unitSystem: metricUnits, canonicalUnit: 'kelvin', quantity: { value: '295.15', unit: 'kelvin' },
        examples: ['22°C', '32°F', '295.15K'],
      }),
    },
    {
      id: 'calculator', title: 'Unit-aware calculator input',
      mount: (context) => mountQuantityField(context, {
        label: 'Responsive spacing', copy: 'Calculator syntax and a unit suffix compose: 100-20% cm evaluates to 80 cm, then stores exactly 0.8 metres.',
        registry: standardUnits, unitSystem: metricUnits, canonicalUnit: 'metre', quantity: { value: '0.5', unit: 'metre' },
        displayUnit: 'centimetre', evaluator: calculator, draft: '100-20% cm', examples: ['100-20% cm', '24*1.5mm', '1/3 m'],
      }),
    },
    {
      id: 'compound', title: 'Compound unit expression',
      mount: (context) => mountQuantityField(context, {
        label: 'Acceleration', copy: 'The parser understands division, multiplication, caret exponents, and superscripts. Dimensions are checked before conversion.',
        registry: standardUnits, unitSystem: metricUnits, canonicalUnit: 'metre-per-second-squared',
        quantity: { value: '9.8', unit: 'metre-per-second-squared' },
        examples: ['9.8 m/s²', '32 ft/s²', '10 m/s^2'],
      }),
    },
    {
      id: 'controlled', title: 'Controlled quantity ownership',
      mount: (context) => mountQuantityField(context, {
        label: 'Imperial controlled width', copy: 'The imperial profile chooses feet and limits the selector to its preferred family. Explicit metric input remains valid.',
        registry: standardUnits, unitSystem: imperialUnits, canonicalUnit: 'metre', quantity: { value: '1.2', unit: 'metre' },
        evaluator: calculator, examples: ['72in', '2yd', '1.5m'], controlled: true,
      }),
    },
  ],
};

function mountQuantityField(context: DemoContext, options: QuantityCase): DemoSession {
  const root = document.createElement('div');
  root.className = 'quantity-field-demo';
  const label = document.createElement('label');
  label.textContent = options.label;
  const control = document.createElement('div');
  control.className = 'quantity-field-control';
  const input = document.createElement('input');
  input.className = 'quantity-field-input';
  const select = document.createElement('select');
  select.className = 'quantity-field-unit';
  control.append(input, select);
  const copy = document.createElement('p');
  copy.className = 'demo-copy';
  copy.textContent = options.copy;
  const examples = document.createElement('div');
  examples.className = 'number-field-examples';
  const status = document.createElement('p');
  status.className = 'quantity-field-status';
  root.append(label, control, copy, examples, status);
  context.surface.append(root);

  let externalQuantity: QuantityValue | null = options.quantity;
  let externalUnit = resolveDisplayUnit(options);
  let externalInput = editing(options.draft ?? displayText(options));
  let connection!: QuantityFieldConnection;
  connection = unwrap(createQuantityField({
    input,
    unitSelect: select,
    ...context.interaction,
    label: options.label,
    policies: {
      registry: options.registry,
      canonicalUnit: options.canonicalUnit,
      ...(options.unitSystem === undefined ? {} : { unitSystem: options.unitSystem }),
      ...(options.evaluator === undefined ? {} : { evaluator: options.evaluator }),
    },
    ...(options.controlled ? {
      quantity: externalQuantity,
      displayUnit: externalUnit,
      inputState: externalInput,
      onQuantityChange: ({ value }) => { externalQuantity = value; queueMicrotask(sync); },
      onDisplayUnitChange: (unit) => { externalUnit = unit; queueMicrotask(sync); },
      onInputStateChange: (value) => { externalInput = value; queueMicrotask(sync); },
    } : {
      defaultQuantity: options.quantity,
      ...(options.displayUnit === undefined ? {} : { defaultDisplayUnit: options.displayUnit }),
      ...(options.draft === undefined ? {} : { defaultInputState: editing(options.draft) }),
    }),
    onUpdate: render,
  }));

  for (const value of options.examples) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-field-example';
    button.textContent = value;
    button.disabled = context.interaction.disabled === true || context.interaction.readOnly === true;
    button.addEventListener('click', () => {
      if (!connection.handleEvent(replaceAll(connection.getSnapshot().state.inputState, value))) return;
      queueMicrotask(() => {
        connection.handleEvent('commit');
        input.focus();
        render();
      });
    });
    examples.append(button);
  }
  input.addEventListener('keydown', () => queueMicrotask(render));
  input.addEventListener('blur', () => queueMicrotask(render));
  select.addEventListener('change', () => queueMicrotask(render));

  function sync(): void {
    connection.syncControlledValues({ quantity: externalQuantity, displayUnit: externalUnit, inputState: externalInput });
  }

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    const invalid = input.getAttribute('aria-invalid') === 'true';
    const definition = options.registry.get(state.displayUnit);
    status.textContent = invalid
      ? `Not committed · ${state.inputState.snapshot.text || 'empty'} is invalid`
      : `Canonical · ${state.quantity?.value ?? 'empty'} ${options.registry.get(options.canonicalUnit)?.symbol ?? options.canonicalUnit}`;
    status.dataset['invalid'] = String(invalid);
    context.showState(revision, {
      quantity: state.quantity,
      display: `${state.inputState.snapshot.text || 'empty'} ${definition?.symbol ?? state.displayUnit}`,
      displayUnit: state.displayUnit,
      ownership: options.controlled ? 'controlled' : 'uncontrolled',
    });
  }

  render();
  return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}

function displayText(options: QuantityCase): string {
  return unwrap(options.registry.convert(
    options.quantity.value,
    options.quantity.unit,
    resolveDisplayUnit(options),
  )).value;
}

function resolveDisplayUnit(options: QuantityCase): string {
  return options.displayUnit
    ?? options.unitSystem?.getDefaultUnit(options.canonicalUnit)
    ?? options.canonicalUnit;
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
