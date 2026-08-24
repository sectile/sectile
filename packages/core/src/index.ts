/**
 * The root is intentionally type-only. Runtime consumers import one canonical
 * structure from @sectile/core/sequence, /range, /grid, or /tree.
 */
export type {
  AxisBoundaryPolicy,
  BoundaryPolicy,
  Direction,
  ErrorClass,
  GridDirection,
  MoveResult,
  ResourceCeilings,
  Result,
  ScanOptions,
  SectileError,
  StableID,
  TiePolicy,
} from './shared.js';
export type {
  InteractionIntent,
  InteractionState,
  InteractionStateInput,
} from './interaction.js';
export type {
  FormCommand,
  FormEvent,
  FormFieldInput,
  FormFieldState,
  FormIssue,
  FormIssueSource,
  FormState,
  FormStateInput,
  FormStatus,
  FormUpdate,
} from './form.js';
export type {
  CalculatorExpressionOptions,
  NumberFieldCommand,
  NumberFieldEvent,
  NumberFieldPolicies,
  NumberFieldState,
  NumberFieldUpdate,
  NumericExpressionEvaluator,
  NumericExpressionResult,
} from './number-field.js';
export type {
  DateFieldCommand,
  DateFieldEvent,
  DateFieldPolicies,
  DateFieldState,
  DateFieldUpdate,
  DateRange,
  DateSegment,
  DateValue,
} from './date-field.js';
export type {
  DateTimeFieldCommand,
  DateTimeFieldEvent,
  DateTimeFieldPolicies,
  DateTimeFieldState,
  DateTimeFieldUpdate,
  DateTimeRange,
  DateTimeSegment,
  DateTimeValue,
} from './date-time-field.js';
export type {
  TimeFieldCommand,
  TimeFieldEvent,
  TimeFieldPolicies,
  TimeFieldState,
  TimeFieldUpdate,
  TimeSegment,
  TimeValue,
} from './time-field.js';
export type {
  DatePickerCommand,
  DatePickerEvent,
  DatePickerPolicies,
  DatePickerState,
  DatePickerStateInput,
  DatePickerUpdate,
  DatePickerView,
  DatePickerViewMode,
  DatePickerMonthValue,
} from './date-picker.js';
export type {
  DateRangePickerCommand,
  DateRangePickerEvent,
  DateRangePickerState,
  DateRangePickerStateInput,
  DateRangePickerUpdate,
} from './date-range-picker.js';
export type {
  RangeCalendarCommand,
  RangeCalendarEvent,
  RangeCalendarState,
  RangeCalendarStateInput,
  RangeCalendarUpdate,
} from './range-calendar.js';
export type {
  MonthPickerCommand,
  MonthPickerEvent,
  MonthPickerPolicies,
  MonthPickerState,
  MonthPickerStateInput,
  MonthPickerUpdate,
  MonthPickerValue,
} from './month-picker.js';
export type {
  MonthRangePickerCommand,
  MonthRangePickerEvent,
  MonthRangePickerState,
  MonthRangePickerStateInput,
  MonthRangePickerUpdate,
} from './month-range-picker.js';
export type {
  YearPickerCommand,
  YearPickerEvent,
  YearPickerPolicies,
  YearPickerState,
  YearPickerStateInput,
  YearPickerUpdate,
  YearPickerValue,
} from './year-picker.js';
export type {
  YearRangePickerCommand,
  YearRangePickerEvent,
  YearRangePickerState,
  YearRangePickerStateInput,
  YearRangePickerUpdate,
} from './year-range-picker.js';
export type {
  DateTimePickerCommand,
  DateTimePickerEvent,
  DateTimePickerPolicies,
  DateTimePickerState,
  DateTimePickerStateInput,
  DateTimePickerUpdate,
} from './date-time-picker.js';
export type {
  DateTimeRangePickerCommand,
  DateTimeRangePickerEvent,
  DateTimeRangePickerPolicies,
  DateTimeRangePickerState,
  DateTimeRangePickerStateInput,
  DateTimeRangePickerUpdate,
} from './date-time-range-picker.js';
export type {
  Dimension,
  UnitConversion,
  UnitConversionOptions,
  UnitDefinition,
  UnitExpression,
  UnitExpressionConversion,
  UnitExpressionFactor,
  UnitID,
  UnitRatio,
  UnitRegistry,
  UnitScalar,
  UnitSystemDefinition,
  UnitSystemPreferenceDefinition,
  UnitSystemProfile,
} from './units.js';
export type {
  ParsedQuantityInput,
  QuantityFieldCommand,
  QuantityFieldEvent,
  QuantityInputParserOptions,
  QuantityFieldPolicies,
  QuantityFieldState,
  QuantityFieldUpdate,
  QuantityValue,
} from './quantity-field.js';
