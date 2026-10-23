import { h, type ComputedRef } from 'vue';
import { TemporalProvider, useTemporalFormatter, type TemporalFormatter, type TemporalProviderProps } from '@sectile/vue/temporal/temporal-provider';
import { TimeField } from '@sectile/vue/temporal/time-field';
import { DateTimeField } from '@sectile/vue/temporal/date-time-field';
import { TimeRangeFieldRoot, type TimeRangeFieldRootProps } from '@sectile/vue/temporal/time-range-field';
import { DateTimeRangeFieldRoot, type DateTimeRangeFieldRootProps } from '@sectile/vue/temporal/date-time-range-field';
import type { DateRangeFieldRootProps } from '@sectile/vue/temporal/date-range-field';
const rangeSubmission: Pick<DateRangeFieldRootProps, 'name' | 'form'> & Pick<TimeRangeFieldRootProps, 'name' | 'form'> & Pick<DateTimeRangeFieldRootProps, 'name' | 'form'> = { name: undefined, form: undefined };
h(TimeRangeFieldRoot, { ...rangeSubmission, name: 'delivery' });
h(DateTimeRangeFieldRoot, { ...rangeSubmission, form: 'outside' });
// @ts-expect-error Native submission namespaces are strings, not Form domain paths.
const invalidRangeName: DateTimeRangeFieldRootProps = { name: ['delivery', 0] };
const props: TemporalProviderProps = { formatting: { locale: 'ko-KR', timeZone: 'Asia/Seoul' }, referenceInstant: 0 };
h(TemporalProvider, props);
h(TemporalProvider, { referenceDate: { year: 2026, month: 10, day: 14 } });
const formatter: ComputedRef<TemporalFormatter | undefined> = useTemporalFormatter();
formatter.value?.dateAt(0);
h(TimeField, { precision: 'second' });
h(DateTimeField, { precision: 'minute' });
// @ts-expect-error Date-time precision is the same closed consumer choice.
h(DateTimeField, { precision: 'hour' });
h(TimeRangeFieldRoot, { precision: 'millisecond' });
h(DateTimeRangeFieldRoot, { precision: 'second', defaultValue: null });
// @ts-expect-error Date-time range precision is the same closed selection.
h(DateTimeRangeFieldRoot, { precision: 'hour' });
// @ts-expect-error Combined ranges require date and time at both endpoints.
h(DateTimeRangeFieldRoot, { modelValue: { start: { year: 2026, month: 10, day: 14 }, end: { year: 2026, month: 10, day: 15 } } });
// @ts-expect-error Time range precision is the same closed consumer choice.
h(TimeRangeFieldRoot, { precision: 'hour' });
// @ts-expect-error Time precision is a closed consumer choice.
h(TimeField, { precision: 'hour' });
// @ts-expect-error Formatting is a complete locale/timeZone pair, not ambient configuration.
h(TemporalProvider, { formatting: { locale: 'ko-KR' } });
// @ts-expect-error The request instant is Unix milliseconds, not a civil date or native Date.
h(TemporalProvider, { referenceInstant: new Date() });
