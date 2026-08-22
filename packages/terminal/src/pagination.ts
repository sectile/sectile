import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { PaginationEvent, PaginationState } from '@sectile/core/pagination';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateRadioGroup, type RadioGroupOptions } from './radio-group.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type PaginationOptions<ID extends StableID = StableID> = Omit<RadioGroupOptions<ID>, 'orientation' | 'onValueChange' | 'onHighlightedValueChange'> & { readonly onPageChange?: (page: ID | null) => void };
export interface PaginationConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<PaginationState<ID>>; syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<PaginationState<ID>>>; handleEvent(event: PaginationEvent<ID>): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean }
export function createPagination<ID extends StableID>(options: PaginationOptions<ID>): FacadeConnection<PaginationConnection<ID>> {
  return unwrap(tryCreatePagination(options));
}

export function tryCreatePagination<ID extends StableID>(options: PaginationOptions<ID>): Result<FacadeConnection<PaginationConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreatePaginationConnection(options));
}

function tryCreatePaginationConnection<ID extends StableID>(options: PaginationOptions<ID>): Result<PaginationConnection<ID>> {
  const result = tryCreateRadioGroup({ ...options, orientation: 'horizontal', ...(options.onPageChange === undefined ? {} : { onValueChange: options.onPageChange }) });
  if (!result.ok) return result; const connection = result.value;
  return { ok: true, value: Object.freeze({ getSnapshot: () => connection.getSnapshot(), syncControlledValues: (values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }) => connection.syncControlledValues(values), handleEvent: (event: PaginationEvent<ID>) => connection.handleEvent(mapEvent(event)), handleKeyboardInput: (input: TerminalKeyboardInput) => connection.handleKeyboardInput(input) }) };
}
function mapEvent<ID extends StableID>(event: PaginationEvent<ID>) { if (typeof event === 'object') return { type: 'check' as const, id: event.id }; return event === 'next-page' ? 'next' as const : event === 'previous-page' ? 'previous' as const : event === 'first-page' ? 'first' as const : 'last' as const; }
