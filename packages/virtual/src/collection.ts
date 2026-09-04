import {
  DEFAULT_MAX_ID_CODE_UNITS,
  validateStableID,
  type StableID,
} from '@sectile/core/identity';
import { unwrap, type SectileError } from '@sectile/core/result';
import {
  tryApplySequencePatch,
  tryCreateSequence,
  type Sequence,
} from '@sectile/core/sequence';
import type { VirtualResult } from './error.js';
import type { Extent, ExtentIndex, ExtentUpdate } from './extent-index.js';
import { fail, ok } from './internal/foundation.js';

export type VirtualCollectionIDResolver<
  Value,
  ID extends StableID,
> = {
  bivarianceHack(value: Value, index: number): ID;
}['bivarianceHack'];

export type VirtualExtentEstimate<Value> = number | {
  bivarianceHack(value: Value, index: number): number;
}['bivarianceHack'];

interface VirtualCollectionTypeMarker<
  Value,
  ID extends StableID,
> {
  readonly value: (value: Value) => Value;
  readonly id: (id: ID) => ID;
}

const collectionTypeMarker = Object.freeze({});

export interface VirtualCollectionOptions {
  readonly maxItems?: number;
  readonly maxIDCodeUnits?: number;
}

export interface VirtualCollectionChange<ID extends StableID> {
  readonly index: number;
  readonly deleteCount: number;
  readonly inserted: readonly ID[];
}

export interface VirtualCollectionValueChange {
  readonly index: number;
  readonly count: number;
}

export interface VirtualCollectionProjection<
  Value,
  ID extends StableID,
> {
  readonly [projectionIdentity]: VirtualCollectionTypeMarker<Value, ID>;
  readonly items: readonly Value[];
  readonly domain: Sequence<ID>;
  readonly getID: VirtualCollectionIDResolver<Value, ID>;
  readonly change: VirtualCollectionChange<ID> | null;
  readonly valueChange: VirtualCollectionValueChange | null;
}

export interface VirtualCollectionRawUpdate<
  Value,
  ID extends StableID,
> {
  readonly kind: 'raw';
  readonly items: readonly Value[];
  readonly getID?: VirtualCollectionIDResolver<Value, ID>;
}

const projectionIdentity: unique symbol = Symbol(
  'SectileVirtualCollectionProjectionIdentity',
);
const trustedPatchBrand: unique symbol = Symbol(
  'SectileVirtualCollectionTrustedPatch',
);

export interface VirtualCollectionTrustedUpdate<
  Value,
  ID extends StableID,
> {
  readonly kind: 'trusted-patch';
  readonly [trustedPatchBrand]: VirtualCollectionTypeMarker<Value, ID>;
}

export type VirtualCollectionUpdate<
  Value,
  ID extends StableID,
> =
  | VirtualCollectionRawUpdate<Value, ID>
  | VirtualCollectionTrustedUpdate<Value, ID>;

export interface VirtualCollectionPatchInput<
  Value,
  ID extends StableID,
> {
  readonly items: readonly Value[];
  readonly index: number;
  readonly deleteCount: number;
  readonly inserted: readonly ID[];
  readonly valueChange?: VirtualCollectionValueChange | null;
}

export type VirtualSizePolicy<Value> =
  | {
      readonly kind: 'fixed';
      readonly extent: number;
    }
  | {
      readonly kind: 'estimated';
      readonly estimate: VirtualExtentEstimate<Value>;
    }
  | {
      readonly kind: 'measured';
    };

export type VirtualLanePolicy =
  | {
      readonly kind: 'fixed';
      readonly count: number;
      readonly gap?: number;
    }
  | {
      readonly kind: 'responsive';
      readonly minExtent: number;
      readonly maxCount: number;
      readonly gap?: number;
    };

export interface VirtualLaneGeometry {
  readonly count: number;
  readonly extent: number;
  readonly gap: number;
}

export interface VirtualCollectionExtentState<ID extends StableID> {
  readonly domain: Sequence<ID>;
  readonly extents: Pick<ExtentIndex, 'size' | 'extentAt'>;
}

