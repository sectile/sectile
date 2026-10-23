import type { TemporalFormatter } from '@sectile/dom/temporal/format';
export type PickerCapabilityGranularity = 'day' | 'month' | 'year';

export interface PickerInputPresentation {
  readonly options: Readonly<Record<string, unknown>>;
  readonly attributes: Readonly<Record<string, Readonly<{ placeholder: string; inputmode: 'text' | 'numeric' }>>>;
  formatInput(part: string, value: unknown): string | undefined;
}

export interface PickerCapabilityConnection extends Pick<import('@sectile/dom/temporal/calendar').CalendarConnection, 'getActive' | 'suspend' | 'resume'>,
  Partial<Pick<import('@sectile/dom/temporal/date-picker').DatePickerConnection, 'getLayerOrder' | 'subscribeLayerPresentation' | 'syncLayerParent'>> {
  getSnapshot(): { readonly state: unknown };
  getFieldStates?(): unknown;
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
  presentation?(formatter: TemporalFormatter | undefined): PickerInputPresentation;
  initialInputValues?(referenceDate: DateValue, policies: unknown, formatter?: TemporalFormatter): Readonly<Record<string, string>>;
}

export function definePickerFamilyCapability<Kind extends string>(
  capability: PickerFamilyCapability<Kind>,
): PickerFamilyCapability<Kind> {
  return Object.freeze({ ...capability });
}
import type { CalendarMonthValue } from '@sectile/dom/temporal/calendar';
import type { DateValue } from '@sectile/dom/temporal/date-field';
