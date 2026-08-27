import type { Result } from '@sectile/core';
import { tryCreateMeterState, type MeterInput, type MeterState } from '@sectile/core/meter';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { formatExactPercentage } from './internal/exact-percentage.js';

export type MeterAttributeRecord = Readonly<Record<string, string | number | undefined>>;
export type MeterValueFormatter = (value: string) => string;

export interface MeterRootAttributesOptions {
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly formatValue?: MeterValueFormatter;
  readonly scope?: string;
  readonly part?: string;
}

export interface MeterIndicatorAttributesOptions {
  readonly scope?: string;
  readonly part?: string;
}

export interface MeterControlledValues extends MeterInput {}

export interface MeterOptions extends MeterControlledValues, MeterRootAttributesOptions {
  readonly root: HTMLElement;
  readonly indicator?: HTMLElement;
  readonly onUpdate?: () => void;
}

export interface MeterConnection {
  getSnapshot(): RevisionSnapshot<MeterState>;
  syncControlledValues(values: MeterControlledValues): Result<RevisionSnapshot<MeterState>>;
  refreshAttributes(): void;
  disconnect(): void;
}

export function getMeterRootAttributes(
  state: MeterState,
  options: MeterRootAttributesOptions = {},
): MeterAttributeRecord {
  const percentage = percentageOf(state);
  return Object.freeze({
    role: 'meter',
    'aria-valuemin': state.min,
    'aria-valuemax': state.max,
    'aria-valuenow': state.value,
    'aria-valuetext': options.formatValue?.(state.value) ?? state.value,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-describedby': options.describedBy,
    'data-scope': options.scope ?? 'meter',
    'data-part': options.part ?? 'root',
    'data-zone': state.zone,
    'data-percentage': percentage,
    style: `--sectile-meter-percentage: ${percentage}%`,
  });
}

export function getMeterIndicatorAttributes(
  state: MeterState,
  options: MeterIndicatorAttributesOptions = {},
): MeterAttributeRecord {
  const percentage = percentageOf(state);
  return Object.freeze({
    'aria-hidden': 'true',
    'data-scope': options.scope ?? 'meter',
    'data-part': options.part ?? 'indicator',
    'data-zone': state.zone,
    'data-percentage': percentage,
    style: `--sectile-meter-percentage: ${percentage}%`,
  });
}

export function getMeterNativeAttributes(state: MeterState): MeterAttributeRecord {
  return Object.freeze({
    min: state.min,
    max: state.max,
    value: state.value,
    low: state.low,
    high: state.high,
    optimum: state.optimum,
  });
}

export function createMeter(options: MeterOptions): MeterConnection {
  return unwrap(tryCreateMeter(options));
}

export function tryCreateMeter(options: MeterOptions): Result<MeterConnection> {
  const initial = tryCreateMeterState(options);
  if (!initial.ok) return initial;
  return { ok: true, value: new DOMMeter(options, createRevisionSnapshot(initial.value)) };
}

class DOMMeter implements MeterConnection {
  readonly #options: MeterOptions;
  #snapshot: RevisionSnapshot<MeterState>;

  public constructor(options: MeterOptions, snapshot: RevisionSnapshot<MeterState>) {
    this.#options = options;
    this.#snapshot = snapshot;
    this.refreshAttributes();
  }

  public getSnapshot(): RevisionSnapshot<MeterState> {
    return this.#snapshot;
  }

  public syncControlledValues(values: MeterControlledValues): Result<RevisionSnapshot<MeterState>> {
    const next = tryCreateMeterState(values);
    if (!next.ok) return next;
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionCeiling();
    this.#snapshot = createRevisionSnapshot(next.value, this.#snapshot.revision + 1);
    this.refreshAttributes();
    this.#options.onUpdate?.();
    return { ok: true, value: this.#snapshot };
  }

  public refreshAttributes(): void {
    const state = this.#snapshot.state;
    applyAttributes(this.#options.root, getMeterRootAttributes(state, this.#options));
    if (this.#options.indicator !== undefined) {
      applyAttributes(this.#options.indicator, getMeterIndicatorAttributes(state));
    }
  }

  public disconnect(): void {}
}

function percentageOf(state: MeterState): string {
  return formatExactPercentage(state.ratio);
}

function applyAttributes(element: HTMLElement, attributes: MeterAttributeRecord): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'style') {
      const percentage = attributes['data-percentage'];
      if (percentage !== undefined) element.style.setProperty('--sectile-meter-percentage', `${percentage}%`);
      continue;
    }
    if (value === undefined) element.removeAttribute(name);
    else element.setAttribute(name, String(value));
  }
}

function revisionCeiling(): Result<never> {
  return {
    ok: false,
    error: {
      class: 'resource-rejection',
      code: 'revision-ceiling-reached',
      message: 'Meter revision cannot advance beyond the safe-integer ceiling.',
    },
  };
}
