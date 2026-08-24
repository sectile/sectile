import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import {
  applyQuantityFieldEvent,
  tryCreateQuantityFieldState,
  type QuantityFieldCommand,
  type QuantityFieldEvent,
  type QuantityFieldPolicies,
  type QuantityFieldState,
  type QuantityValue,
} from '@sectile/core/quantity-field';
export type { QuantityFieldPolicies, QuantityValue } from '@sectile/core/quantity-field';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState } from '@sectile/core/text';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { DOMTextElementBinding } from './internal/text-element.js';
import { toTextEvent, type TextInput } from './text.js';
import {
  createImperialUnitSystem,
  createMetricUnitSystem,
  createStandardUnitRegistry,
} from '@sectile/core/units';

export interface QuantityFieldValueChangeDetails {
  readonly value: QuantityValue | null;
  readonly expression: string;
  readonly displayUnit: string;
}

export type StandardQuantityUnitSystem = 'metric' | 'imperial' | 'all';

export function createStandardQuantityPolicies(
  canonicalUnit: string,
  unitSystem: StandardQuantityUnitSystem = 'all',
): QuantityFieldPolicies {
  const registry = createStandardUnitRegistry();
  const profile = unitSystem === 'metric'
    ? createMetricUnitSystem(registry)
    : unitSystem === 'imperial'
      ? createImperialUnitSystem(registry)
      : undefined;
  return Object.freeze({
    registry,
    canonicalUnit,
    ...(profile === undefined ? {} : { unitSystem: profile }),
  });
}

export interface QuantityFieldOptions {
  readonly input: HTMLInputElement;
  readonly unitSelect?: HTMLSelectElement;
  readonly policies: QuantityFieldPolicies;
  readonly quantity?: QuantityValue | null;
  readonly defaultQuantity?: QuantityValue | null;
  readonly displayUnit?: string;
  readonly defaultDisplayUnit?: string;
  readonly inputState?: TextEditingState;
  readonly defaultInputState?: TextEditingState;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly onQuantityChange?: (details: QuantityFieldValueChangeDetails) => void;
  readonly onDisplayUnitChange?: (unit: string) => void;
  readonly onInputStateChange?: (value: TextEditingState) => void;
  readonly onUpdate?: () => void;
}

export interface QuantityFieldControlledValues {
  readonly quantity?: QuantityValue | null;
  readonly displayUnit?: string;
  readonly inputState?: TextEditingState;
}

export interface QuantityFieldConnection {
  getSnapshot(): RevisionSnapshot<QuantityFieldState>;
  getText(): string;
  getQuantity(): QuantityValue | null;
  getDisplayUnit(): string;
  syncControlledValues(values: QuantityFieldControlledValues): Result<RevisionSnapshot<QuantityFieldState>>;
  handleEvent(event: QuantityFieldEvent): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createQuantityField(options: QuantityFieldOptions): FacadeConnection<QuantityFieldConnection> {
  return unwrap(tryCreateQuantityField(options));
}

export function tryCreateQuantityField(options: QuantityFieldOptions): Result<FacadeConnection<QuantityFieldConnection>> {
  return createFacadeConnection(options, (options) => tryCreateQuantityFieldConnection(options));
}

function tryCreateQuantityFieldConnection(options: QuantityFieldOptions): Result<QuantityFieldConnection> {
  const quantityControlled = options.quantity !== undefined;
  const displayUnitControlled = options.displayUnit !== undefined;
  const inputControlled = options.inputState !== undefined;
  const runtime = createSemanticController<QuantityFieldState, QuantityFieldEvent, QuantityFieldCommand, QuantityFieldCommand>({
    initial: tryCreateQuantityFieldState(
      options.policies,
      options.quantity !== undefined ? options.quantity : options.defaultQuantity ?? null,
      options.displayUnit ?? options.defaultDisplayUnit,
      options.inputState !== undefined ? options.inputState : options.defaultInputState,
    ),
    reducer: (state, event) => applyQuantityFieldEvent(state, event, options.policies),
    reconcile: (previous, proposed) => tryCreateQuantityFieldState(
      options.policies,
      quantityControlled ? previous.quantity : proposed.quantity,
      displayUnitControlled ? previous.displayUnit : proposed.displayUnit,
      inputControlled ? previous.inputState : proposed.inputState,
    ),
    notify: (previous, proposed) => {
      if (!sameValue(previous.displayUnit, proposed.displayUnit)) options.onDisplayUnitChange?.(proposed.displayUnit);
      if (!sameValue(previous.inputState, proposed.inputState)) options.onInputStateChange?.(proposed.inputState);
    },
    toEffect: (command) => command,
    interaction: options,
    interactionIntent: (event) => typeof event === 'object' && event.type === 'set-display-unit' ? 'navigate' : 'mutate',
  });
  return runtime.ok
    ? { ok: true, value: new DOMQuantityField(options, runtime.value, quantityControlled, displayUnitControlled, inputControlled) }
    : runtime;
}

class DOMQuantityField implements QuantityFieldConnection {
  readonly #options: QuantityFieldOptions;
  readonly #runtime: SemanticController<QuantityFieldState, QuantityFieldEvent, QuantityFieldCommand>;
  readonly #quantityControlled: boolean;
  readonly #displayUnitControlled: boolean;
  readonly #inputControlled: boolean;
  readonly #binding: DOMTextElementBinding;
  readonly #keydown = (event: KeyboardEvent): void => {
    if (this.#binding.isComposing || event.isComposing) return;
    if (event.key === 'Enter') { event.preventDefault(); this.handleEvent('commit'); }
    else if (event.key === 'Escape') { event.preventDefault(); this.handleEvent('cancel'); }
  };
  readonly #blur = (): void => { if (!this.#binding.isComposing) this.handleEvent('commit'); };
  readonly #unitChange = (): void => {
    const unit = this.#options.unitSelect?.value;
    if (unit !== undefined) this.handleEvent({ type: 'set-display-unit', unit });
  };

