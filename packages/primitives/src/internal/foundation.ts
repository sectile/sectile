import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type Result,
  type SectileError,
  type StableId,
} from '../shared.js';

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(
  errorClass: SectileError['class'],
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Result<T> {
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

export function resourceError(
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): SectileError {
  return {
    class: 'resource-rejection',
    code,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

export function isWellFormedUtf16(value: string): boolean {
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

export function validateStableId(
  id: string,
  maxIdCodeUnits: number = DEFAULT_MAX_ID_CODE_UNITS,
): SectileError | null {
  if (typeof id !== 'string') {
    return {
      class: 'construction',
      code: 'invalid-id-type',
      message: 'Stable IDs must be strings.',
      details: { receivedType: typeof id },
    };
  }
  if (!Number.isSafeInteger(maxIdCodeUnits) || maxIdCodeUnits < 1) {
    return {
      class: 'construction',
      code: 'invalid-max-id-code-units',
      message: 'maxIdCodeUnits must be a positive safe integer.',
      details: { maxIdCodeUnits },
    };
  }
  if (id.length === 0) {
    return {
      class: 'construction',
      code: 'empty-id',
      message: 'Stable IDs must not be empty.',
    };
  }
  if (!isWellFormedUtf16(id)) {
    return {
      class: 'construction',
      code: 'ill-formed-id',
      message: 'Stable IDs must be well-formed UTF-16 strings.',
      details: { id },
    };
  }
  if (id.length > maxIdCodeUnits) {
    return {
      class: 'resource-rejection',
      code: 'id-code-unit-ceiling-exceeded',
      message: 'Stable ID exceeds maxIdCodeUnits.',
      details: { idCodeUnits: id.length, maxIdCodeUnits },
    };
  }
  return null;
}

export function validateSafeCeiling(
  value: number,
  name: string,
  minimum = 0,
): SectileError | null {
  if (!Number.isSafeInteger(value) || value < minimum) {
    return {
      class: 'construction',
      code: `invalid-${toKebabCase(name)}`,
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

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
}

export function validateUniqueIds<Id extends StableId>(
  ids: readonly Id[],
  maxIdCodeUnits: number,
): Result<readonly Id[]> {
  const seen = new Set<Id>();
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (id === undefined) {
      return fail('construction', 'invalid-id-type', 'Stable IDs must be strings.', { index });
    }
    const idError = validateStableId(id, maxIdCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (seen.has(id)) {
      return fail('construction', 'duplicate-id', 'Stable identities must be unique.', {
        id,
        index,
      });
    }
    seen.add(id);
  }
  return ok(freezeArray(ids));
}
