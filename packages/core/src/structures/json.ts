import { failResult } from '../result.js';
import type { Result, SectileError } from '../result.js';
import type { CoreErrorCode } from '../error-code.js';

export type JSONValue = null | boolean | number | string | readonly JSONValue[] | { readonly [key: string]: JSONValue };
export interface JSONDataLimits {
  readonly maxInputBytes: number; readonly maxInputValues: number;
  readonly maxInputDepth: number; readonly maxStringCodeUnits: number;
}
export interface JSONDataOptions {
  readonly limits: JSONDataLimits;
  /** Inert own keys are copied safely when explicitly allowed. Defaults to reject. */
  readonly prototypeKeys?: 'allow' | 'reject';
}
export interface JSONDataWork { readonly values: number; readonly maximumDepth: number; readonly encodedBytes: number }
export interface JSONDataSnapshot { readonly data: JSONValue; readonly work: JSONDataWork }
export interface JSONDataEncoding { readonly source: string; readonly work: JSONDataWork }
export type JSONDataErrorCode = Extract<CoreErrorCode, 'invalid-json-data' | 'invalid-json-data-options' | 'unsupported-json-data-key' | 'json-data-limit-exceeded'>;
export type JSONDataLimitDetails = {
  readonly kind: 'limit'; readonly budget: keyof JSONDataLimits;
  readonly maximum: number; readonly observedAtLeast: number;
};
export type JSONDataResult<T> = Extract<Result<T, JSONDataErrorCode>, { readonly ok: true }>
  | { readonly ok: false; readonly error: Omit<SectileError<JSONDataErrorCode>, 'details'> & { readonly details?: JSONDataLimitDetails } };
export interface JSONTextWork {
  readonly sourceCodeUnits: number; readonly sourceBytes: number;
  readonly values: number; readonly maximumDepth: number;
}
export interface JSONTextSnapshot { readonly data: JSONValue; readonly work: JSONTextWork }
export type JSONTextErrorCode = JSONDataErrorCode | Extract<CoreErrorCode, 'invalid-json-text'>;
export type JSONTextResult<T> = Extract<Result<T, JSONTextErrorCode>, { readonly ok: true }>
  | { readonly ok: false; readonly error: Omit<SectileError<JSONTextErrorCode>, 'details'> & { readonly details?: JSONDataLimitDetails } };

const limitKeys = ['maxInputBytes', 'maxInputValues', 'maxInputDepth', 'maxStringCodeUnits'] as const;

/** Cold O(values + keys + text) validation and one isolated copy; getters/hooks are never executed. */
export function trySnapshotJSON(input: unknown, options: JSONDataOptions): JSONDataResult<JSONDataSnapshot> {
  const resolved = resolveOptions(options);
  return resolved.ok ? inspectData(input, resolved.value.limits, true, resolved.value.prototypeKeys === 'allow') : resolved;
}

/** Same admission/counts without a copied tree or retained caller data; not a schema/provenance certificate. */
export function tryMeasureJSON(input: unknown, options: JSONDataOptions): JSONDataResult<JSONDataWork> {
  const resolved = resolveOptions(options);
  if (!resolved.ok) return resolved;
  const measured = inspectData(input, resolved.value.limits, false, resolved.value.prototypeKeys === 'allow');
  return measured.ok ? { ok: true, value: measured.value.work } : measured;
}

/** Validates and emits in one descriptor-only traversal without a copied data tree or object hooks. */
export function tryStringifyJSON(input: unknown, options: JSONDataOptions): JSONDataResult<JSONDataEncoding> {
  const resolved = resolveOptions(options);
  if (!resolved.ok) return resolved;
  const chunks: string[] = [];
  const inspected = inspectData(input, resolved.value.limits, false, resolved.value.prototypeKeys === 'allow', chunks);
  return inspected.ok ? { ok: true, value: { source: chunks.join(''), work: inspected.value.work } } : inspected;
}

