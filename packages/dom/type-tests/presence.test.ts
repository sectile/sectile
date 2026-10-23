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
connection.suspend();
const resumed: boolean = connection.resume(true, document.createElement('div'));
void resumed;
const exitCancel: ExitPresenceCancel | null = retainExitPresence(
  document.createElement('div'),
  () => {},
);

const rendererOwnedCarousel: Pick<CarouselOptions<string>, 'manageVisibility' | 'indicatorGroupLabel' | 'getPauseLabel'> = {
  manageVisibility: false, indicatorGroupLabel: '슬라이드 선택', getPauseLabel: paused => paused ? '재생' : '정지',
};
const rendererOwnedCombobox: Pick<ComboboxConnectionOptions<string>, 'manageVisibility'> = { manageVisibility: false };
const externalComboboxEditor: Pick<ComboboxConnectionOptions<'a'>, 'manageText' | 'isInputComposing'> = { manageText: false, isInputComposing: () => false };
const caretCombobox: Pick<ComboboxConnectionOptions<'a'>, 'anchor'> = { anchor: 'caret' }; void caretCombobox;
// @ts-expect-error Native caret anchoring is a closed placement choice.
const invalidCaretCombobox: Pick<ComboboxConnectionOptions<'a'>, 'anchor'> = { anchor: 'cursor' }; void invalidCaretCombobox;
// @ts-expect-error IME observations return a boolean, not native event objects.
const invalidExternalComboboxEditor: Pick<ComboboxConnectionOptions<'a'>, 'isInputComposing'> = { isInputComposing: () => new Event('compositionstart') };
void externalComboboxEditor; void invalidExternalComboboxEditor;
const renderedCombobox: Pick<ComboboxConnectionOptions<'a' | 'b'>, 'isItemRendered'> = { isItemRendered: id => { const value: 'a' | 'b' = id; return value === 'a'; } };
// @ts-expect-error Render publication is a boolean observation, not an ID conversion.
const invalidRenderedCombobox: Pick<ComboboxConnectionOptions<'a' | 'b'>, 'isItemRendered'> = { isItemRendered: () => 'a' };
void renderedCombobox; void invalidRenderedCombobox;
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