export interface VirtualCollectionExtentPatch<ID extends StableID> {
  readonly patch: {
    readonly type: 'splice';
    readonly index: number;
    readonly deleteCount: number;
    readonly inserted: readonly ID[];
  };
  readonly insertedExtents: readonly Extent[];
}

type AnyProjection = VirtualCollectionProjection<unknown, StableID>;

interface TrustedUpdateState {
  readonly previousIdentity: object;
  readonly next: AnyProjection | null;
}

const projectionIdentities = new WeakMap<object, object>();
const trustedUpdates = new WeakMap<object, TrustedUpdateState>();

export function createVirtualCollection<
  Value,
  ID extends StableID,
>(
  items: readonly Value[],
  getID: VirtualCollectionIDResolver<Value, ID>,
  options: VirtualCollectionOptions = {},
): VirtualCollectionProjection<Value, ID> {
  return unwrap(tryCreateVirtualCollection(items, getID, options));
}

export function tryCreateVirtualCollection<
  Value,
  ID extends StableID,
>(
  items: readonly Value[],
  getID: VirtualCollectionIDResolver<Value, ID>,
  options: VirtualCollectionOptions = {},
): VirtualResult<VirtualCollectionProjection<Value, ID>> {
  const validated = validateProjectionInput(items, getID, options);
  if (!validated.ok) return validated;
  const ids = new Array<ID>(items.length);
  for (let index = 0; index < items.length; index += 1) {
    ids[index] = getID(items[index] as Value, index);
  }
  const domain = tryCreateSequence(ids, {
    maxItems: validated.value.maxItems,
    maxIDCodeUnits: validated.value.maxIDCodeUnits,
  });
  if (!domain.ok) return domain;
  return ok(freezeProjection(
    items,
    domain.value,
    getID,
    null,
    null,
  ));
}

export function replaceVirtualCollection<
  Value,
  ID extends StableID,
>(
  previous: VirtualCollectionProjection<Value, ID>,
  items: readonly Value[],
  getID?: VirtualCollectionIDResolver<Value, ID>,
): VirtualCollectionProjection<Value, ID> {
  return unwrap(tryReplaceVirtualCollection(previous, items, getID));
}

export function tryReplaceVirtualCollection<
  Value,
  ID extends StableID,
>(
  previous: VirtualCollectionProjection<Value, ID>,
  items: readonly Value[],
  getID?: VirtualCollectionIDResolver<Value, ID>,
): VirtualResult<VirtualCollectionProjection<Value, ID>> {
  const previousIdentity = projectionIdentityOf(previous);
  if (previousIdentity === null) {
    return collectionInputFailure(
      'Virtual collection replacements require an owner-created projection.',
      previous,
    );
  }
  const resolver = getID ?? previous.getID;
  const input = validateProjectionInput(items, resolver, {
    maxItems: previous.domain.maxItems,
    maxIDCodeUnits: previous.domain.maxIDCodeUnits,
  });
  if (!input.ok) return input;
  if (previous.items === items && previous.getID === resolver) return ok(previous);

  if (previous.getID !== resolver) {
    const prepared = tryCreateVirtualCollection(items, resolver, {
      maxItems: previous.domain.maxItems,
      maxIDCodeUnits: previous.domain.maxIDCodeUnits,
    });
    if (!prepared.ok) return prepared;
    const window = changedIdentityWindow(previous.domain, prepared.value.domain);
    if (window === null) {
      return ok(freezeProjection(
        items,
        previous.domain,
        resolver,
        null,
        changedValues(previous.items, items),
      ));
    }
    return ok(freezeProjection(
      items,
      prepared.value.domain,
      resolver,
      window,
      null,
    ));
  }

  const values = changedValueWindow(previous.items, items);
  if (values === null) return ok(previous);
  const changedEnd = items.length - values.suffix;
  if (previous.items.length === items.length) {
    let sameDomain = true;
    for (let index = values.prefix; index < changedEnd; index += 1) {
      const id = resolver(items[index] as Value, index);
      const valid = validateStableIDResult<ID>(
        id,
        previous.domain.maxIDCodeUnits,
      );
      if (!valid.ok) return valid;
      if (id !== previous.domain.at(index)) {
        sameDomain = false;
        break;
      }
    }
    if (sameDomain) {
      return ok(freezeProjection(
        items,
        previous.domain,
        resolver,
        null,
        Object.freeze({
          index: values.prefix,
          count: changedEnd - values.prefix,
        }),
      ));
    }
  }

  const inserted = new Array<ID>(changedEnd - values.prefix);
  for (let index = values.prefix; index < changedEnd; index += 1) {
    inserted[index - values.prefix] = resolver(items[index] as Value, index);
  }
  const change = Object.freeze({
    index: values.prefix,
    deleteCount: previous.domain.size - values.prefix - values.suffix,
    inserted: Object.freeze(inserted),
  });
  const domain = tryApplySequencePatch(previous.domain, Object.freeze({
    type: 'splice' as const,
    ...change,
  }));
  if (!domain.ok) return domain;
  return ok(freezeProjection(
    items,
    domain.value,
    resolver,
    change,
    null,
  ));
}

