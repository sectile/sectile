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
} from './date-picker.js';
export type {
  DateRangePickerCommand,
  DateRangePickerEvent,
  DateRangePickerState,
  DateRangePickerStateInput,
  DateRangePickerUpdate,
} from './date-range-picker.js';
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