  public constructor(
    options: QuantityFieldOptions,
    runtime: SemanticController<QuantityFieldState, QuantityFieldEvent, QuantityFieldCommand>,
    quantityControlled: boolean,
    displayUnitControlled: boolean,
    inputControlled: boolean,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#quantityControlled = quantityControlled;
    this.#displayUnitControlled = displayUnitControlled;
    this.#inputControlled = inputControlled;
    this.#binding = new DOMTextElementBinding({
      element: options.input,
      getState: () => this.getSnapshot().state.inputState,
      dispatch: (input) => this.#handleTextInput(input),
    });
    options.input.addEventListener('keydown', this.#keydown);
    options.input.addEventListener('blur', this.#blur);
    options.unitSelect?.addEventListener('change', this.#unitChange);
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<QuantityFieldState> { return this.#runtime.getSnapshot(); }
  public getText(): string { return this.getSnapshot().state.inputState.snapshot.text; }
  public getQuantity(): QuantityValue | null { return this.getSnapshot().state.quantity; }
  public getDisplayUnit(): string { return this.getSnapshot().state.displayUnit; }

  public syncControlledValues(values: QuantityFieldControlledValues): Result<RevisionSnapshot<QuantityFieldState>> {
    if (this.#quantityControlled !== (values.quantity !== undefined)
      || this.#displayUnitControlled !== (values.displayUnit !== undefined)
      || this.#inputControlled !== (values.inputState !== undefined)) {
      return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled quantity field values must preserve their construction-time shape.' } };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateQuantityFieldState(
      this.#options.policies,
      this.#quantityControlled ? values.quantity as QuantityValue | null : state.quantity,
      this.#displayUnitControlled ? values.displayUnit as string : state.displayUnit,
      this.#inputControlled ? values.inputState as TextEditingState : state.inputState,
    ));
    if (result.ok) { this.refresh(); this.#options.onUpdate?.(); }
    return result;
  }

  public handleEvent(event: QuantityFieldEvent): boolean {
    const result = this.#runtime.handle(event);
    this.#options.input.setAttribute('aria-invalid', String(!result.ok && event === 'commit'));
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'quantity-committed') {
          this.#options.onQuantityChange?.(Object.freeze({
            value: command.value,
            expression: command.expression,
            displayUnit: command.displayUnit,
          }));
        }
      }
      this.refresh();
      this.#options.onUpdate?.();
    }
    return result.ok;
  }

  public refresh(): void {
    const input = this.#options.input;
    input.type = 'text';
    input.inputMode = this.#options.policies.evaluator === undefined ? 'decimal' : 'text';
    setInteractionAttributes(input, this.#options, { native: true, readOnly: true });
    if (this.#options.label !== undefined) input.setAttribute('aria-label', this.#options.label);
    this.#binding.render();
    const select = this.#options.unitSelect;
    if (select !== undefined) {
      this.#populateUnits();
      select.value = this.getDisplayUnit();
      select.disabled = this.#options.disabled ?? false;
      select.setAttribute('aria-disabled', String(select.disabled));
      select.setAttribute('aria-readonly', String(this.#options.readOnly ?? false));
      if (this.#options.label !== undefined) select.setAttribute('aria-label', `${this.#options.label} unit`);
    }
  }

  public disconnect(): void {
    this.#binding.disconnect();
    this.#options.input.removeEventListener('keydown', this.#keydown);
    this.#options.input.removeEventListener('blur', this.#blur);
    this.#options.unitSelect?.removeEventListener('change', this.#unitChange);
  }

  #handleTextInput(input: TextInput): boolean {
    const event = toTextEvent(input);
    return event !== null && this.handleEvent({ type: 'text', event });
  }

  #populateUnits(): void {
    const select = this.#options.unitSelect;
    if (select === undefined) return;
    select.replaceChildren();
    for (const unitID of this.#displayUnits()) {
      const unit = this.#options.policies.registry.get(unitID);
      if (unit === null) continue;
      const option = select.ownerDocument.createElement('option');
      option.value = unit.id;
      option.textContent = unit.symbol;
      select.append(option);
    }
  }

  #displayUnits(): readonly string[] {
    const policies = this.#options.policies;
    const preferred = policies.unitSystem?.getUnits(policies.canonicalUnit) ?? [];
    const compatible = preferred.length > 0
      ? preferred
      : policies.registry.units
        .filter((unit) => policies.registry.compatible(policies.canonicalUnit, unit.id))
        .map((unit) => unit.id);
    return Object.freeze([...new Set([...compatible, this.getDisplayUnit()])]);
  }
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
