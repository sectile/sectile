import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { StepperEvent, StepperState } from '@sectile/core/stepper';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateTabs, type TabsConnection, type TabsOptions } from './tabs.js';

export type StepperOptions<ID extends StableID = StableID> = TabsOptions<ID>;
export interface StepperConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<StepperState<ID>>;
  syncControlledValues(values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<StepperState<ID>>>;
  setStepAttributes(element: HTMLElement, attributes: { readonly id: ID; readonly panelID?: string; readonly disabled?: boolean }): void;
  setPanelAttributes(element: HTMLElement, id: ID, stepID?: string): void;
  handleEvent(event: StepperEvent<ID>): boolean;
  disconnect(): void;
}
export function createStepper<ID extends StableID>(options: StepperOptions<ID>): FacadeConnection<StepperConnection<ID>> {
  return unwrap(tryCreateStepper(options));
}

export function tryCreateStepper<ID extends StableID>(options: StepperOptions<ID>): Result<FacadeConnection<StepperConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateStepperConnection(options));
}

function tryCreateStepperConnection<ID extends StableID>(options: StepperOptions<ID>): Result<StepperConnection<ID>> {
  const result = tryCreateTabs(options); if (!result.ok) return result;
  options.root.setAttribute('aria-roledescription', 'stepper');
  return { ok: true, value: wrapStepper(result.value) };
}
function wrapStepper<ID extends StableID>(connection: TabsConnection<ID>): StepperConnection<ID> {
  return Object.freeze({
    getSnapshot: () => connection.getSnapshot(),
    syncControlledValues: (values: { readonly value?: ID | null; readonly highlightedValue?: ID | null }) => connection.syncControlledValues(values),
    setStepAttributes: (element: HTMLElement, attributes: { readonly id: ID; readonly panelID?: string; readonly disabled?: boolean }) => connection.setItemAttributes(element, attributes),
    setPanelAttributes: (element: HTMLElement, id: ID, stepID?: string) => connection.setPanelAttributes(element, id, stepID),
    handleEvent: (event: StepperEvent<ID>) => connection.handleEvent(toTabsEvent(event)),
    disconnect: () => connection.disconnect(),
  });
}
function toTabsEvent<ID extends StableID>(event: StepperEvent<ID>) {
  if (typeof event === 'object') return { type: event.type === 'focus-step' ? 'focus' as const : 'select' as const, id: event.id };
  return event === 'next-step' ? 'next' as const : event === 'previous-step' ? 'previous' as const : event === 'first-step' ? 'first' as const : event === 'last-step' ? 'last' as const : 'activate' as const;
}
