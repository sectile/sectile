import { createDateFieldFormat } from '@sectile/temporal/date-field';
import { createDateRangeFieldState, reformatDateRangeFieldState } from '@sectile/temporal/date-range-field';
const format = createDateFieldFormat({ order: ['day', 'month', 'year'], literals: ['', '/', '/', ''] });
const state = createDateRangeFieldState({ startFormat: format, endFormat: format });
reformatDateRangeFieldState(state, format);
// @ts-expect-error Endpoints consume admitted formats, not locale authoring strings.
createDateRangeFieldState({ startFormat: 'en-GB' });