type Container =
  | { readonly kind: 'object'; readonly keys: Set<string>; state: 'first' | 'key' | 'colon' | 'value' | 'after' }
  | { readonly kind: 'array'; state: 'first' | 'value' | 'after' };

/** Guard raw text before one materialization; not envelope or schema admission. */
export function tryParseJSON(source: string, options: JSONDataOptions): JSONTextResult<JSONTextSnapshot> {
  const resolved = resolveOptions(options);
  if (!resolved.ok) return resolved;
  const budget = resolved.value.limits;
  if (typeof source !== 'string') return textFailure('invalid-json-text', 'JSON input must be text');
  let cursor = 0;
  let values = 0;
  let maximumDepth = 0;
  const stack: Container[] = [];
  const invalid = (message: string): never => { throw new TextRejection('invalid-json-text', message); };
  const limit = (key: keyof JSONDataLimits, observed: number): void => {
    if (observed > budget[key]) throw new TextRejection('json-data-limit-exceeded', `JSON input exceeds ${key}`, {
      kind: 'limit', budget: key, maximum: budget[key], observedAtLeast: observed,
    });
  };
  const whitespace = (): void => {
    while (cursor < source.length && (source[cursor] === ' ' || source[cursor] === '\t'
      || source[cursor] === '\n' || source[cursor] === '\r')) cursor++;
  };
  const string = (decode = false): string => {
    const start = cursor++;
    let decodedUnits = 0;
    while (cursor < source.length) {
      const code = source.charCodeAt(cursor++);
      if (code === 34) return decode ? JSON.parse(source.slice(start, cursor)) as string : '';
      if (code < 32) invalid('Unescaped JSON string control character');
      if (code === 92) {
        const escape = source[cursor++];
        if (escape === 'u') {
          for (let index = 0; index < 4; index++) {
            const digit = source.charCodeAt(cursor++);
            if (!((digit >= 48 && digit <= 57) || (digit >= 65 && digit <= 70) || (digit >= 97 && digit <= 102))) {
              invalid('Invalid JSON Unicode escape');
            }
          }
        } else if (!escape || !'"\\/bfnrt'.includes(escape)) invalid('Invalid JSON string escape');
      }
      limit('maxStringCodeUnits', ++decodedUnits);
    }
    return invalid('Unterminated JSON string');
  };
  const value = (): void => {
    const depth = stack.length;
    maximumDepth = Math.max(maximumDepth, depth);
    limit('maxInputDepth', depth);
    limit('maxInputValues', ++values);
    whitespace();
    const first = source[cursor];
    if (first === '{') { cursor++; stack.push({ kind: 'object', keys: new Set(), state: 'first' }); }
    else if (first === '[') { cursor++; stack.push({ kind: 'array', state: 'first' }); }
    else if (first === '"') string();
    else if (source.startsWith('true', cursor)) cursor += 4;
    else if (source.startsWith('false', cursor)) cursor += 5;
    else if (source.startsWith('null', cursor)) cursor += 4;
    else {
      const start = cursor;
      if (source[cursor] === '-') cursor++;
      if (source[cursor] === '0') cursor++;
      else {
        if (!digit(source.charCodeAt(cursor)) || source[cursor] === '0') invalid('Expected JSON value');
        while (digit(source.charCodeAt(cursor))) cursor++;
      }
      if (source[cursor] === '.') {
        cursor++;
        if (!digit(source.charCodeAt(cursor))) invalid('Missing JSON fractional digits');
        while (digit(source.charCodeAt(cursor))) cursor++;
      }
      if (source[cursor] === 'e' || source[cursor] === 'E') {
        cursor++;
        if (source[cursor] === '+' || source[cursor] === '-') cursor++;
        if (!digit(source.charCodeAt(cursor))) invalid('Missing JSON exponent digits');
        while (digit(source.charCodeAt(cursor))) cursor++;
      }
      if (!Number.isFinite(Number(source.slice(start, cursor)))) {
        throw new TextRejection('invalid-json-data', 'JSON numbers must be finite');
      }
    }
  };
  try {
    // UTF-8 size is counted without allocating an encoded copy of foreign input.
    limit('maxInputBytes', source.length);
    let bytes = 0;
    for (let index = 0; index < source.length; index++) {
      const code = source.charCodeAt(index);
      if (code < 128) bytes++;
      else if (code < 2048) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && source.charCodeAt(index + 1) >= 0xdc00 && source.charCodeAt(index + 1) <= 0xdfff) {
        bytes += 4; index++;
      } else bytes += 3;
      limit('maxInputBytes', bytes);
    }
    value();
    while (stack.length) {
      whitespace();
      const parent = stack[stack.length - 1]!;
      const next = source[cursor];
      if (parent.kind === 'object') {
        if (parent.state === 'first' && next === '}') { cursor++; stack.pop(); }
        else if (parent.state === 'first' || parent.state === 'key') {
          if (next !== '"') invalid('Expected JSON object key');
          const key = string(true);
          if (resolved.value.prototypeKeys !== 'allow' && (key === '__proto__' || key === 'constructor' || key === 'prototype')) throw new TextRejection('unsupported-json-data-key', 'Unsupported JSON data key');
          if (parent.keys.has(key)) invalid('Duplicate JSON object key');
          parent.keys.add(key); parent.state = 'colon';
        } else if (parent.state === 'colon') {
          if (next !== ':') invalid('Expected JSON colon');
          cursor++; parent.state = 'value';
        } else if (parent.state === 'value') { parent.state = 'after'; value(); }
        else if (next === '}') { cursor++; stack.pop(); }
        else if (next === ',') { cursor++; parent.state = 'key'; }
        else invalid('Expected JSON object separator');
      } else {
        if (parent.state === 'first' && next === ']') { cursor++; stack.pop(); }
        else if (parent.state === 'first' || parent.state === 'value') { parent.state = 'after'; value(); }
        else if (next === ']') { cursor++; stack.pop(); }
        else if (next === ',') { cursor++; parent.state = 'value'; }
        else invalid('Expected JSON array separator');
      }
    }
    whitespace();
    if (cursor !== source.length) invalid('Unexpected trailing JSON input');
    return { ok: true, value: { data: JSON.parse(source) as JSONValue,
      work: Object.freeze({ sourceCodeUnits: source.length, sourceBytes: bytes, values, maximumDepth }) } };
  } catch (error) {
    if (error instanceof TextRejection) return textFailure(error.code, error.message, error.details);
    if (error instanceof SyntaxError) return textFailure('invalid-json-text', 'Malformed JSON input');
    throw error;
  }
}

