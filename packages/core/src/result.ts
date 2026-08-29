import type { ErrorClass, Result, SectileError } from './shared.js';
import type { CoreErrorCode } from './error-code.js';

export { fail as failResult, ok as okResult } from './internal/kernel/foundation.js';

export class SectileResultError<Code extends string = CoreErrorCode>
  extends Error implements SectileError<Code> {
  public readonly class: ErrorClass;
  public readonly code: Code;
  public readonly details?: Readonly<Record<string, unknown>>;

  public constructor(error: SectileError<Code>) {
    super(error.message, { cause: error });
    this.name = 'SectileResultError';
    this.class = error.class;
    this.code = error.code;
    if (error.details !== undefined) this.details = error.details;
  }
}

export function unwrap<T, Code extends string>(result: Result<T, Code>): T {
  if (result.ok) return result.value;
  throw new SectileResultError(result.error);
}

export type { ErrorClass, Result, SectileError } from './shared.js';
export type { CoreErrorCode } from './error-code.js';
