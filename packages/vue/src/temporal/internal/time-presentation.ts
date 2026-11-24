import { computed, type ComputedRef } from 'vue';
import { unwrap } from '@sectile/core/result';
import { createTimeFieldFormat, tryCreateTimeFieldState, type TimeFieldFormat, type TimeFieldPrecision, type TimeValue } from '@sectile/temporal/time-field';
import { createDateFieldFormat } from '@sectile/temporal/date-field';
import { createDateTimeFieldFormat, type DateTimeFieldFormat } from '@sectile/temporal/date-time-field';
import { useTemporalEditingFormatter } from '../temporal-provider.js';

interface PrecisionProps { readonly native?: boolean | undefined; readonly precision?: TimeFieldPrecision | undefined }
type FormatProps<Format> = PrecisionProps & { readonly format?: Format | undefined };

/** One computed owns precision selection; each field supplies its format owner. */
function useTemporalPrecisionPresentation<T, Format>(props: FormatProps<Format>, resolve: (precision: TimeFieldPrecision) => Format | undefined, fallback: (precision: TimeFieldPrecision) => Format, project: (format: Format) => T): ComputedRef<T | undefined> {
  return computed(() => {
    if (props.native === true) return undefined;
    if (props.format !== undefined) return project(props.format);
    const precision = props.precision;
    const format = resolve(precision ?? 'millisecond') ?? (precision === undefined ? undefined : fallback(precision));
    return format === undefined ? undefined : project(format);
  });
}

/** One locale/precision boundary shared by scalar and range presentations. */
export function useTimePresentation<T>(props: FormatProps<TimeFieldFormat>, project: (format: TimeFieldFormat) => T): ComputedRef<T | undefined> {
  const formatter = useTemporalEditingFormatter();
  return useTemporalPrecisionPresentation(props, formatter.timeFieldFormat, precision => createTimeFieldFormat({ precision }), project);
}

/** Scalar and range date-time inputs share one combined-format selection. */
export function useDateTimePresentation<T>(props: FormatProps<DateTimeFieldFormat>, project: (format: DateTimeFieldFormat) => T): ComputedRef<T | undefined> {
  const formatter = useTemporalEditingFormatter();
  return useTemporalPrecisionPresentation(props, formatter.dateTimeFieldFormat, defaultDateTimeFormat, project);
}

export function defaultDateTimeFormat(precision: TimeFieldPrecision): DateTimeFieldFormat {
  return createDateTimeFieldFormat({ date: createDateFieldFormat({ order: ['year', 'month', 'day'] }), time: createTimeFieldFormat({ precision }), separator: 'T' });
}

export function admitTimePresentation(format: TimeFieldFormat, times: readonly TimeValue[]): void {
  for (const time of times) unwrap(tryCreateTimeFieldState(time, undefined, format));
}
