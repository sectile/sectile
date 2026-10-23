import { failResult, okResult } from '@sectile/core/result';
import { FormResultError, type FormResult } from './error.js';
import { DEFAULT_LIMITS } from './internal/construction/limits.js';

/** Renderer-neutral metadata; native File objects satisfy this contract. */
export interface FileMetadata { readonly name: string; readonly size: number; readonly type: string }
export interface FilePolicyOptions {
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly maxFiles?: number;
  /** Byte limits, including zero-byte-only policies. */
  readonly maxFileSize?: number;
  readonly maxTotalSize?: number;
  readonly maxAcceptCodeUnits?: number;
  readonly maxMetadataCodeUnits?: number;
}
export interface FileSelection<T extends FileMetadata = FileMetadata> {
  readonly files: readonly T[];
  readonly totalSize: number;
}
export type FilePolicyErrorCode = 'form-file-policy-invalid' | 'form-file-selection-invalid'
  | 'form-file-count-exceeded' | 'form-file-size-exceeded' | 'form-file-total-size-exceeded'
  | 'form-file-type-rejected' | 'form-file-metadata-ceiling-exceeded';
export interface FilePolicy extends Required<FilePolicyOptions> {
  /** Atomic admission; copies the array, preserves file identity, and reads no bytes. */
  validate<T extends FileMetadata>(files: ArrayLike<T>): FormResult<FileSelection<T>, FilePolicyErrorCode>;
}
interface Matcher { readonly types: ReadonlySet<string>; readonly groups: ReadonlySet<string>; readonly extensions: readonly string[] }
type Configuration = Readonly<Required<FilePolicyOptions>>;
const keys = ['accept', 'multiple', 'maxFiles', 'maxFileSize', 'maxTotalSize', 'maxAcceptCodeUnits', 'maxMetadataCodeUnits'] as const;
const mime = /^[!#$%&'*+.^_`|~0-9a-z-]+\/[!#$%&'*+.^_`|~0-9a-z-]+$/u;
const asciiCharacter = (value: string): string => String.fromCharCode(value.charCodeAt(0) + 32);
function lower(value: string): string { return value.replace(/[A-Z]/gu, asciiCharacter); }
function reverse(value: string): string { return value.split('').reverse().join(''); }
function reject(code: FilePolicyErrorCode, details?: Readonly<Record<string, unknown>>): FormResult<never, FilePolicyErrorCode> {
  return failResult(code === 'form-file-policy-invalid' || code === 'form-file-selection-invalid' ? 'construction'
    : code === 'form-file-type-rejected' ? 'transition-rejection' : 'resource-rejection', code, 'File selection does not satisfy its policy.', details);
}

export function createFilePolicy(options: FilePolicyOptions = {}): FilePolicy {
  const result = tryCreateFilePolicy(options);
  if (!result.ok) throw new FormResultError(result.error);
  return result.value;
}
export function tryCreateFilePolicy(options: FilePolicyOptions = {}): FormResult<FilePolicy, FilePolicyErrorCode> {
  if (options === null || typeof options !== 'object') return reject('form-file-policy-invalid');
  const captured: Record<string, unknown> = {};
  try { if (Array.isArray(options)) return reject('form-file-policy-invalid'); for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (descriptor === undefined) continue;
    if (!('value' in descriptor) || descriptor.value === null) return reject('form-file-policy-invalid', { key });
    captured[key] = descriptor.value;
  } } catch { return reject('form-file-policy-invalid'); }
  const multiple = captured['multiple'] ?? false, accept = captured['accept'] ?? '';
  if (typeof multiple !== 'boolean' || typeof accept !== 'string') return reject('form-file-policy-invalid');
  const configuration: Configuration = {
    accept, multiple,
    maxFiles: (captured['maxFiles'] ?? (multiple ? DEFAULT_LIMITS.maxEntries : 1)) as number,
    maxFileSize: (captured['maxFileSize'] ?? Number.MAX_SAFE_INTEGER) as number,
    maxTotalSize: (captured['maxTotalSize'] ?? Number.MAX_SAFE_INTEGER) as number,
    maxAcceptCodeUnits: (captured['maxAcceptCodeUnits'] ?? DEFAULT_LIMITS.maxPathCodeUnits) as number,
    maxMetadataCodeUnits: (captured['maxMetadataCodeUnits'] ?? DEFAULT_LIMITS.maxPathCodeUnits) as number,
  };
  for (const key of ['maxFiles', 'maxFileSize', 'maxTotalSize', 'maxAcceptCodeUnits', 'maxMetadataCodeUnits'] as const) {
    if (!Number.isSafeInteger(configuration[key]) || configuration[key] < (key === 'maxFileSize' || key === 'maxTotalSize' ? 0 : 1)) return reject('form-file-policy-invalid', { key });
  }
  if ((!multiple && configuration.maxFiles !== 1) || accept.length > configuration.maxAcceptCodeUnits) return reject('form-file-policy-invalid');
  const types = new Set<string>(), groups = new Set<string>(), seen = new Set<string>(), extensions: string[] = [], tokens: string[] = [];
  if (accept.trim()) for (const raw of accept.split(',')) {
    const token = lower(raw.trim());
    if (!token || seen.has(token)) return reject('form-file-policy-invalid');
    seen.add(token); tokens.push(token);
    if (token === 'audio/*' || token === 'video/*' || token === 'image/*') groups.add(token.slice(0, -2));
    else if (token.startsWith('.')) {
      if (token.length === 1 || /[\s,\/\\\u0000-\u001f\u007f]/u.test(token)) return reject('form-file-policy-invalid');
      extensions.push(reverse(token));
    }
    else if (mime.test(token) && !token.includes('*')) types.add(token);
    else return reject('form-file-policy-invalid');
  }
  // Prefix-free reversed suffixes allow one binary predecessor, not a token scan per file.
  extensions.sort(); const compact: string[] = [];
  for (const extension of extensions) if (!compact.length || !extension.startsWith(compact[compact.length - 1]!)) compact.push(extension);
  return okResult<FilePolicy, FilePolicyErrorCode>(makePolicy(Object.freeze({ ...configuration, accept: tokens.join(',') }), { types, groups, extensions: compact }));
}

