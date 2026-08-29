import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { RatingEvent, RatingState } from '@sectile/core/rating';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateRadioGroup, type RadioGroupConnection, type RadioGroupOptions } from './radio-group.js';

export type RatingOptions<ID extends StableID = StableID> = Omit<RadioGroupOptions<ID>, 'orientation' | 'onValueChange'> & { readonly clearable?: boolean; readonly onValueChange?: (value: ID | null) => void };

export type RatingValueChangeHandler<ID extends StableID = StableID> = NonNullable<RatingOptions<ID>['onValueChange']>;
export interface RatingConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<RatingState<ID>>; syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<RatingState<ID>>>; setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void; handleEvent(event: RatingEvent<ID>): boolean; disconnect(): void }
export function createRating<ID extends StableID>(options: RatingOptions<ID>): FacadeConnection<RatingConnection<ID>> {
  return unwrap(tryCreateRating(options));
}

export function tryCreateRating<ID extends StableID>(options: RatingOptions<ID>): Result<FacadeConnection<RatingConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateRatingConnection(options));
}

function tryCreateRatingConnection<ID extends StableID>(options: RatingOptions<ID>): Result<RatingConnection<ID>> {
  const uncontrolled = options.value === undefined; let value = options.value ?? options.defaultValue ?? null; let highlightedValue = options.highlightedValue ?? options.defaultHighlightedValue ?? value; let base: RadioGroupConnection<ID>; let active = true;
  const result = tryCreateRadioGroup({ ...options, orientation: 'horizontal', value, highlightedValue, onValueChange: (next) => { options.onValueChange?.(next); if (uncontrolled) { value = next; queueMicrotask(sync); } }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } });
  if (!result.ok) return result; base = result.value;
  function sync(): void { if (active) base.syncControlledValues({ value, highlightedValue }); }
  return { ok: true, value: Object.freeze({ getSnapshot: () => base.getSnapshot(), syncControlledValues: (values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }) => { if (values.value !== undefined) value = values.value; if (values.highlightedValue !== undefined) highlightedValue = values.highlightedValue; return base.syncControlledValues({ value, highlightedValue }); }, setItemAttributes: (element: HTMLElement, id: ID, disabled?: boolean) => { base.setItemAttributes(element, id, disabled); element.setAttribute('aria-label', `${id} rating`); }, handleEvent: (event: RatingEvent<ID>) => { if (event === 'clear') { if (options.clearable !== true) return false; options.onValueChange?.(null); if (uncontrolled) { value = null; return base.syncControlledValues({ value, highlightedValue }).ok; } return true; } return base.handleEvent(mapEvent(event)); }, disconnect: () => { active = false; base.disconnect(); } }) };
}
function mapEvent<ID extends StableID>(event: Exclude<RatingEvent<ID>, 'clear'>) { if (typeof event === 'object') return event.type === 'set' ? { type: 'check' as const, id: event.id } : event; return event === 'increase' ? 'next' as const : event === 'decrease' ? 'previous' as const : event === 'minimum' ? 'first' as const : event === 'maximum' ? 'last' as const : 'check' as const; }