function digit(code: number): boolean { return code >= 48 && code <= 57; }
class TextRejection extends Error {
  public readonly code: JSONTextErrorCode;
  public readonly details: JSONDataLimitDetails | undefined;
  public constructor(code: JSONTextErrorCode, message: string, details?: JSONDataLimitDetails) {
    super(message); this.code = code; this.details = details;
  }
}
function textFailure<T>(code: JSONTextErrorCode, message: string, details?: JSONDataLimitDetails): JSONTextResult<T> {
  return failResult(code === 'json-data-limit-exceeded' ? 'resource-rejection' : 'construction', code, message, details) as JSONTextResult<T>;
}

function resolveOptions(input: JSONDataOptions): JSONDataResult<JSONDataOptions> {
  const invalid = (): JSONDataResult<JSONDataOptions> => failure('invalid-json-data-options', 'JSON options require explicit finite positive data limits');
  try {
    if (!plainRecord(input)) return invalid();
    const keys = inputKeys(input);
    if (keys.length > 2) return invalid();
    let limits: unknown;
    let prototypeKeys: 'allow' | 'reject' = 'reject';
    for (const key of keys) {
      if (key !== 'limits' && key !== 'prototypeKeys') return invalid();
      const field = inputDescriptor(input, key);
      if (!field.enumerable || !Object.hasOwn(field, 'value')) return invalid();
      if (key === 'limits') limits = field.value;
      else {
        if (field.value !== 'allow' && field.value !== 'reject') return invalid();
        prototypeKeys = field.value;
      }
    }
    if (!plainRecord(limits)) return invalid();
    const fields = inputKeys(limits);
    if (fields.length !== limitKeys.length) return invalid();
    const output = {} as Record<keyof JSONDataLimits, number>;
    for (const key of fields) {
      if (typeof key !== 'string' || !limitKeys.includes(key as keyof JSONDataLimits)) return invalid();
      const field = inputDescriptor(limits, key);
      if (!field.enumerable || !Object.hasOwn(field, 'value') || !Number.isSafeInteger(field.value) || field.value <= 0) return invalid();
      Object.defineProperty(output, key, { value: field.value, enumerable: true });
    }
    return { ok: true, value: { limits: output, prototypeKeys } };
  } catch (error) {
    if (error instanceof InputRejection) return invalid();
    throw error;
  }
}
function plainRecord(input: unknown): input is object {
  if (input === null || typeof input !== 'object' || inputIsArray(input)) return false;
  const prototype = inputPrototype(input);
  return prototype === Object.prototype || prototype === null;
}

