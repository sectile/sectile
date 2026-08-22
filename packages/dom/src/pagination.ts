import type { Result, StableID } from '@sectile/core';
import type { PaginationEvent, PaginationState } from '@sectile/core/pagination';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { createRadioGroup, type RadioGroupConnection, type RadioGroupOptions } from './radio-group.js';

export type PaginationOptions<ID extends StableID = StableID> = Omit<RadioGroupOptions<ID>, 'orientation' | 'onValueChange' | 'onHighlightedValueChange'> & { readonly onPageChange?: (page: ID | null) => void };
export interface PaginationConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<PaginationState<ID>>; syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<PaginationState<ID>>>; setPageAttributes(element: HTMLElement, id: ID, disabled?: boolean): void; handleEvent(event: PaginationEvent<ID>): boolean; disconnect(): void }

export function createPagination<ID extends StableID>(options: PaginationOptions<ID>): Result<PaginationConnection<ID>> {
  const result = createRadioGroup({ ...options, orientation: 'horizontal', ...(options.onPageChange === undefined ? {} : { onValueChange: options.onPageChange }) });
  if (!result.ok) return result;
  options.root.setAttribute('role', 'navigation'); options.root.removeAttribute('aria-orientation');
  return { ok: true, value: wrap(result.value, options.root) };
}
function wrap<ID extends StableID>(connection: RadioGroupConnection<ID>, root: HTMLElement): PaginationConnection<ID> { return Object.freeze({ getSnapshot: () => connection.getSnapshot(), syncControlledValues: (values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }) => connection.syncControlledValues(values), setPageAttributes: (element: HTMLElement, id: ID, disabled?: boolean): void => { connection.setItemAttributes(element, id, disabled); element.removeAttribute('role'); element.removeAttribute('aria-checked'); if (connection.getSnapshot().state.selection.has(id)) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current'); element.setAttribute('aria-label', `Page ${id}`); }, handleEvent: (event: PaginationEvent<ID>) => connection.handleEvent(mapEvent(event)), disconnect: (): void => { connection.disconnect(); root.removeAttribute('role'); } }); }
function mapEvent<ID extends StableID>(event: PaginationEvent<ID>) { if (typeof event === 'object') return { type: 'check' as const, id: event.id }; return event === 'next-page' ? 'next' as const : event === 'previous-page' ? 'previous' as const : event === 'first-page' ? 'first' as const : 'last' as const; }
