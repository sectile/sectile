import type { CarouselOptions } from '@sectile/dom/carousel';
import type { CascadeSelectOptions } from '@sectile/dom/cascade-select';
import type { ComboboxConnectionOptions } from '@sectile/dom/combobox';
import type { DatePickerOptions } from '@sectile/dom/temporal/date-picker';
import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateTimePickerOptions } from '@sectile/dom/temporal/date-time-picker';
import type { DateTimeRangePickerOptions } from '@sectile/dom/temporal/date-time-range-picker';
import type { FormOptions } from '@sectile/dom/form';
import {
  createPresence,
  retainExitPresence,
  type ExitPresenceCancel,
  type PresenceConnection,
  type PresenceOptions,
} from '@sectile/dom/presence';

const options: PresenceOptions = {
  open: false,
  onPresentChange: (_present) => {},
};
const connection: PresenceConnection = createPresence(options);
const present: boolean = connection.update(true, undefined);
const exitCancel: ExitPresenceCancel | null = retainExitPresence(
  document.createElement('div'),
  () => {},
);

const rendererOwnedCarousel: Pick<CarouselOptions<string>, 'manageVisibility'> = { manageVisibility: false };
const rendererOwnedCombobox: Pick<ComboboxConnectionOptions<string>, 'manageVisibility'> = { manageVisibility: false };
const rendererOwnedCascade: Pick<CascadeSelectOptions<string>, 'manageVisibility'> = { manageVisibility: false };
const rendererOwnedDate: Pick<DatePickerOptions, 'manageVisibility'> = { manageVisibility: false };
const rendererOwnedDateRange: Pick<DateRangePickerOptions, 'manageVisibility'> = { manageVisibility: false };
const rendererOwnedDateTime: Pick<DateTimePickerOptions, 'manageVisibility'> = { manageVisibility: false };
const rendererOwnedDateTimeRange: Pick<DateTimeRangePickerOptions, 'manageVisibility'> = { manageVisibility: false };
const rendererOwnedFormSummary: Pick<FormOptions, 'manageSummaryVisibility'> = { manageSummaryVisibility: false };

void present;
exitCancel?.();
void rendererOwnedCarousel;
void rendererOwnedCombobox;
void rendererOwnedCascade;
void rendererOwnedDate;
void rendererOwnedDateRange;
void rendererOwnedDateTime;
void rendererOwnedDateTimeRange;
void rendererOwnedFormSummary;
connection.disconnect();
