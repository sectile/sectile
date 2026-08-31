export type PickerCapabilityGranularity = 'day' | 'month' | 'year';

export interface PickerCapabilityConnection {
  getSnapshot(): { readonly state: unknown };
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly CalendarMonthValue[])[];
  syncControlledValues(values: Record<string, unknown>): { readonly ok: boolean; readonly error?: { readonly message: string } };
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: unknown): boolean;
  refresh(): void;
  disconnect(): void;
}

export interface PickerFamilyCapability<Kind extends string> {
  readonly kind: Kind;
  connect(options: Record<string, unknown>): PickerCapabilityConnection;
  formatInput(granularity: PickerCapabilityGranularity, part: string, value: unknown): string;
}

export function definePickerFamilyCapability<Kind extends string>(
  capability: PickerFamilyCapability<Kind>,
): PickerFamilyCapability<Kind> {
  return Object.freeze({ ...capability });
}
import type { CalendarMonthValue } from '@sectile/dom/temporal/calendar';
import type { DateValue } from '@sectile/dom/temporal/date-field';
