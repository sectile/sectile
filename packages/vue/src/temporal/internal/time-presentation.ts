import { computed, type ComputedRef } from 'vue';
import { unwrap } from '@sectile/core/result';
import { createTimeFieldFormat, tryCreateTimeFieldState, type TimeFieldFormat, type TimeFieldPrecision, type TimeValue } from '@sectile/temporal/time-field';
import { createDateFieldFormat } from '@sectile/temporal/date-field';
import { createDateTimeFieldFormat, type DateTimeFieldFormat } from '@sectile/temporal/date-time-field';
import { useTemporalFormatter, type TemporalFormatter } from '../temporal-provider.js';

interface PrecisionProps { readonly native?: boolean | undefined; readonly precision?: TimeFieldPrecision | undefined }
type FormatProps<Format> = PrecisionProps & { readonly format?: Format | undefined };

/** One computed owns precision selection; each field supplies its format owner. */
export function useTemporalPrecisionPresentation<T, Format>(props: FormatProps<Format>, resolve: (formatter: TemporalFormatter | undefined, precision: TimeFieldPrecision) => Format, project: (format: Format) => T): ComputedRef<T | undefined> {
  const formatter = useTemporalFormatter();
  return computed(() => {
    if (props.native === true) return undefined;
    if (props.format !== undefined) return project(props.format);
    return formatter.value === undefined && props.precision === undefined ? undefined : project(resolve(formatter.value, props.precision ?? 'millisecond'));
  });
}

/** One locale/precision boundary shared by scalar and range presentations. */
export function useTimePresentation<T>(props: FormatProps<TimeFieldFormat>, project: (format: TimeFieldFormat) => T): ComputedRef<T | undefined> {
  return useTemporalPrecisionPresentation(props, (formatter, precision) => formatter === undefined ? createTimeFieldFormat({ precision }) : unwrap(formatter.timeFieldFormat(precision)), project);
}

/** Scalar and range date-time inputs share one combined-format selection. */
export function useDateTimePresentation<T>(props: FormatProps<DateTimeFieldFormat>, project: (format: DateTimeFieldFormat) => T): ComputedRef<T | undefined> {
  return useTemporalPrecisionPresentation(props, resolveDateTimeFormat, project);
}

export function resolveDateTimeFormat(formatter: TemporalFormatter | undefined, precision: TimeFieldPrecision): DateTimeFieldFormat {
  return formatter === undefined
    ? createDateTimeFieldFormat({ date: createDateFieldFormat({ order: ['year', 'month', 'day'] }), time: createTimeFieldFormat({ precision }), separator: 'T' })
    : unwrap(formatter.dateTimeFieldFormat(precision));
}

export function admitTimePresentation(format: TimeFieldFormat, times: readonly TimeValue[]): void {
  for (const time of times) unwrap(tryCreateTimeFieldState(time, undefined, format));
}