export function createVirtualCollectionPatch<
  Value,
  ID extends StableID,
>(
  previous: VirtualCollectionProjection<Value, ID>,
  input: VirtualCollectionPatchInput<Value, ID>,
): VirtualCollectionTrustedUpdate<Value, ID> {
  return unwrap(tryCreateVirtualCollectionPatch(previous, input));
}

export function tryCreateVirtualCollectionPatch<
  Value,
  ID extends StableID,
>(
  previous: VirtualCollectionProjection<Value, ID>,
  input: VirtualCollectionPatchInput<Value, ID>,
): VirtualResult<VirtualCollectionTrustedUpdate<Value, ID>> {
  const previousIdentity = projectionIdentityOf(previous);
  if (previousIdentity === null) {
    return collectionInputFailure(
      'Trusted collection patches require an owner-created projection.',
      previous,
    );
  }
  const unknownInput: unknown = input;
  if (!isRecord(unknownInput) || !Array.isArray(unknownInput['items'])) {
    return collectionInputFailure(
      'Trusted collection patches require an items array.',
      unknownInput,
    );
  }
  if (!Array.isArray(unknownInput['inserted'])) {
    return collectionPatchFailure(
      'Trusted collection patches require an inserted identity array.',
      unknownInput,
    );
  }
  if (
    !Number.isSafeInteger(input.index)
    || !Number.isSafeInteger(input.deleteCount)
    || input.index < 0
    || input.deleteCount < 0
  ) {
    return collectionPatchFailure(
      'Trusted collection patch ranges must be non-negative safe integers.',
      input,
    );
  }
  const inserted = Object.freeze([...input.inserted]);
  const domain = tryApplySequencePatch(previous.domain, Object.freeze({
    type: 'splice' as const,
    index: input.index,
    deleteCount: input.deleteCount,
    inserted,
  }));
  if (!domain.ok) return domain;
  if (input.items.length !== domain.value.size) {
    return collectionPatchFailure(
      'Trusted collection patch items must match the resulting identity count.',
      Object.freeze({
        itemCount: input.items.length,
        domainSize: domain.value.size,
      }),
    );
  }
  for (let localIndex = 0; localIndex < inserted.length; localIndex += 1) {
    const index = input.index + localIndex;
    const id = previous.getID(input.items[index] as Value, index);
    const valid = validateStableIDResult<ID>(
      id,
      previous.domain.maxIDCodeUnits,
    );
    if (!valid.ok) return valid;
    if (id !== inserted[localIndex]) {
      return collectionPatchFailure(
        'Trusted collection inserted identities must match the item resolver.',
        Object.freeze({
          index,
          expected: inserted[localIndex],
          actual: id,
        }),
      );
    }
  }
  const valueChange = normalizeValueChange(
    input.valueChange ?? null,
    domain.value.size,
  );
  if (!valueChange.ok) return valueChange;
  if (valueChange.value !== null) {
    const end = valueChange.value.index + valueChange.value.count;
    for (let index = valueChange.value.index; index < end; index += 1) {
      const id = previous.getID(input.items[index] as Value, index);
      const valid = validateStableIDResult<ID>(
        id,
        previous.domain.maxIDCodeUnits,
      );
      if (!valid.ok) return valid;
      if (id !== domain.value.at(index)) {
        return collectionPatchFailure(
          'Trusted value changes must preserve the active identity at every changed index.',
          Object.freeze({
            index,
            expected: domain.value.at(index),
            actual: id,
          }),
        );
      }
    }
  }
  const changed = input.deleteCount !== 0 || inserted.length !== 0;
  const next = !changed && valueChange.value === null
    ? previous
    : freezeProjection(
        input.items,
        domain.value,
        previous.getID,
        changed
          ? Object.freeze({
              index: input.index,
              deleteCount: input.deleteCount,
              inserted,
            })
          : null,
        valueChange.value,
      );
  const token = Object.freeze({
    kind: 'trusted-patch' as const,
    [trustedPatchBrand]: collectionTypeMarker as VirtualCollectionTypeMarker<
      Value,
      ID
    >,
  });
  trustedUpdates.set(token, Object.freeze({
    previousIdentity,
    next: next === previous ? null : next as unknown as AnyProjection,
  }));
  return ok(token);
}

