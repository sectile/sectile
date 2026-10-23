import { failResult, okResult, unwrap, type Result } from '@sectile/core/result';
import { isWellFormedPlainText } from '@sectile/core/text';
import { connectNativeDragSource, connectNativeDropTarget, isAsyncTransferValue, type DataTransferConnection, type DragSourceOptions, type DropTargetOptions } from './drag-drop-native.js';

export type { DataTransferOperation, DataTransferSnapshot, DataTransferCommit, DataTransferRequest, DataTransferConnection, DragSourceOptions, DropTargetOptions } from './drag-drop-native.js';

/** A string format, not a File, native event or proof of a trusted source. */
export interface DataTransferPayload {
  readonly type: string;
  readonly data: string;
}

export interface DataTransferFormatOptions<Value> {
  /** One concrete MIME essence, without parameters or wildcard groups. */
  readonly type: string;
  /** Exact UTF-8 byte ceiling. Empty text is allowed when this is zero. */
  readonly maxBytes: number;
  readonly encode: (this: void, value: NoInfer<Value>) => string;
  /** Validate the application schema here; matching MIME does not establish trust. */
  readonly decode: (this: void, source: string) => Result<Value, string>;
}

export interface DataTransferFormat<Value> {
  readonly type: string;
  readonly maxBytes: number;
  read(payload: unknown): Result<Value, DataTransferErrorCode>;
  write(value: NoInfer<Value>): Result<DataTransferPayload, DataTransferErrorCode>;
}

export type DataTransferErrorCode =
  | 'dom.data-transfer-format-invalid'
  | 'dom.data-transfer-type-rejected'
  | 'dom.data-transfer-size-exceeded'
  | 'dom.data-transfer-payload-invalid'
  | 'dom.data-transfer-codec-failed'
  | 'dom.data-transfer-decode-rejected'
  | 'dom.data-transfer-native-invalid'
  | 'dom.data-transfer-inactive'
  | 'dom.data-transfer-operation-rejected'
  | 'dom.data-transfer-provider-failed'
  | 'dom.data-transfer-commit-failed'
  | 'dom.data-transfer-unavailable';

interface FormatConfiguration<Value> {
  readonly type: string;
  readonly maxBytes: number;
  readonly encode: DataTransferFormatOptions<Value>['encode'];
  readonly decode: DataTransferFormatOptions<Value>['decode'];
}

// RFC 6838 restricted names: 1..127 ASCII characters per component.
const concreteMIME = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/u;
const formats = /* @__PURE__ */ new WeakSet<object>();
function canonical(format: unknown): boolean { return typeof format === 'object' && format !== null && formats.has(format); }
function own(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}
function invalidFormat(): Result<never, DataTransferErrorCode> {
  return failResult('construction', 'dom.data-transfer-format-invalid', 'A concrete MIME, byte ceiling and synchronous codecs are required');
}
function invalidPayload(): Result<never, DataTransferErrorCode> {
  return failResult('transition-rejection', 'dom.data-transfer-payload-invalid', 'A well-formed string payload is required');
}
function failedCodec(): Result<never, DataTransferErrorCode> {
  return failResult('transition-rejection', 'dom.data-transfer-codec-failed', 'The synchronous transfer codec did not complete');
}
function admitText(value: unknown, maxBytes: number): Result<string, DataTransferErrorCode> {
  if (typeof value !== 'string') return invalidPayload();
  // Every well-formed code unit consumes at least one UTF-8 byte. Reject before allocation.
  if (value.length > maxBytes) return failResult('transition-rejection', 'dom.data-transfer-size-exceeded', 'The transfer exceeds its byte ceiling');
  if (!isWellFormedPlainText(value)) return invalidPayload();
  try {
    if (new TextEncoder().encode(value).byteLength > maxBytes)
      return failResult('transition-rejection', 'dom.data-transfer-size-exceeded', 'The transfer exceeds its byte ceiling');
  } catch {
    return failResult('resource-rejection', 'dom.data-transfer-unavailable', 'Native UTF-8 admission is unavailable');
  }
  // An admitted small substring must not retain the foreign source's backing storage.
  return okResult(Array.from(value).join(''));
}

function createFormat<Value>(config: FormatConfiguration<Value>): DataTransferFormat<Value> {
  const format: DataTransferFormat<Value> = Object.freeze({
    type: config.type,
    maxBytes: config.maxBytes,
    read(payload: unknown): Result<Value, DataTransferErrorCode> {
      let text: Result<string, DataTransferErrorCode>;
      try {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return invalidPayload();
        const type = own(payload, 'type');
        if (typeof type !== 'string' || type.length > 255 || type.toLowerCase() !== config.type)
          return failResult('transition-rejection', 'dom.data-transfer-type-rejected', 'The transfer format is not allowed');
        text = admitText(own(payload, 'data'), config.maxBytes);
      } catch { return invalidPayload(); }
      if (!text.ok) return text;
      try {
        const decode = config.decode, decoded: unknown = decode(text.value);
        if (isAsyncTransferValue(decoded) || !decoded || typeof decoded !== 'object') return failedCodec();
        const ok = own(decoded, 'ok');
        if (ok === false) return failResult('transition-rejection', 'dom.data-transfer-decode-rejected', 'The application rejected the transfer schema');
        const value = Object.getOwnPropertyDescriptor(decoded, 'value');
        if (ok !== true || !value || !('value' in value)) return failedCodec();
        return okResult(value.value as Value);
      } catch { return failedCodec(); }
    },
    write(value: NoInfer<Value>): Result<DataTransferPayload, DataTransferErrorCode> {
      let encoded: unknown;
      try {
        const encode = config.encode;
        encoded = encode(value);
        if (isAsyncTransferValue(encoded) || typeof encoded !== 'string') return failedCodec();
      } catch { return failedCodec(); }
      const text = admitText(encoded, config.maxBytes);
      return text.ok ? okResult(Object.freeze({ type: config.type, data: text.value })) : text;
    },
  });
  formats.add(format);
  return format;
}

export function tryCreateDataTransferFormat<Value>(options: DataTransferFormatOptions<Value>): Result<DataTransferFormat<Value>, DataTransferErrorCode> {
  try {
    if (!options || typeof options !== 'object' || Array.isArray(options)) return invalidFormat();
    const type = own(options, 'type'), maxBytes = own(options, 'maxBytes');
    const encode = own(options, 'encode'), decode = own(options, 'decode');
    if (typeof type !== 'string' || type.length > 255 || !concreteMIME.test(type.toLowerCase())
      || typeof maxBytes !== 'number' || !Number.isSafeInteger(maxBytes) || maxBytes < 0
      || typeof encode !== 'function' || typeof decode !== 'function') return invalidFormat();
    return okResult(createFormat<Value>({ type: type.toLowerCase(), maxBytes,
      encode: encode as DataTransferFormatOptions<Value>['encode'], decode: decode as DataTransferFormatOptions<Value>['decode'] }));
  } catch { return invalidFormat(); }
}

export function createDataTransferFormat<Value>(options: DataTransferFormatOptions<Value>): DataTransferFormat<Value> {
  return unwrap(tryCreateDataTransferFormat(options));
}

export function connectDragSource<Value>(options: DragSourceOptions<Value>): Result<DataTransferConnection, DataTransferErrorCode> {
  return connectNativeDragSource(options, canonical);
}
export function connectDropTarget<Value>(options: DropTargetOptions<Value>): Result<DataTransferConnection, DataTransferErrorCode> {
  return connectNativeDropTarget(options, canonical);
}
