import type { Result } from '@sectile/core';
import { tryCreateProgressState, type ProgressInput, type ProgressState } from '@sectile/core/progress';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { formatExactPercentage } from './internal/exact-percentage.js';

export type ProgressAttributeRecord = Readonly<Record<string, string | number | undefined>>;
export type ProgressValueFormatter = (value: string) => string;

export interface ProgressRootAttributesOptions {
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly formatValue?: ProgressValueFormatter;
  readonly scope?: string;
  readonly part?: string;
}

export interface ProgressIndicatorAttributesOptions {
  readonly scope?: string;
  readonly part?: string;
}

export interface ProgressControlledValues extends ProgressInput {}

export interface ProgressOptions extends ProgressControlledValues, ProgressRootAttributesOptions {
  readonly root: HTMLElement;
  readonly indicator?: HTMLElement;
  readonly onUpdate?: () => void;
}

export interface ProgressConnection {
  getSnapshot(): RevisionSnapshot<ProgressState>;
  syncControlledValues(values: ProgressControlledValues): Result<RevisionSnapshot<ProgressState>>;
  refreshAttributes(): void;
  disconnect(): void;
}

export function getProgressRootAttributes(
  state: ProgressState,
  options: ProgressRootAttributesOptions = {},
): ProgressAttributeRecord {
  const percentage = percentageOf(state);
  return Object.freeze({
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': state.max,
    'aria-valuenow': state.value ?? undefined,
    'aria-valuetext': state.value === null ? undefined : options.formatValue?.(state.value) ?? state.value,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-describedby': options.describedBy,
    'data-scope': options.scope ?? 'progress',
    'data-part': options.part ?? 'root',
    'data-status': state.status,
    'data-percentage': percentage,
    style: percentage === undefined ? undefined : `--sectile-progress-percentage: ${percentage}%`,
  });
}

export function getProgressIndicatorAttributes(
  state: ProgressState,
  options: ProgressIndicatorAttributesOptions = {},
): ProgressAttributeRecord {
  const percentage = percentageOf(state);
  return Object.freeze({
    'aria-hidden': 'true',
    'data-scope': options.scope ?? 'progress',
    'data-part': options.part ?? 'indicator',
    'data-status': state.status,
    'data-percentage': percentage,
    style: percentage === undefined ? undefined : `--sectile-progress-percentage: ${percentage}%`,
  });
}

export function getProgressNativeAttributes(state: ProgressState): ProgressAttributeRecord {
  return Object.freeze({ max: state.max, value: state.value ?? undefined });
}

export function createProgress(options?: ProgressOptions): ProgressConnection {
  return unwrap(tryCreateProgress(options));
}

export function tryCreateProgress(options?: ProgressOptions): Result<ProgressConnection> {
  const initial = tryCreateProgressState(options);
  if (!initial.ok) return initial;
  return { ok: true, value: new DOMProgress(options, createRevisionSnapshot(initial.value)) };
}

class DOMProgress implements ProgressConnection {
  readonly #options: ProgressOptions | undefined;
  #snapshot: RevisionSnapshot<ProgressState>;

  public constructor(options: ProgressOptions | undefined, snapshot: RevisionSnapshot<ProgressState>) {
    this.#options = options;
    this.#snapshot = snapshot;
    this.refreshAttributes();
  }

  public getSnapshot(): RevisionSnapshot<ProgressState> { return this.#snapshot; }

  public syncControlledValues(values: ProgressControlledValues): Result<RevisionSnapshot<ProgressState>> {
    const next = tryCreateProgressState(values);
    if (!next.ok) return next;
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionCeiling();
    this.#snapshot = createRevisionSnapshot(next.value, this.#snapshot.revision + 1);
    this.refreshAttributes();
    this.#options?.onUpdate?.();
    return { ok: true, value: this.#snapshot };
  }

  public refreshAttributes(): void {
    if (this.#options === undefined) return;
    const state = this.#snapshot.state;
    applyAttributes(this.#options.root, getProgressRootAttributes(state, this.#options));
    if (this.#options.indicator !== undefined) {
      applyAttributes(this.#options.indicator, getProgressIndicatorAttributes(state));
    }
  }

  public disconnect(): void {}
}

function percentageOf(state: ProgressState): string | undefined {
  return state.ratio === null ? undefined : formatExactPercentage(state.ratio);
}

function applyAttributes(element: HTMLElement, attributes: ProgressAttributeRecord): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'style') {
      if (value === undefined) element.style.removeProperty('--sectile-progress-percentage');
      else element.style.setProperty('--sectile-progress-percentage', `${attributes['data-percentage']}%`);
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
      message: 'Progress revision cannot advance beyond the safe-integer ceiling.',
    },
  };
}