function makePolicy(configuration: Configuration, matcher: Matcher): FilePolicy {
  // Retain only normalized policy data, never the caller's options or selected files.
  return Object.freeze({ ...configuration, validate: <T extends FileMetadata>(files: ArrayLike<T>): FormResult<FileSelection<T>, FilePolicyErrorCode> => validate(files, configuration, matcher) });
}
function matches(name: string, type: string, matcher: Matcher): boolean {
  if (!matcher.types.size && !matcher.groups.size && !matcher.extensions.length) return true;
  const normalizedType = lower(type), slash = normalizedType.indexOf('/');
  if (mime.test(normalizedType) && (matcher.types.has(normalizedType) || matcher.groups.has(normalizedType.slice(0, slash)))) return true;
  if (!matcher.extensions.length) return false;
  const candidate = reverse(lower(name)); let low = 0, high = matcher.extensions.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (matcher.extensions[middle]! <= candidate) low = middle + 1; else high = middle;
  }
  return low > 0 && candidate.startsWith(matcher.extensions[low - 1]!);
}
function validate<T extends FileMetadata>(files: ArrayLike<T>, policy: Configuration, matcher: Matcher): FormResult<FileSelection<T>, FilePolicyErrorCode> {
  let length: number;
  try { if (files === null || typeof files !== 'object') return reject('form-file-selection-invalid'); length = files.length; }
  catch { return reject('form-file-selection-invalid'); }
  if (!Number.isSafeInteger(length) || length < 0) return reject('form-file-selection-invalid');
  if (length > policy.maxFiles) return reject('form-file-count-exceeded', { actual: length, ceiling: policy.maxFiles });
  let totalSize = 0, remaining = policy.maxMetadataCodeUnits;
  const accepted: T[] = [];
  for (let index = 0; index < length; index++) {
    let file: T, name: string, size: number, type: string;
    try {
      file = files[index]!;
      if (file === null || typeof file !== 'object') return reject('form-file-selection-invalid', { index });
      name = file.name; size = file.size; type = file.type;
    } catch { return reject('form-file-selection-invalid', { index }); }
    if (typeof name !== 'string' || !name || typeof type !== 'string' || !Number.isSafeInteger(size) || size < 0) return reject('form-file-selection-invalid', { index });
    if (name.length > remaining || type.length > remaining - name.length) return reject('form-file-metadata-ceiling-exceeded', { index });
    remaining -= name.length + type.length;
    if (size > policy.maxFileSize) return reject('form-file-size-exceeded', { index, actual: size, ceiling: policy.maxFileSize });
    if (size > policy.maxTotalSize - totalSize) return reject('form-file-total-size-exceeded', { index, ceiling: policy.maxTotalSize });
    if (!matches(name, type, matcher)) return reject('form-file-type-rejected', { index });
    totalSize += size; accepted.push(file);
  }
  return okResult<FileSelection<T>, FilePolicyErrorCode>(Object.freeze({ files: Object.freeze(accepted), totalSize }));
}