export function updateVirtualCollection<
  Value,
  ID extends StableID,
>(
  previous: VirtualCollectionProjection<Value, ID>,
  update: VirtualCollectionUpdate<Value, ID>,
): VirtualCollectionProjection<Value, ID> {
  return unwrap(tryUpdateVirtualCollection(previous, update));
}

export function tryUpdateVirtualCollection<
  Value,
  ID extends StableID,
>(
  previous: VirtualCollectionProjection<Value, ID>,
  update: VirtualCollectionUpdate<Value, ID>,
): VirtualResult<VirtualCollectionProjection<Value, ID>> {
  const previousIdentity = projectionIdentityOf(previous);
  if (previousIdentity === null) {
    return collectionInputFailure(
      'Virtual collection updates require an owner-created projection.',
      previous,
    );
  }
  const unknownUpdate: unknown = update;
  if (!isRecord(unknownUpdate)) {
    return collectionInputFailure(
      'Virtual collection updates must be raw replacements or trusted patches.',
      unknownUpdate,
    );
  }
  if (unknownUpdate['kind'] === 'raw') {
    const raw = update as VirtualCollectionRawUpdate<Value, ID>;
    return tryReplaceVirtualCollection(
      previous,
      raw.items,
      raw.getID ?? previous.getID,
    );
  }
  if (unknownUpdate['kind'] !== 'trusted-patch') {
    return collectionInputFailure(
      'Virtual collection updates must be raw replacements or trusted patches.',
      unknownUpdate,
    );
  }
  const trusted = trustedUpdates.get(update as object);
  if (
    trusted === undefined
    || trusted.previousIdentity !== previousIdentity
  ) {
    return collectionPatchFailure(
      'Trusted collection patches must be created for the active projection.',
      unknownUpdate,
    );
  }
  return ok(
    trusted.next === null
      ? previous
      : trusted.next as unknown as VirtualCollectionProjection<Value, ID>,
  );
}

export function constrainVirtualCollectionDomain<
  Value,
  ID extends StableID,
>(
  projection: VirtualCollectionProjection<Value, ID>,
  maxItems: number,
): Sequence<ID> {
  return unwrap(tryConstrainVirtualCollectionDomain(projection, maxItems));
}

export function tryConstrainVirtualCollectionDomain<
  Value,
  ID extends StableID,
