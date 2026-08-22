/**
 * The root is intentionally type-only. Runtime consumers import one canonical
 * structure from @sectile/primitives/sequence, /range, /grid, or /tree.
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
