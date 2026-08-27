import type { Result, StableID } from '@sectile/core';
import {
  tryCreateMeterGroupState,
  type MeterGroupInput,
  type MeterGroupState,
} from '@sectile/core/meter-group';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { formatExactPercentage } from './internal/exact-percentage.js';

export type MeterGroupAttributeRecord = Readonly<Record<string, string | number | undefined>>;
export type MeterGroupValueFormatter<ID extends StableID = StableID> = (value: string, id: ID) => string;

export interface MeterGroupRootAttributesOptions {
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly scope?: string;
  readonly part?: string;
}

export interface MeterGroupSegmentAttributesOptions<ID extends StableID = StableID> {
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly formatValue?: MeterGroupValueFormatter<ID>;
  readonly scope?: string;
  readonly part?: string;
}

export interface MeterGroupControlledValues<ID extends StableID = StableID> extends MeterGroupInput<ID> {}

export interface MeterGroupOptions<ID extends StableID = StableID>
  extends MeterGroupControlledValues<ID>, MeterGroupRootAttributesOptions {
  readonly root: HTMLElement;
  readonly track?: HTMLElement;
  readonly onUpdate?: () => void;
}

export interface MeterGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<MeterGroupState<ID>>;
  syncControlledValues(values: MeterGroupControlledValues<ID>): Result<RevisionSnapshot<MeterGroupState<ID>>>;
  registerSegment(
    id: ID,
    element: HTMLElement,
    options: MeterGroupSegmentAttributesOptions<ID>,
  ): Result<() => void>;
  refreshAttributes(): void;
  disconnect(): void;
}

export function getMeterGroupRootAttributes<ID extends StableID>(
  state: MeterGroupState<ID>,
  options: MeterGroupRootAttributesOptions = {},
): MeterGroupAttributeRecord {
  const percentage = formatExactPercentage(state.ratio);
  return Object.freeze({
    role: 'group',
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-describedby': options.describedBy,
    'data-scope': options.scope ?? 'meter-group',
    'data-part': options.part ?? 'root',
    'data-zone': state.zone,
    'data-percentage': percentage,
    style: `--sectile-meter-group-percentage: ${percentage}%`,
  });
}

export function getMeterGroupTrackAttributes<ID extends StableID>(
  state: MeterGroupState<ID>,
): MeterGroupAttributeRecord {
  return Object.freeze({
    role: 'presentation',
    'data-scope': 'meter-group',
    'data-part': 'track',
    'data-zone': state.zone,
  });
}

export function getMeterGroupSegmentAttributes<ID extends StableID>(
  state: MeterGroupState<ID>,
  id: ID,
  options: MeterGroupSegmentAttributesOptions<ID>,
): Result<MeterGroupAttributeRecord> {
  const segment = state.segments.find((candidate) => candidate.id === id);
  if (segment === undefined) return segmentUnavailable(id);
  const percentage = formatExactPercentage(segment.valueRatio);
  const startPercentage = formatExactPercentage(segment.startRatio);
  const endPercentage = formatExactPercentage(segment.endRatio);
  return {
    ok: true,
    value: Object.freeze({
      role: 'meter',
      'aria-valuemin': '0',
      'aria-valuemax': state.max,
      'aria-valuenow': segment.value,
      'aria-valuetext': options.formatValue?.(segment.value, id) ?? segment.value,
      'aria-label': options.label,
      'aria-labelledby': options.labelledBy,
      'aria-describedby': options.describedBy,
      'data-scope': options.scope ?? 'meter-group',
      'data-part': options.part ?? 'segment',
      'data-id': id,
      'data-percentage': percentage,
      'data-start-percentage': startPercentage,
      'data-end-percentage': endPercentage,
      style: [
        `--sectile-meter-group-percentage: ${percentage}%`,
        `--sectile-meter-group-start-percentage: ${startPercentage}%`,
        `--sectile-meter-group-end-percentage: ${endPercentage}%`,
      ].join('; '),
    }),
  };
}

export function createMeterGroup<ID extends StableID>(options: MeterGroupOptions<ID>): MeterGroupConnection<ID> {
  return unwrap(tryCreateMeterGroup(options));
}