>(
  projection: VirtualCollectionProjection<Value, ID>,
  maxItems: number,
): VirtualResult<Sequence<ID>> {
  if (projectionIdentityOf(projection) === null) {
    return collectionInputFailure(
      'Virtual collection domain constraints require an owner-created projection.',
      projection,
    );
  }
  if (!Number.isSafeInteger(maxItems) || maxItems < 0) {
    return fail(
      'construction',
      'invalid-max-items',
      'maxItems must be a non-negative safe integer.',
      { maxItems },
    );
  }
  if (projection.domain.size > maxItems) {
    return fail(
      'resource-rejection',
      'item-ceiling-exceeded',
      'Virtual collection exceeds maxItems.',
      Object.freeze({
        size: projection.domain.size,
        maxItems,
      }),
    );
  }
  if (projection.domain.maxItems === maxItems) return ok(projection.domain);
  return tryCreateSequence(projection.domain.ids, {
    maxItems,
    maxIDCodeUnits: projection.domain.maxIDCodeUnits,
  });
}

export function reconcileVirtualCollectionExtents<
  Value,
  ID extends StableID,
>(
  state: VirtualCollectionExtentState<ID>,
  next: VirtualCollectionProjection<Value, ID>,
  policy: VirtualSizePolicy<Value>,
  measuredEstimate?: number,
): VirtualCollectionExtentPatch<ID> | null {
  if (projectionIdentityOf(next) === null) {
    return unwrap(collectionInputFailure<never>(
      'Virtual collection extent reconciliation requires an owner-created projection.',
      next,
    ));
  }
  if (state.domain.size !== state.extents.size) {
    return unwrap(fail<never>(
      'construction',
      'virtual-layout-domain-mismatch',
      'Virtual collection extent reconciliation requires aligned identity and extent domains.',
      Object.freeze({
        domainSize: state.domain.size,
        extentSize: state.extents.size,
      }),
    ));
  }
  const change = next.change;
  if (change === null) return null;
  const insertedExtents = new Array<Extent>(change.inserted.length);
  for (let localIndex = 0; localIndex < change.inserted.length; localIndex += 1) {
    const id = change.inserted[localIndex] as ID;
    const nextIndex = change.index + localIndex;
    const previousIndex = state.domain.indexOf(id);
    insertedExtents[localIndex] = (
      previousIndex === null
        ? null
        : state.extents.extentAt(previousIndex)
    ) ?? createVirtualExtent(
      policy,
      next.items[nextIndex] as Value,
      nextIndex,
      measuredEstimate,
    );
  }
  return Object.freeze({
    patch: Object.freeze({
      type: 'splice' as const,
      index: change.index,
      deleteCount: change.deleteCount,
      inserted: change.inserted,
    }),
    insertedExtents: Object.freeze(insertedExtents),
  });
}

export function reconcileVirtualCollectionValueExtents<
  Value,
  ID extends StableID,
>(
  state: VirtualCollectionExtentState<ID>,
  next: VirtualCollectionProjection<Value, ID>,
  policy: VirtualSizePolicy<Value>,
  measuredEstimate?: number,
): readonly ExtentUpdate[] {
  if (projectionIdentityOf(next) === null) {
    return unwrap(collectionInputFailure<never>(
      'Virtual collection value reconciliation requires an owner-created projection.',
      next,
    ));
  }
  virtualSizePolicyRequiresMeasurement(policy);
  const change = next.valueChange;
  if (change === null || policy.kind === 'fixed') return Object.freeze([]);
  if (
    state.domain.size !== state.extents.size
    || state.domain.size !== next.domain.size
  ) {
    return unwrap(fail<never>(
      'construction',
      'virtual-layout-domain-mismatch',
      'Virtual collection value reconciliation requires aligned identity and extent domains.',
      Object.freeze({
        stateDomainSize: state.domain.size,
        stateExtentSize: state.extents.size,
        nextDomainSize: next.domain.size,
      }),
    ));
  }
  const updates: ExtentUpdate[] = [];
  const end = change.index + change.count;
  for (let index = change.index; index < end; index += 1) {
    if (state.domain.at(index) !== next.domain.at(index)) {
      return unwrap(fail<never>(
        'transition-rejection',
        'virtual-layout-domain-mismatch',
        'Virtual collection value reconciliation requires stable identities inside the changed value window.',
        Object.freeze({ index }),
      ));
    }
    const extent = createVirtualExtent(
      policy,
      next.items[index] as Value,
      index,
      measuredEstimate,
    );
    const current = state.extents.extentAt(index);
    if (current !== null && sameExtent(current, extent)) continue;
    updates.push(Object.freeze({ index, extent }));
  }
  return Object.freeze(updates);
}

