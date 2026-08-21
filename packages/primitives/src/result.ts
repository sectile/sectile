import type { ErrorClass, Result, SectileError } from './shared.js';

export class SectileResultError extends Error implements SectileError {
  public readonly class: ErrorClass;
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  public constructor(error: SectileError) {
    super(error.message, { cause: error });
    this.name = 'SectileResultError';
    this.class = error.class;
    this.code = error.code;
    if (error.details !== undefined) this.details = error.details;
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value;
  throw new SectileResultError(result.error);
}

export type { ErrorClass, Result, SectileError } from './shared.js';