export function tryCreateMeterGroup<ID extends StableID>(
  options: MeterGroupOptions<ID>,
): Result<MeterGroupConnection<ID>> {
  const initial = tryCreateMeterGroupState(options);
  if (!initial.ok) return initial;
  return { ok: true, value: new DOMMeterGroup(options, createRevisionSnapshot(initial.value)) };
}

class DOMMeterGroup<ID extends StableID> implements MeterGroupConnection<ID> {
  readonly #options: MeterGroupOptions<ID>;
  readonly #segments = new Map<ID, {
    readonly element: HTMLElement;
    readonly options: MeterGroupSegmentAttributesOptions<ID>;
  }>();
  #snapshot: RevisionSnapshot<MeterGroupState<ID>>;

  public constructor(options: MeterGroupOptions<ID>, snapshot: RevisionSnapshot<MeterGroupState<ID>>) {
    this.#options = options;
    this.#snapshot = snapshot;
    this.refreshAttributes();
  }

  public getSnapshot(): RevisionSnapshot<MeterGroupState<ID>> {
    return this.#snapshot;
  }

  public syncControlledValues(
    values: MeterGroupControlledValues<ID>,
  ): Result<RevisionSnapshot<MeterGroupState<ID>>> {
    const next = tryCreateMeterGroupState(values);
    if (!next.ok) return next;
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionCeiling();
    this.#snapshot = createRevisionSnapshot(next.value, this.#snapshot.revision + 1);
    this.refreshAttributes();
    this.#options.onUpdate?.();
    return { ok: true, value: this.#snapshot };
  }

  public registerSegment(
    id: ID,
    element: HTMLElement,
    options: MeterGroupSegmentAttributesOptions<ID>,
  ): Result<() => void> {
    const attributes = getMeterGroupSegmentAttributes(this.#snapshot.state, id, options);
    if (!attributes.ok) return attributes;
    const registration = Object.freeze({ element, options });
    this.#segments.set(id, registration);
    applyAttributes(element, attributes.value);
    return {
      ok: true,
      value: () => {
        if (this.#segments.get(id) === registration) this.#segments.delete(id);
      },
    };
  }

  public refreshAttributes(): void {
    const state = this.#snapshot.state;
    applyAttributes(this.#options.root, getMeterGroupRootAttributes(state, this.#options));
    if (this.#options.track !== undefined) {
      applyAttributes(this.#options.track, getMeterGroupTrackAttributes(state));
    }
    for (const [id, registration] of this.#segments) {
      const attributes = getMeterGroupSegmentAttributes(state, id, registration.options);
      if (attributes.ok) applyAttributes(registration.element, attributes.value);
      else clearSegmentAttributes(registration.element);
    }
  }

  public disconnect(): void {
    this.#segments.clear();
  }
}

function applyAttributes(element: HTMLElement, attributes: MeterGroupAttributeRecord): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'style') {
      applyStyleProperties(element, value);
      continue;
    }
    if (value === undefined) element.removeAttribute(name);
    else element.setAttribute(name, String(value));
  }
}

function applyStyleProperties(element: HTMLElement, value: string | number | undefined): void {
  for (const name of [
    '--sectile-meter-group-percentage',
    '--sectile-meter-group-start-percentage',
    '--sectile-meter-group-end-percentage',
  ]) element.style.removeProperty(name);
  if (typeof value !== 'string') return;
  for (const declaration of value.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator < 0) continue;
    element.style.setProperty(declaration.slice(0, separator).trim(), declaration.slice(separator + 1).trim());
  }
}

function clearSegmentAttributes(element: HTMLElement): void {
  for (const name of [
    'role', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext',
    'aria-label', 'aria-labelledby', 'aria-describedby', 'data-scope', 'data-part',
    'data-id', 'data-percentage', 'data-start-percentage', 'data-end-percentage',
  ]) element.removeAttribute(name);
  applyStyleProperties(element, undefined);
}

function segmentUnavailable<ID extends StableID>(id: ID): Result<never> {
  return {
    ok: false,
    error: {
      class: 'construction',
      code: 'selected-id-outside-domain',
      message: 'MeterGroup segment id must belong to the current item domain.',
      details: { id },
    },
  };
}

function revisionCeiling(): Result<never> {
  return {
    ok: false,
    error: {
      class: 'resource-rejection',
      code: 'revision-ceiling-reached',
      message: 'MeterGroup revision cannot advance beyond the safe-integer ceiling.',
    },
  };
}