export function createVirtualExtent<Value>(
  policy: VirtualSizePolicy<Value>,
  value: Value,
  index: number,
  measuredEstimate?: number,
): Extent {
  if (!isRecord(policy as unknown)) {
    return sizePolicyFailure('Virtual size policy must be an object.', policy);
  }
  if (policy.kind === 'fixed') {
    return createExactVirtualExtent(policy.extent);
  }
  if (policy.kind === 'estimated') {
    return createEstimatedVirtualExtent(policy.estimate, value, index);
  }
  if (policy.kind === 'measured') {
    return createEstimatedVirtualExtent(
      requireVirtualMeasuredEstimate(measuredEstimate),
      value,
      index,
    );
  }
  return sizePolicyFailure('Virtual size policy kind is invalid.', policy);
}

export function createExactVirtualExtent(value: number): Extent {
  if (!finiteNonNegative(value)) {
    return sizePolicyFailure(
      'Fixed virtual extents must be finite and non-negative.',
      value,
    );
  }
  return Object.freeze({ kind: 'exact', value });
}

export function createEstimatedVirtualExtent<Value>(
  estimate: VirtualExtentEstimate<Value>,
  value: Value,
  index: number,
): Extent {
  if (
    typeof estimate !== 'number'
    && typeof estimate !== 'function'
  ) {
    return sizePolicyFailure(
      'Estimated virtual size requires a number or resolver function.',
      estimate,
    );
  }
  if (!Number.isSafeInteger(index) || index < 0) {
    return sizePolicyFailure(
      'Virtual extent indexes must be non-negative safe integers.',
      index,
    );
  }
  const fallback = typeof estimate === 'number'
    ? estimate
    : estimate(value, index);
  if (!finiteNonNegative(fallback)) {
    return sizePolicyFailure(
      'Estimated virtual extents must be finite and non-negative.',
      fallback,
    );
  }
  return Object.freeze({
    kind: 'unknown',
    fallback,
  });
}

export function requireVirtualMeasuredEstimate(
  estimate: number | undefined,
): number {
  if (!finiteNonNegative(estimate)) {
    return sizePolicyFailure(
      'Measured virtual size requires a finite non-negative bootstrap estimate.',
      estimate,
    );
  }
  return estimate;
}

export function virtualSizePolicyRequiresMeasurement<Value>(
  policy: VirtualSizePolicy<Value>,
): boolean {
  if (!isRecord(policy as unknown)) {
    return sizePolicyFailure('Virtual size policy must be an object.', policy);
  }
  if (policy.kind === 'measured') return true;
  if (policy.kind === 'fixed' || policy.kind === 'estimated') return false;
  return sizePolicyFailure('Virtual size policy kind is invalid.', policy);
}