function inspectData(input: unknown, budget: JSONDataLimits, copy: boolean, allowPrototypeKeys: boolean, chunks?: string[]): JSONDataResult<JSONDataSnapshot> {
  type Frame = { readonly input: object; readonly output: object; readonly keys: readonly PropertyKey[]; readonly depth: number; readonly array: boolean; index: number };
  const stack: Frame[] = [];
  const active = new WeakSet<object>();
  let values = 0;
  let maximumDepth = 0;
  let encodedBytes = 0;
  const invalid = (message: string): never => { throw new InputRejection('invalid-json-data', message); };
  const limit = (key: keyof JSONDataLimits, observed: number): void => {
    if (observed > budget[key]) throw new InputRejection('json-data-limit-exceeded', 'JSON input exceeds its execution ceiling', {
      kind: 'limit', budget: key, maximum: budget[key], observedAtLeast: observed,
    });
  };
  const bytes = (count: number): void => { encodedBytes += count; limit('maxInputBytes', encodedBytes); };
  const text = (value: string): void => {
    limit('maxStringCodeUnits', value.length);
    bytes(2);
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code === 34 || code === 92 || code === 8 || code === 9 || code === 10 || code === 12 || code === 13) bytes(2);
      else if (code < 32) bytes(6);
      else if (code < 128) bytes(1);
      else if (code < 2048) bytes(2);
      else if (code >= 0xd800 && code <= 0xdbff && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
        bytes(4); index++;
      } else if (code >= 0xd800 && code <= 0xdfff) bytes(6);
      else bytes(3);
    }
  };
  const visit = (value: unknown, depth: number): JSONValue => {
    limit('maxInputValues', ++values);
    maximumDepth = Math.max(maximumDepth, depth);
    limit('maxInputDepth', depth);
    if (value === null) { bytes(4); chunks?.push('null'); return null; }
    if (typeof value === 'boolean') { bytes(value ? 4 : 5); chunks?.push(value ? 'true' : 'false'); return value; }
    if (typeof value === 'string') { text(value); if (chunks) chunks.push(JSON.stringify(value)); return value; }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) invalid('JSON numbers must be finite');
      const source = String(value);
      bytes(source.length); chunks?.push(source); return value;
    }
    if (typeof value !== 'object' || !value) return invalid('JSON input requires plain JSON data');
    const array = inputIsArray(value);
    const prototype = inputPrototype(value);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      return invalid('JSON input requires plain data records or arrays');
    }
    if (active.has(value)) return invalid('JSON input contains an object cycle');
    const length: unknown = array ? inputDescriptor(value, 'length').value : 0;
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) return invalid('JSON arrays require a finite nonnegative integer length');
    if (array) limit('maxInputValues', values + length);
    const ownKeys = inputKeys(value);
    const keys = array ? ownKeys.filter((key) => key !== 'length') : ownKeys;
    limit('maxInputValues', values + keys.length);
    if (array && keys.length !== length) return invalid('JSON arrays must be dense and have no extra properties');
    const output: object = copy ? array ? new Array<JSONValue>(length) : {} : value;
    bytes(2 + Math.max(0, keys.length - 1));
    chunks?.push(array ? '[' : '{');
    active.add(value);
    stack.push({ input: value, output, keys, depth, array, index: 0 });
    return output as JSONValue;
  };
  try {
    const data = visit(input, 0);
    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      if (frame.index === frame.keys.length) {
        chunks?.push(frame.array ? ']' : '}');
        active.delete(frame.input); stack.pop(); continue;
      }
      const index = frame.index++;
      if (index > 0) chunks?.push(',');
      const key = frame.keys[index]!;
      if (typeof key !== 'string' || (!allowPrototypeKeys && (key === '__proto__' || key === 'prototype' || key === 'constructor'))) {
        throw new InputRejection('unsupported-json-data-key', 'JSON input contains an unsupported data key');
      }
      if (frame.array) {
        if (key !== String(index)) invalid('JSON arrays must have only ordered index properties');
      } else { text(key); bytes(1); if (chunks) chunks.push(JSON.stringify(key), ':'); }
      const field = inputDescriptor(frame.input, key);
      if (!Object.hasOwn(field, 'value') || !field.enumerable) invalid('JSON input requires own enumerable data properties');
      const value = visit(field.value, frame.depth + 1);
      if (copy) Object.defineProperty(frame.output, key, { value, enumerable: true, configurable: true, writable: true });
    }
    return { ok: true, value: { data, work: Object.freeze({ values, maximumDepth, encodedBytes }) } };
  } catch (error) {
    if (error instanceof InputRejection) return failure(error.code, error.message, error.details);
    throw error;
  }
}

