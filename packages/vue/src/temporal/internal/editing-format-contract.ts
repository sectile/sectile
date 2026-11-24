import type { DateFieldFormat } from '@sectile/temporal/date-field';
import type { DateTimeFieldFormat } from '@sectile/temporal/date-time-field';
import type { TimeFieldFormat, TimeFieldPrecision } from '@sectile/temporal/time-field';

export interface TemporalEditingFormatter {
  dateFieldFormat(localeFallback?: boolean): DateFieldFormat | undefined;
  timeFieldFormat(precision: TimeFieldPrecision, localeFallback?: boolean): TimeFieldFormat | undefined;
  dateTimeFieldFormat(precision: TimeFieldPrecision, localeFallback?: boolean): DateTimeFieldFormat | undefined;
}
