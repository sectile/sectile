export type FormControlFamily =
  | 'boolean'
  | 'editable'
  | 'group'
  | 'numeric'
  | 'scalar'
  | 'selection'
  | 'token'
  | 'compound';

export type FormControlIntegrationPhase = 'simple' | 'compound';

export interface FormControlInventoryEntry {
  readonly family: FormControlFamily;
  readonly phase: FormControlIntegrationPhase;
}

/**
 * Every public Vue component that owns a submittable value belongs here.
 * Tests pin this inventory so adding a value control requires an explicit
 * Form-participation phase instead of silently skipping the contract.
 */
export const formValueControlInventory = Object.freeze({
  TextField: { family: 'scalar', phase: 'simple' },
  NumberField: { family: 'numeric', phase: 'simple' },
  CheckboxRoot: { family: 'boolean', phase: 'simple' },
  SwitchRoot: { family: 'boolean', phase: 'simple' },
  CheckboxGroupRoot: { family: 'group', phase: 'simple' },
  RadioGroupRoot: { family: 'group', phase: 'simple' },
  ListboxRoot: { family: 'selection', phase: 'simple' },
  SelectRoot: { family: 'selection', phase: 'simple' },
  ComboboxRoot: { family: 'selection', phase: 'simple' },
  CascadeSelectRoot: { family: 'selection', phase: 'simple' },
  RatingRoot: { family: 'selection', phase: 'simple' },
  ToggleGroupRoot: { family: 'selection', phase: 'simple' },
  EditableRoot: { family: 'editable', phase: 'simple' },
  TagsInputRoot: { family: 'token', phase: 'simple' },
  PinInputRoot: { family: 'token', phase: 'simple' },
  SpinButtonRoot: { family: 'numeric', phase: 'simple' },
  QuantityFieldRoot: { family: 'numeric', phase: 'simple' },
  DateField: { family: 'compound', phase: 'compound' },
  DateTimeField: { family: 'compound', phase: 'compound' },
  TimeField: { family: 'compound', phase: 'compound' },
  DateRangeFieldRoot: { family: 'compound', phase: 'compound' },
  TimeRangeFieldRoot: { family: 'compound', phase: 'compound' },
  SliderRoot: { family: 'compound', phase: 'compound' },
  MultiThumbSliderRoot: { family: 'compound', phase: 'compound' },
  ColorPickerRoot: { family: 'compound', phase: 'compound' },
  CalendarRoot: { family: 'compound', phase: 'compound' },
  RangeCalendarRoot: { family: 'compound', phase: 'compound' },
  DatePickerRoot: { family: 'compound', phase: 'compound' },
  DateRangePickerRoot: { family: 'compound', phase: 'compound' },
  DateTimePickerRoot: { family: 'compound', phase: 'compound' },
  DateTimeRangePickerRoot: { family: 'compound', phase: 'compound' },
  MonthPickerRoot: { family: 'compound', phase: 'compound' },
  MonthRangePickerRoot: { family: 'compound', phase: 'compound' },
  YearPickerRoot: { family: 'compound', phase: 'compound' },
  YearRangePickerRoot: { family: 'compound', phase: 'compound' },
} satisfies Record<string, FormControlInventoryEntry>);