function inputIsArray(input: unknown): boolean {
  try { return Array.isArray(input); }
  catch { throw new InputRejection('invalid-json-data', 'JSON input cannot be inspected'); }
}
function inputPrototype(input: object): object | null {
  try { return Object.getPrototypeOf(input) as object | null; }
  catch { throw new InputRejection('invalid-json-data', 'JSON input cannot be inspected'); }
}
function inputKeys(input: object): readonly PropertyKey[] {
  try { return Reflect.ownKeys(input); }
  catch { throw new InputRejection('invalid-json-data', 'JSON input cannot be inspected'); }
}
function inputDescriptor(input: object, key: PropertyKey): PropertyDescriptor {
  let field: PropertyDescriptor | undefined;
  try { field = Object.getOwnPropertyDescriptor(input, key); }
  catch { throw new InputRejection('invalid-json-data', 'JSON input cannot be inspected'); }
  if (!field) throw new InputRejection('invalid-json-data', 'JSON input changed during inspection');
  return field;
}
class InputRejection extends Error {
  public readonly code: JSONDataErrorCode;
  public readonly details: JSONDataLimitDetails | undefined;
  public constructor(code: JSONDataErrorCode, message: string, details?: JSONDataLimitDetails) {
    super(message); this.code = code; this.details = details;
  }
}
function failure<T>(code: JSONDataErrorCode, message: string, details?: JSONDataLimitDetails): JSONDataResult<T> {
  return failResult(code === 'json-data-limit-exceeded' ? 'resource-rejection' : 'construction', code, message, details) as JSONDataResult<T>;
}
