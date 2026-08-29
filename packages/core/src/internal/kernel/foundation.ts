import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type Result,
  type SectileError,
  type StableID,
} from '../../shared.js';
import type { CoreErrorCode } from '../../error-code.js';

type SafeCeilingName =
  | 'columnCount'
  | 'count'
  | 'itemsPerPage'
  | 'maxCells'
  | 'maxCodeUnits'
  | 'maxColumns'
  | 'maxCount'
  | 'maxDecimalCodeUnits'
  | 'maxDepth'
  | 'maxExponent'
  | 'maxIDCodeUnits'
  | 'maxItems'
  | 'maxOperations'
  | 'maxRows'
  | 'maxScale'
  | 'maxTokens'
  | 'precision'
  | 'siblingCount'
  | 'total';

const safeCeilingErrorCodes: Readonly<Record<SafeCeilingName, CoreErrorCode>> = Object.freeze({
  columnCount: 'invalid-column-count',
  count: 'invalid-count',
  itemsPerPage: 'invalid-items-per-page',
  maxCells: 'invalid-max-cells',
  maxCodeUnits: 'invalid-max-code-units',
  maxColumns: 'invalid-max-columns',
  maxCount: 'invalid-max-count',
  maxDecimalCodeUnits: 'invalid-max-decimal-code-units',
  maxDepth: 'invalid-max-depth',
  maxExponent: 'invalid-max-exponent',
  maxIDCodeUnits: 'invalid-max-id-code-units',
  maxItems: 'invalid-max-items',
  maxOperations: 'invalid-max-operations',
  maxRows: 'invalid-max-rows',
  maxScale: 'invalid-max-scale',
  maxTokens: 'invalid-max-tokens',
  precision: 'invalid-precision',
  siblingCount: 'invalid-sibling-count',
  total: 'invalid-total',
});

const canonicalOwners = new WeakMap<object, object>();

export function bindCanonicalState<State extends object>(owner: object, state: State): State {
  canonicalOwners.set(state, owner);
  return state;
}

export function hasCanonicalState(owner: object, state: object): boolean {
  return canonicalOwners.get(state) === owner;
}

export function memoizeWeak<Key extends object, Value>(
  cache: WeakMap<Key, Value>,
  key: Key,
  create: (key: Key) => Value,
): Value {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const value = create(key);
  cache.set(key, value);
  return value;
}

export function memoizeWeakPair<Owner extends object, Key extends object, Value>(
  cache: WeakMap<Owner, WeakMap<Key, Value>>,
  owner: Owner,
  key: Key,
  create: (owner: Owner, key: Key) => Value,
): Value {
  let owned = cache.get(owner);
  if (owned === undefined) {
    owned = new WeakMap();
    cache.set(owner, owned);
  }
  const cached = owned.get(key);
  if (cached !== undefined) return cached;
  const value = create(owner, key);
  owned.set(key, value);
  return value;
}

export function ok<T, Code extends string = CoreErrorCode>(value: T): Result<T, Code> {
  return { ok: true, value };
}

export function fail<T = never, Code extends string = CoreErrorCode>(
  errorClass: SectileError['class'],
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Result<T, Code> {
  return {
    ok: false,
    error: {
      class: errorClass,
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}

export function resourceError<Code extends string = CoreErrorCode>(
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): SectileError<Code> {
  return {
    class: 'resource-rejection',
    code,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

export function isWellFormedUTF16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

export function validateStableID(
  id: string,
  maxIDCodeUnits: number = DEFAULT_MAX_ID_CODE_UNITS,
): SectileError | null {
  if (typeof id !== 'string') {
    return {
      class: 'construction',
      code: 'invalid-id-type',
      message: 'Stable IDs must be strings.',
      details: { receivedType: typeof id },
    };
  }
  if (!Number.isSafeInteger(maxIDCodeUnits) || maxIDCodeUnits < 1) {
    return {
      class: 'construction',
      code: 'invalid-max-id-code-units',
      message: 'maxIDCodeUnits must be a positive safe integer.',
      details: { maxIDCodeUnits },
    };
  }
  if (id.length === 0) {
    return {
      class: 'construction',
      code: 'empty-id',
      message: 'Stable IDs must not be empty.',
    };
  }
  if (!isWellFormedUTF16(id)) {
    return {
      class: 'construction',
      code: 'ill-formed-id',
      message: 'Stable IDs must be well-formed UTF-16 strings.',
      details: { id },
    };
  }
  if (id.length > maxIDCodeUnits) {
    return {
      class: 'resource-rejection',
      code: 'id-code-unit-ceiling-exceeded',
      message: 'Stable ID exceeds maxIDCodeUnits.',
      details: { idCodeUnits: id.length, maxIDCodeUnits },
    };
  }
  return null;
}

export function validateSafeCeiling(
  value: number,
  name: SafeCeilingName,
  minimum = 0,
): SectileError | null {
  if (!Number.isSafeInteger(value) || value < minimum) {
    return {
      class: 'construction',
      code: safeCeilingErrorCodes[name],
      message: `${name} must be a safe integer greater than or equal to ${minimum}.`,
      details: { [name]: value },
    };
  }
  return null;
}

export function normalizeMaxScan(maxScan: number | undefined): number | SectileError {
  if (maxScan === undefined) return Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(maxScan) || maxScan < 0) {
    return resourceError(
      'invalid-scan-ceiling',
      'maxScan must be a non-negative safe integer.',
      { maxScan },
    );
  }
  return maxScan;
}

export function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

export function assertNever(value: never): never {
  throw new Error(`Internal invariant breach: unexpected value ${String(value)}`);
}

export function validateUniqueIDs<ID extends StableID>(
  ids: readonly ID[],
  maxIDCodeUnits: number,
  indexByID?: Map<ID, number>,
): Result<readonly ID[]> {
  const snapshot: ID[] = [];
  const seen = indexByID ?? new Map<ID, number>();
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (id === undefined) {
      return fail('construction', 'invalid-id-type', 'Stable IDs must be strings.', { index });
    }
    const idError = validateStableID(id, maxIDCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (seen.has(id)) {
      return fail('construction', 'duplicate-id', 'Stable identities must be unique.', {
        id,
        index,
      });
    }
    seen.set(id, index);
    snapshot.push(id);
  }
  return ok(Object.freeze(snapshot));
}