export function resolveVirtualLaneGeometry(
  crossExtent: number,
  policy: VirtualLanePolicy,
): VirtualLaneGeometry {
  if (!isRecord(policy as unknown)) {
    return lanePolicyFailure('Virtual lane policy must be an object.', policy);
  }
  if (!finiteNonNegative(crossExtent)) {
    return lanePolicyFailure(
      'Virtual lane cross extent must be finite and non-negative.',
      crossExtent,
    );
  }
  const gap = policy.gap ?? 0;
  if (!finiteNonNegative(gap)) {
    return lanePolicyFailure(
      'Virtual lane gaps must be finite and non-negative.',
      gap,
    );
  }
  let count: number;
  if (policy.kind === 'fixed') {
    if (!positiveSafeInteger(policy.count)) {
      return lanePolicyFailure(
        'Fixed virtual lane count must be a positive safe integer.',
        policy.count,
      );
    }
    count = policy.count;
  } else if (policy.kind === 'responsive') {
    if (!finitePositive(policy.minExtent)) {
      return lanePolicyFailure(
        'Responsive virtual lane minExtent must be positive and finite.',
        policy.minExtent,
      );
    }
    if (!positiveSafeInteger(policy.maxCount)) {
      return lanePolicyFailure(
        'Responsive virtual lane maxCount must be a positive safe integer.',
        policy.maxCount,
      );
    }
    count = Math.max(
      1,
      Math.min(
        policy.maxCount,
        Math.floor((crossExtent + gap) / (policy.minExtent + gap)),
      ),
    );
  } else {
    return lanePolicyFailure('Virtual lane policy kind is invalid.', policy);
  }
  const totalGap = gap * Math.max(0, count - 1);
  if (!Number.isFinite(totalGap)) {
    return lanePolicyFailure(
      'Virtual lane gap geometry must remain finite.',
      Object.freeze({ gap, count }),
    );
  }
  const extent = Math.max(0, crossExtent - totalGap) / count;
  if (!Number.isFinite(extent)) {
    return lanePolicyFailure(
      'Virtual lane extent must remain finite.',
      Object.freeze({ crossExtent, gap, count }),
    );
  }
  return Object.freeze({ count, extent, gap });
}

function validateProjectionInput<
  Value,
  ID extends StableID,
>(
  items: readonly Value[],
  getID: VirtualCollectionIDResolver<Value, ID>,
  options: VirtualCollectionOptions,
): VirtualResult<{
  readonly maxItems: number;
  readonly maxIDCodeUnits: number;
}> {
  const unknownItems: unknown = items;
  const unknownResolver: unknown = getID;
  const unknownOptions: unknown = options;
  if (!isRecord(unknownOptions)) {
    return collectionInputFailure(
      'Virtual collection options must be an object.',
      unknownOptions,
    );
  }
  if (!Array.isArray(unknownItems)) {
    return collectionInputFailure(
      'Virtual collection items must be an array.',
      unknownItems,
    );
  }
  if (typeof unknownResolver !== 'function') {
    return collectionInputFailure(
      'Virtual collection getID must be a function.',
      unknownResolver,
    );
  }
  const maxItems = options.maxItems ?? 1_000_000;
  if (!Number.isSafeInteger(maxItems) || maxItems < 0) {
    return fail(
      'construction',
      'invalid-max-items',
      'maxItems must be a non-negative safe integer.',
      { maxItems },
    );
  }
  const maxIDCodeUnits = options.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  if (!positiveSafeInteger(maxIDCodeUnits)) {
    return fail(
      'construction',
      'invalid-max-id-code-units',
      'maxIDCodeUnits must be a positive safe integer.',
      { maxIDCodeUnits },
    );
  }
  if (items.length > maxItems) {
    return fail(
      'resource-rejection',
      'item-ceiling-exceeded',
      'Virtual collection exceeds maxItems.',
      Object.freeze({
        size: items.length,
        maxItems,
      }),
    );
  }
  return ok(Object.freeze({ maxItems, maxIDCodeUnits }));
}

function changedIdentityWindow<ID extends StableID>(
  previous: Sequence<ID>,
  next: Sequence<ID>,
): VirtualCollectionChange<ID> | null {
  let prefix = 0;
  while (
    prefix < previous.size
    && prefix < next.size
    && previous.at(prefix) === next.at(prefix)
  ) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.size - prefix
    && suffix < next.size - prefix
    && previous.at(previous.size - suffix - 1)
      === next.at(next.size - suffix - 1)
  ) suffix += 1;
  if (prefix === previous.size && prefix === next.size) return null;
  return Object.freeze({
    index: prefix,
    deleteCount: previous.size - prefix - suffix,
    inserted: Object.freeze(next.ids.slice(prefix, next.size - suffix)),
  });
}

