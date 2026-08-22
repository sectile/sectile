import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { StepperEvent, StepperState } from '@sectile/core/stepper';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateTabs, type TabsOptions } from './tabs.js';
import type { TerminalKeyboardInput } from './keyboard.js';
export type StepperOptions<ID extends StableID = StableID> = TabsOptions<ID>;
export interface StepperConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<StepperState<ID>>; syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<StepperState<ID>>>; handleEvent(event: StepperEvent<ID>): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean }
export function createStepper<ID extends StableID>(options: StepperOptions<ID>): FacadeConnection<StepperConnection<ID>> {
  return unwrap(tryCreateStepper(options));
}

export function tryCreateStepper<ID extends StableID>(options: StepperOptions<ID>): Result<FacadeConnection<StepperConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateStepperConnection(options));
}

function tryCreateStepperConnection<ID extends StableID>(options: StepperOptions<ID>): Result<StepperConnection<ID>> { const result = tryCreateTabs(options); if (!result.ok) return result; const connection = result.value; return { ok: true, value: Object.freeze({ getSnapshot: () => connection.getSnapshot(), syncControlledValues: (values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }) => connection.syncControlledValues(values), handleEvent: (event: StepperEvent<ID>) => connection.handleEvent(mapEvent(event)), handleKeyboardInput: (input: TerminalKeyboardInput) => connection.handleKeyboardInput(input) }) }; }
function mapEvent<ID extends StableID>(event: StepperEvent<ID>) { if (typeof event === 'object') return { type: event.type === 'focus-step' ? 'focus' as const : 'select' as const, id: event.id }; return event === 'next-step' ? 'next' as const : event === 'previous-step' ? 'previous' as const : event === 'first-step' ? 'first' as const : event === 'last-step' ? 'last' as const : 'activate' as const; }
