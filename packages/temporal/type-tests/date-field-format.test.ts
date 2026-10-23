import { createDateFieldFormat, createDateFieldState, reformatDateFieldState, applyDateFieldEvent, formatDateFieldValue, type DateFieldFormat } from '@sectile/temporal/date-field';
const format: DateFieldFormat = createDateFieldFormat({ order: ['day', 'month', 'year'], literals: ['', '/', '/', ''] });
const state = createDateFieldState({ year: 2026, month: 10, day: 14 }, undefined, format);
applyDateFieldEvent(state, 'increment-segment');
reformatDateFieldState(state, format);
formatDateFieldValue(state.value!, format);
// @ts-expect-error Only date segments belong to a date format.
createDateFieldFormat({ order: ['year', 'hour', 'day'] });
// @ts-expect-error A date layout has exactly three date segments.
createDateFieldFormat({ order: ['year', 'month'] });
// @ts-expect-error Raw authoring data is not an admitted format.
const forged: DateFieldFormat = { order: ['year', 'month', 'day'], literals: ['', '-', '-', ''], digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] };
void forged;