function changedValueWindow<Value>(
  previous: readonly Value[],
  next: readonly Value[],
): {
  readonly prefix: number;
  readonly suffix: number;
} | null {
  let prefix = 0;
  while (
    prefix < previous.length
    && prefix < next.length
    && Object.is(previous[prefix], next[prefix])
  ) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.length - prefix
    && suffix < next.length - prefix
    && Object.is(
      previous[previous.length - suffix - 1],
      next[next.length - suffix - 1],
    )
  ) suffix += 1;
  return prefix === previous.length && prefix === next.length
    ? null
    : Object.freeze({ prefix, suffix });
}

function changedValues<Value>(
  previous: readonly Value[],
  next: readonly Value[],
): VirtualCollectionValueChange | null {
  const window = changedValueWindow(previous, next);
  if (window === null) return null;
  return Object.freeze({
    index: window.prefix,
    count: next.length - window.prefix - window.suffix,
  });
}

function sameExtent(left: Extent, right: Extent): boolean {
  if (left.kind !== right.kind) return false;
  return left.kind === 'exact' && right.kind === 'exact'
    ? left.value === right.value
    : left.kind === 'unknown' && right.kind === 'unknown'
      ? left.fallback === right.fallback
      : false;
}

function normalizeValueChange(
  value: VirtualCollectionValueChange | null,
  size: number,
): VirtualResult<VirtualCollectionValueChange | null> {
  if (value === null) return ok(null);
  const unknownValue: unknown = value;
  if (
    !isRecord(unknownValue)
    || !Number.isSafeInteger(value.index)
    || !Number.isSafeInteger(value.count)
    || value.index < 0
    || value.count < 0
    || value.index > size
    || value.count > size - value.index
  ) {
    return collectionPatchFailure(
      'Virtual collection value changes must identify a valid range.',
      unknownValue,
    );
  }
  if (value.count === 0) return ok(null);
  return ok(Object.freeze({ index: value.index, count: value.count }));
}

function freezeProjection<
  Value,
  ID extends StableID,
>(
  items: readonly Value[],
  domain: Sequence<ID>,
  getID: VirtualCollectionIDResolver<Value, ID>,
  change: VirtualCollectionChange<ID> | null,
  valueChange: VirtualCollectionValueChange | null,
): VirtualCollectionProjection<Value, ID> {
  const projection: VirtualCollectionProjection<Value, ID> = {
    [projectionIdentity]: collectionTypeMarker as VirtualCollectionTypeMarker<
      Value,
      ID
    >,
    items,
    domain,
    getID,
    change,
    valueChange,
  };
  projectionIdentities.set(projection, Object.freeze({}));
  return Object.freeze(projection);
}

function projectionIdentityOf<
  Value,
  ID extends StableID,
>(projection: VirtualCollectionProjection<Value, ID>): object | null {
  const unknownProjection: unknown = projection;
  if (!isRecord(unknownProjection)) return null;
  return projectionIdentities.get(unknownProjection) ?? null;
}

function validateStableIDResult<ID extends StableID>(
  id: ID,
  maxIDCodeUnits: number,
): VirtualResult<ID> {
  const error = validateStableID(id, maxIDCodeUnits);
  return error === null ? ok(id) : coreFailure(error);
}

function coreFailure<T>(error: SectileError): VirtualResult<T> {
  return fail(
    error.class,
    error.code,
    error.message,
    error.details,
  );
}

function collectionInputFailure<T>(
  message: string,
  value: unknown,
): VirtualResult<T> {
  return fail(
    'construction',
    'virtual-collection-input-invalid',
    message,
    { value },
  );
}

function collectionPatchFailure<T>(
  message: string,
  value: unknown,
): VirtualResult<T> {
  return fail(
    'transition-rejection',
    'virtual-collection-patch-invalid',
    message,
    { value },
  );
}

function sizePolicyFailure(message: string, value: unknown): never {
  return unwrap(fail<never>(
    'construction',
    'virtual-size-policy-invalid',
    message,
    { value },
  ));
}

function lanePolicyFailure(message: string, value: unknown): never {
  return unwrap(fail<never>(
    'construction',
    'virtual-lane-policy-invalid',
    message,
    { value },
  ));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0;
}
