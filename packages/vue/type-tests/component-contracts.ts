import { h, useTemplateRef } from 'vue';
import { FormField, type FormFieldProps } from '@sectile/vue/form';
const groupedField: FormFieldProps = { name: 'choice', labelMode: 'labelledby' };
h(FormField, groupedField);
// @ts-expect-error Field label semantics use the supported native/group/legend modes.
h(FormField, { labelMode: 'custom' });
import { ContextMenuRoot, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSubContent, ContextMenuSeparator,
  type ContextMenuRootProps, type ContextMenuRootSlotProps, type ContextMenuOpenChangeHandler, type ContextMenuInvokeHandler } from '@sectile/vue/context-menu';
const contextProps: ContextMenuRootProps = { items: [{ id: 'copy', parentID: null }], open: false, strategy: 'fixed', sideOffset: 0 };
const updateContext: ContextMenuOpenChangeHandler = open => { const exact: boolean = open; void exact; };
const invokeContext: ContextMenuInvokeHandler = value => { const exact: string = value; void exact; };
h(ContextMenuRoot, { ...contextProps, 'onUpdate:open': updateContext, onInvoke: invokeContext }, {
  default: (state: ContextMenuRootSlotProps) => [h(ContextMenuTrigger), h(ContextMenuContent, null, {
    default: () => [h(ContextMenuItem, { value: state.highlightedValue ?? 'copy' }), h(ContextMenuSubContent, { for: 'copy' }), h(ContextMenuSeparator)],
  })],
});
// @ts-expect-error Open events use booleans, not state names.
const invalidContextHandler: ContextMenuOpenChangeHandler = (_open: string) => {}; void invalidContextHandler;
// @ts-expect-error Vue delegates invocation geometry rather than exposing an unwired prop.
const invalidContextGeometry: ContextMenuRootProps = { ...contextProps, anchorRect: { x: 10, y: 20, width: 0, height: 0 } }; void invalidContextGeometry;
// @ts-expect-error Provider-only roots do not offer an ignored rendering target.
const invalidContextWrapper: ContextMenuRootProps = { ...contextProps, as: 'section' }; void invalidContextWrapper;
type _contextProviderHasNoRenderTarget = Assert<Equal<'as' extends keyof InstanceType<typeof ContextMenuRoot>['$props'] ? true : false, false>>;
import { TextField, type TextFieldExpose, type TextFieldSnapshot, type TextFieldEditResult } from '@sectile/vue/text';
import type { TextFieldExpose as RootTextFieldExpose, TextFieldReplacement as RootTextFieldReplacement } from '@sectile/vue';
declare const textField: InstanceType<typeof TextField>;
const textAction: TextFieldExpose = textField;
const rootTextAction: RootTextFieldExpose = textAction;
const clearAccepted: boolean = rootTextAction.clear();
const textSnapshot: TextFieldSnapshot | null = textAction.getTextSnapshot();
if (textSnapshot) {
  const query = textAction.getTextQuery({ trigger: '@', maxQueryCodeUnits: 32 });
  if (query.ok && query.value !== null) {
    const querySnapshot: TextFieldSnapshot = query.value.snapshot; void querySnapshot;
  }
  const replacement: RootTextFieldReplacement = { snapshot: textSnapshot, startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: '안녕' };
  const pending: Promise<TextFieldEditResult> = textAction.replaceText(replacement);
  void pending.then(result => result.status === 'accepted' ? result.snapshot.text : result.reason);
  // @ts-expect-error Issued snapshot contents are immutable.
  textSnapshot.text = 'Other text';
  // @ts-expect-error Replacement text is plain text, not a numeric model value.
  textAction.replaceText({ ...replacement, text: 150 });
}
// @ts-expect-error A replacement must name its field-issued snapshot.
textAction.replaceText({ startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: 'A' });
// @ts-expect-error Snapshot identities cannot be constructed from plain text state.
const forgedTextSnapshot: TextFieldSnapshot = { text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0, startCodeUnitOffset: 0, endCodeUnitOffset: 0, direction: 'none' } };
void forgedTextSnapshot;
// @ts-expect-error Trigger queries require an explicit query ceiling.
textAction.getTextQuery({ trigger: '@' });
const priorTextValue: string | number | undefined = textField.modelValue;
h(TextField, { modelValue: 'Address', 'onUpdate:modelValue': (value: string | number) => { void value; } });
h(TextField, { onSnapshotChange: () => { textAction.getTextQuery({ trigger: '@', maxQueryCodeUnits: 32 }); } });
void [clearAccepted, priorTextValue];
// @ts-expect-error Clear requests empty text and does not accept replacement payloads.
textAction.clear('Other text');
import { useFormFieldDefaults, type FormFieldDefaults } from '@sectile/vue/form-boundary';
const behaviorDefaults = useFormFieldDefaults();
if (behaviorDefaults) {
  const snapshot: FormFieldDefaults = behaviorDefaults.value;
  const disabled: boolean = snapshot.disabled; void disabled;
  // @ts-expect-error A defaults reader cannot replace the provider's snapshot.
  behaviorDefaults.value = { disabled: false, readonly: false, required: false };
  // @ts-expect-error Published defaults are immutable values, not a writer port.
  snapshot.required = false;
}
import { Anchor, type AnchorProps, type AnchorExpose, type AnchorSlots } from '@sectile/vue/primitive';
const anchorSlots: AnchorSlots = {
  leading: state => { const disabled: boolean = state.disabled; return disabled ? 'Unavailable' : state.current; },
  trailing: state => state.current === 'page' ? 'Current page' : null,
  content: state => h('span', { 'aria-disabled': state.disabled }, [state.children]),
};
h(Anchor, { href: '/docs' }, { ...anchorSlots });
const anchorOptions: AnchorProps = { href: '/docs', current: 'page', download: true, tabIndex: 0,
  onClick: event => { const native: MouseEvent = event; native.preventDefault(); } };
h(Anchor, anchorOptions);
const anchor = useTemplateRef<InstanceType<typeof Anchor>>('anchor');
const nativeAnchor: HTMLAnchorElement | null = anchor.value?.element ?? null;
const anchorExpose: AnchorExpose | null = anchor.value;
anchorExpose?.focus({ preventScroll: true }); void nativeAnchor;
// @ts-expect-error Current is an ARIA location token, not router state.
const invalidAnchor: AnchorProps = { current: 'selected' }; void invalidAnchor;
// @ts-expect-error Anchor projects its actual native element as readonly.
if (anchor.value) anchor.value.element = null;
import { ColorPickerAreaSurface, type ColorPickerPartProps } from '@sectile/vue/color-picker';
const colorSurface: ColorPickerPartProps = { as: 'section', asChild: false };
h(ColorPickerAreaSurface, colorSurface);
import { TagsInputRoot, type TagsInputRootProps } from '@sectile/vue/tags-input';
const namedTags: TagsInputRootProps = { removeLabel: (value, index) => index ? undefined : `${value} 삭제` };
h(TagsInputRoot, namedTags);
// @ts-expect-error Native removal names remain text.
const invalidTags: TagsInputRootProps = { removeLabel: () => 1 }; void invalidTags;
import type { EditableInputExpose } from '@sectile/vue/editable';
const editableInput = useTemplateRef<EditableInputExpose>('editor');
const currentEditableInput: HTMLInputElement | HTMLTextAreaElement | null = editableInput.value?.element ?? null;
void currentEditableInput;
// @ts-expect-error A component owns its current native element identity.
if (editableInput.value) editableInput.value.element = null;
import { SequenceReorderHandle, SequenceReorderRoot, TreeReorderHandle, TreeReorderRoot, type ReorderHandleProps, type SequenceReorderRootProps, type TreeReorderRootProps } from '@sectile/vue/reorder';
const controlledSequence: SequenceReorderRootProps = { items: ['a'], controlled: true };
const controlledTree: TreeReorderRootProps = { nodes: [{ id: 'a', parentID: null }], controlled: true };
h(SequenceReorderRoot, controlledSequence);
h(TreeReorderRoot, controlledTree);
const handle: ReorderHandleProps = { label: 'Move item', disabled: false };
h(SequenceReorderHandle, handle);
h(TreeReorderHandle, handle);
// @ts-expect-error A handle needs a localized accessible name.
const unnamedHandle: ReorderHandleProps = {};
void unnamedHandle;
import { getQuantityFieldDisplayUnits, type QuantityFieldPolicies } from '@sectile/core/quantity-field';
import type { QuantityFieldOptions } from '@sectile/dom/quantity-field';
declare const quantityPolicies: QuantityFieldPolicies;
const displayUnits: readonly string[] = getQuantityFieldDisplayUnits(quantityPolicies, 'metre');
const optionOwnership: Pick<QuantityFieldOptions, 'manageUnitOptions'> = { manageUnitOptions: false };
void displayUnits; void optionOwnership;
import {
  createForm as createDOMForm,
  defineFormSubmission as defineDOMFormSubmission,
} from '@sectile/dom/form';
import type { DatePickerPolicies } from '@sectile/dom/temporal/date-picker';
import type { DateFieldOptions } from '@sectile/dom/temporal/date-field';
import type { DateTimeFieldOptions } from '@sectile/dom/temporal/date-time-field';
import type { NumberFieldOptions } from '@sectile/dom/number-field';
import type { TimeFieldOptions } from '@sectile/dom/temporal/time-field';
import { DateField, type DateValue } from '@sectile/vue/temporal/date-field';
import {
  FormMessage,
  FormSummary,
  defineFormSubmission as defineVueFormSubmission,
} from '@sectile/vue/form';
import {
  DatePickerContent,
  DatePickerRoot,
  type DatePickerRootSlotProps,
  type DatePickerValueChangeHandler,
} from '@sectile/vue/temporal/date-picker';
import { MonthPickerRoot, type MonthPickerValue } from '@sectile/vue/temporal/month-picker';
import { YearPickerRoot, type YearPickerValue } from '@sectile/vue/temporal/year-picker';
import { DateTimeField } from '@sectile/vue/temporal/date-time-field';
import type { DateTimeRange } from '@sectile/vue/temporal/date-time-range-picker';
import { MenuButtonRoot, MenuRoot } from '@sectile/vue/menu';
import {
  MeterGroupRoot,
  MeterGroupSegment,
  type MeterGroupEntry,
  type MeterGroupRootProps,
  type MeterGroupRootSlotProps,
  type MeterGroupSegmentSlotProps,
} from '@sectile/vue/meter-group';
import { MeterRoot, type MeterRootProps, type MeterRootSlotProps } from '@sectile/vue/meter';
import { NumberField, type NumberFieldProps } from '@sectile/vue/number-field';
import { PopoverRoot, type PopoverRootProps } from '@sectile/vue/popover';
import type { DialogRootProps } from '@sectile/vue/dialog';
import type { AlertDialogRootProps } from '@sectile/vue/alert-dialog';
import type { DrawerRootProps } from '@sectile/vue/drawer';
import type { TooltipRootProps } from '@sectile/vue/tooltip';
import { AccordionContent } from '@sectile/vue/accordion';
import { CarouselRoot, CarouselSlide } from '@sectile/vue/carousel';
import { TreeGridGroup, TreeGridRoot, TreeGridHeader, TreeGridHeaderCell, type TreeGridGroupProps, type TreeGridHeaderCellProps } from '@sectile/vue/tree-grid';
import { CheckboxIndicator } from '@sectile/vue/checkbox';
import { DisclosureContent } from '@sectile/vue/disclosure';
import { ListboxItemIndicator } from '@sectile/vue/listbox';
import { NavigationMenuIndicator } from '@sectile/vue/navigation-menu';
import { RadioGroupIndicator } from '@sectile/vue/radio-group';
import { SelectItemIndicator, SelectRoot } from '@sectile/vue/select';
import { ComboboxEditor, ComboboxEmpty, ComboboxResults, ComboboxRoot, type ComboboxRootProps, type ComboboxResultsSlotProps } from '@sectile/vue/combobox';
import { ComboboxEditor as RootComboboxEditor } from '@sectile/vue';
const editorPart: typeof ComboboxEditor = RootComboboxEditor; void editorPart;
h(ComboboxEditor, {}, { default: () => h(TextField, { defaultValue: '@Ad', multiline: true }) });
h(ComboboxRoot, { items: [], anchor: 'caret' });
// @ts-expect-error Caret anchoring does not accept arbitrary placement strings.
const invalidCaretAnchor: ComboboxRootProps = { items: [], anchor: 'cursor' }; void invalidCaretAnchor;
import { ComboboxResults as RootComboboxResults } from '@sectile/vue';
const resultPart: typeof ComboboxResults = RootComboboxResults; void resultPart;
const resultProjection: ComboboxResultsSlotProps = { items: [{ id: 'open', label: 'Open' }], value: null, inputValue: '',
  highlightedValue: null, open: false, active: false, disabled: false, readonly: false };
// @ts-expect-error Results borrow readonly records rather than providing a writable source.
resultProjection.items.push({ id: 'other', label: 'Other' });
const inlineComboboxProps: ComboboxRootProps = { items: [{ id: 'open', label: 'Open' }], renderedItems: ['open'], presentation: 'inline', itemId: id => 'option-' + id, policies: { eligible: id => id === 'open' } };
// @ts-expect-error Rendered window IDs use the same native string vocabulary.
const invalidRenderedItems: ComboboxRootProps = { items: [], renderedItems: [1] }; void invalidRenderedItems;
// @ts-expect-error Option IDs remain DOM strings.
const invalidComboboxItemId: ComboboxRootProps = { items: [], itemId: () => 1 }; void invalidComboboxItemId;
// @ts-expect-error Host presentation cannot be an arbitrary display mode.
const invalidComboboxPresentation: ComboboxRootProps = { items: [], presentation: 'floating' };
void [inlineComboboxProps, invalidComboboxPresentation];
import { CascadeListItemIndicator } from '@sectile/vue/cascade-list';
import { CascadeSelectItemIndicator, CascadeSelectRoot } from '@sectile/vue/cascade-select';
import {
  SpinButtonInput,
  SpinButtonIncrement,
  SpinButtonDecrement,
  SpinButtonRoot,
  type SpinButtonInputProps,
} from '@sectile/vue/spin-button';
import { TimeField } from '@sectile/vue/temporal/time-field';
import { TabsContent } from '@sectile/vue/tabs';
import { TooltipRoot } from '@sectile/vue/tooltip';
import { TreeGridEditor } from '@sectile/vue/tree-grid';
import { TreeViewGroup } from '@sectile/vue/tree-view';
import { useToast, type UseToastReturn } from '@sectile/vue/toast';
import { VirtualGrid, type VirtualGridProps, type VirtualGridSlotProps } from '@sectile/vue/virtual/grid';
import { VirtualList, type VirtualListProps, type VirtualListSlotProps } from '@sectile/vue/virtual/list';
import { VirtualMasonry, type VirtualMasonryProps, type VirtualMasonrySlotProps } from '@sectile/vue/virtual/masonry';
import { VirtualSpatial, type VirtualSpatialProps, type VirtualSpatialSlotProps } from '@sectile/vue/virtual/spatial';

type Assert<T extends true> = T;
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
    (<T>() => T extends Right ? 1 : 2)
    ? (<T>() => T extends Right ? 1 : 2) extends
      (<T>() => T extends Left ? 1 : 2)
      ? true
      : false
    : false;

declare const date: DateValue;
declare const monthPickerValue: MonthPickerValue;
declare const yearPickerValue: YearPickerValue;
declare const dateTimeRange: DateTimeRange;
declare const datePickerPolicies: DatePickerPolicies;
declare const dateFieldPolicies: NonNullable<DateFieldOptions['policies']>;
declare const dateTimeFieldPolicies: NonNullable<DateTimeFieldOptions['policies']>;
declare const numberFieldPolicies: NonNullable<NumberFieldOptions['policies']>;
declare const timeFieldPolicies: NonNullable<TimeFieldOptions['policies']>;
declare const formElement: HTMLFormElement;

const submissionSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'sectile-type-fixture',
    types: undefined as unknown as {
      readonly input: { readonly profile: { readonly email: string } };
      readonly output: { readonly accountId: number; readonly normalizedEmail: string };
    },
    validate: (_value: unknown) => ({
      value: { accountId: 42, normalizedEmail: 'release@sectile.dev' },
    }),
  },
};

const rawVueSubmission = defineVueFormSubmission({
  onSubmit: ({ values, reinitialize }) => {
    values satisfies Readonly<Record<string, unknown>>;
    reinitialize({ preserve: { touched: true } });
    // @ts-expect-error Raw FormData-derived values remain unknown without a schema.
    values.email.toUpperCase();
  },
});
const schemaVueSubmission = defineVueFormSubmission({
  schema: submissionSchema,
  onSubmit: ({ values }) => {
    values.accountId satisfies number;
    values.normalizedEmail satisfies string;
    // @ts-expect-error Schema output does not expose pre-transform input fields.
    values.profile.email;
  },
});
const rawDOMSubmission = defineDOMFormSubmission({
  onSubmit: ({ values, reinitialize }) => {
    values satisfies Readonly<Record<string, unknown>>;
    reinitialize();
  },
});
const schemaDOMSubmission = defineDOMFormSubmission({
  schema: submissionSchema,
  onSubmit: ({ values }) => {
    values.accountId satisfies number;
    // @ts-expect-error Schema output accountId is numeric.
    values.accountId satisfies string;
  },
});
void rawVueSubmission;
void schemaVueSubmission;
void rawDOMSubmission;
void schemaDOMSubmission;
createDOMForm({ form: formElement, ...rawDOMSubmission });
createDOMForm({ form: formElement, ...schemaDOMSubmission });

h(SelectRoot, { items: [], modelValue: null, defaultValue: null });
h(SelectRoot, { items: ['a'], formOptions: 'selected' });
h(SelectRoot, { items: ['a'], renderedItems: ['a'] });
// @ts-expect-error The native rendered window consists of string IDs.
h(SelectRoot, { items: ['a'], renderedItems: [1] });
// @ts-expect-error Native submission projection has only the two admitted modes.
h(SelectRoot, { items: [], formOptions: 'visible' });
h(CheckboxIndicator, { forcePresent: true });
h(RadioGroupIndicator, { forcePresent: true });
h(NavigationMenuIndicator, { open: false, forcePresent: true });
h(ListboxItemIndicator, { forcePresent: true });
h(SelectItemIndicator, { forcePresent: true });
h(CascadeListItemIndicator, { forcePresent: true });
h(CascadeSelectItemIndicator, { forcePresent: true });
h(DisclosureContent, { forcePresent: true });
h(AccordionContent, { forcePresent: true });
h(TabsContent, { value: 'details', forcePresent: true });
h(TreeViewGroup, { for: 'root', forcePresent: true });
const treeGridGroup: TreeGridGroupProps = { for: 'root', forcePresent: true };
h(TreeGridGroup, treeGridGroup);
h(TreeGridRoot, { rows: [], headers: ['Name', 'Status'], getCellValue: () => '', setCellValue: () => {} });
h(TreeGridHeader);
const treeGridHeaderCell: TreeGridHeaderCellProps = { columnIndex: 1 };
h(TreeGridHeaderCell, treeGridHeaderCell);
// @ts-expect-error Header indexes are numeric grid coordinates.
h(TreeGridHeaderCell, { columnIndex: 'name' });
h(CarouselSlide, { value: 'slide-1', forcePresent: true });
h(CarouselRoot, { slides: ['slide-1'], indicatorGroupLabel: '슬라이드 선택', getPauseLabel: paused => paused ? '재생' : '정지' });
// @ts-expect-error Pause labels consume a boolean, not a slide identifier.
h(CarouselRoot, { slides: ['slide-1'], getPauseLabel: (paused: string) => paused });
h(FormMessage, { forcePresent: true });
h(FormSummary, { forcePresent: true });
h(ComboboxEmpty, { forcePresent: true });
h(TreeGridEditor, { for: 'name', forcePresent: true });
h(ComboboxRoot, {
  items: [],
  position: true,
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 8,
  collisionBoundary: 'viewport',
  avoidCollisions: true,
  hideWhenDetached: false,
  strategy: 'absolute',
  tracking: 'events',
});
h(CascadeSelectRoot, {
  nodes: [],
  position: true,
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 8,
  collisionBoundary: 'viewport',
  avoidCollisions: true,
  hideWhenDetached: false,
  strategy: 'absolute',
  tracking: 'events',
});
h(SpinButtonRoot, { min: 0, max: 10, draft: null, defaultDraft: null });
h(SpinButtonInput, { name: 'quantity', form: 'order', required: true });
h(SpinButtonIncrement, { label: 'Increase quantity' });
h(SpinButtonDecrement, { label: 'Decrease quantity' });
h(MenuRoot, { items: [] });
h(MenuButtonRoot, {
  items: [], open: false, position: true, side: 'bottom', align: 'start', sideOffset: 8,
  collisionPadding: 8, collisionBoundary: 'viewport', avoidCollisions: true,
  hideWhenDetached: false, strategy: 'absolute', tracking: 'events',
});
h(PopoverRoot, { position: false });
declare const popupGeometryAnchor: HTMLElement;
h(PopoverRoot, { anchor: popupGeometryAnchor });
h(PopoverRoot, { anchor: null });
h(PopoverRoot, { restoreFocusTarget: popupGeometryAnchor });
h(PopoverRoot, { restoreFocusTarget: null });
// @ts-expect-error Explicit focus-return targets are elements, not selector strings.
const invalidReturnTarget: Pick<PopoverRootProps, 'restoreFocusTarget'> = { restoreFocusTarget: '#opener' };
void invalidReturnTarget;
const popupAnchor: Pick<PopoverRootProps, 'anchor'> = { anchor: popupGeometryAnchor };
// @ts-expect-error Geometry anchors are elements, not selectors or serialized config.
const invalidPopupAnchor: Pick<PopoverRootProps, 'anchor'> = { anchor: '#cell-value' };
void popupAnchor; void invalidPopupAnchor;
const escapePolicy: Pick<PopoverRootProps, 'closeOnEscape'> = { closeOnEscape: false };
void escapePolicy;
// @ts-expect-error Escape policy is a boolean option.
const invalidEscapePolicy: Pick<PopoverRootProps, 'closeOnEscape'> = { closeOnEscape: 'disabled' };
void invalidEscapePolicy;
const popupEscapePolicies: readonly [
  DialogRootProps['closeOnEscape'], AlertDialogRootProps['closeOnEscape'],
  DrawerRootProps['closeOnEscape'], PopoverRootProps['closeOnEscape'],
  TooltipRootProps['closeOnEscape'],
] = [false, true, undefined, false, true];
void popupEscapePolicies;
h(TooltipRoot, { position: false });
h(MeterRoot, { value: '25', min: 0, max: '100', label: 'Quota' });
// @ts-expect-error Meter value is required.
h(MeterRoot, {});
h(MeterGroupRoot, { items: [{ id: 'used', value: '25', label: 'Used' }], max: 100, label: 'Capacity' });
// @ts-expect-error MeterGroup items are required.
h(MeterGroupRoot, {});
h(MeterGroupSegment, { id: 'used' });
// @ts-expect-error MeterGroup segment id is required.
h(MeterGroupSegment, {});
h(DatePickerRoot, { modelValue: date, policies: datePickerPolicies });
h(MonthPickerRoot, { modelValue: monthPickerValue });
h(YearPickerRoot, { modelValue: yearPickerValue });
h(NumberField, { policies: numberFieldPolicies });
h(DateField, { policies: dateFieldPolicies });
h(TimeField, { policies: timeFieldPolicies });
h(DateTimeField, { policies: dateTimeFieldPolicies });
h(VirtualList, {
  items: [{ id: 'row-1', title: 'First row' }],
  getID: (value: { id: string }) => value.id,
  sizePolicy: { kind: 'fixed', extent: 24 },
});
h(VirtualGrid, {
  items: [{ id: 'cell-1' }],
  getID: (value: { id: string }) => value.id,
  sizePolicy: { kind: 'fixed', extent: 24 },
  lanePolicy: { kind: 'responsive', minExtent: 180, maxCount: 6 },
});
h(VirtualMasonry, {
  items: [{ id: 'card-1' }],
  getID: (value: { id: string }) => value.id,
  sizePolicy: { kind: 'estimated', estimate: 240 },
  lanePolicy: { kind: 'fixed', count: 2 },
});
h(VirtualSpatial, {
  items: [{ id: 'node-1', x: 10, y: 20 }],
  getID: (value: { id: string }) => value.id,
  getRect: (value: { x: number; y: number }) => ({
    x: value.x,
    y: value.y,
    width: 120,
    height: 80,
  }),
  sizeOwnership: 'declared',
});

// @ts-expect-error items is required at runtime.
h(MenuRoot, {});
// @ts-expect-error date pickers do not accept date-time ranges.
h(DatePickerRoot, { modelValue: dateTimeRange });

const spinButtonInputProps: SpinButtonInputProps = {
  name: 'quantity',
  form: 'order',
  required: true,
};
const numberFieldProps: NumberFieldProps = { native: true };
const meterProps: MeterRootProps = { value: '25' };
const invalidMeterProps: MeterRootProps = {
  value: '25',
  // @ts-expect-error Meter has no model ownership API.
  modelValue: '30',
};
const meterSlot: MeterRootSlotProps = {
  value: '25', min: '0', max: '100', low: '0', high: '100', optimum: '50',
  valueText: '25', percentage: 25, zone: 'optimum',
};
const meterGroupEntries: readonly MeterGroupEntry[] = [{ id: 'used', value: 25, label: 'Used' }];
const meterGroupProps: MeterGroupRootProps = { items: meterGroupEntries, max: '100' };
const invalidMeterGroupProps: MeterGroupRootProps = {
  items: meterGroupEntries,
  // @ts-expect-error MeterGroup has no model ownership API.
  modelValue: meterGroupEntries,
};
const meterGroupSegment: MeterGroupSegmentSlotProps = {
  id: 'used', label: 'Used', value: '25', valueText: '25 GB', start: '0', end: '25',
  percentage: 25, startPercentage: 0, endPercentage: 25,
};
const meterGroupSlot: MeterGroupRootSlotProps = {
  segments: [meterGroupSegment], max: '100', total: '25', remaining: '75', percentage: 25,
  zone: 'optimum', valueText: '25 / 100',
};
void spinButtonInputProps;
void numberFieldProps;
void meterProps;
void invalidMeterProps;
void meterSlot;
void meterGroupProps;
void invalidMeterGroupProps;
void meterGroupSlot;
void useToast;

declare const toast: UseToastReturn;
toast.toast({ id: 'request', title: 'Request pending', durationMs: null });
toast.toast({ id: 'custom', title: 'Custom category', kind: 'product-specific' });
toast.update('request', { title: 'Request complete', kind: 'success', durationMs: 3_000 });
toast.dismiss('request');
toast.dismissAll();
toast.toasts.value satisfies readonly { readonly id: string }[];
toast.paused.value satisfies boolean;

// @ts-expect-error toast identifiers are required.
toast.toast({ title: 'Missing identifier' });
// @ts-expect-error updates cannot replace a toast identifier.
toast.update('request', { id: 'other' });

type DatePickerValue = Parameters<DatePickerValueChangeHandler>[0];
type DatePickerSlotValue = DatePickerRootSlotProps['value'];
type DatePickerContentSlot = NonNullable<InstanceType<typeof DatePickerContent>['$slots']['default']>;
type DatePickerContentSlotValue = Parameters<DatePickerContentSlot>[0]['value'];
type MenuProps = InstanceType<typeof MenuRoot>['$props'];
type MenuButtonProps = InstanceType<typeof MenuButtonRoot>['$props'];
interface VirtualRow { readonly id: string; readonly title: string; }
type VirtualRowValue = VirtualListSlotProps<VirtualRow>['value'];
type VirtualGridValue = VirtualGridSlotProps<VirtualRow>['value'];
type VirtualMasonryValue = VirtualMasonrySlotProps<VirtualRow>['value'];
type VirtualSpatialValue = VirtualSpatialSlotProps<VirtualRow>['value'];
const virtualRows: readonly VirtualRow[] = [{ id: 'row-1', title: 'First row' }];
const virtualListProps: VirtualListProps<VirtualRow> = {
  items: virtualRows,
  getID: (value) => value.id,
  sizePolicy: { kind: 'fixed', extent: 24 },
};
const virtualGridProps: VirtualGridProps<VirtualRow> = {
  ...virtualListProps,
  lanePolicy: { kind: 'fixed', count: 2 },
};
const virtualMasonryProps: VirtualMasonryProps<VirtualRow> = {
  items: virtualRows,
  getID: (value) => value.id,
  sizePolicy: { kind: 'estimated', estimate: 24 },
  lanePolicy: { kind: 'fixed', count: 2 },
};
const virtualSpatialProps: VirtualSpatialProps<VirtualRow> = {
  items: virtualRows,
  getID: (value) => value.id,
  getRect: (_value) => ({ x: 0, y: 0, width: 1, height: 1 }),
  sizeOwnership: 'mounted',
};
void virtualListProps;
void virtualGridProps;
void virtualMasonryProps;
void virtualSpatialProps;
type _datePickerValue = Assert<Equal<DatePickerValue, DateValue | null>>;
type _datePickerSlotValue = Assert<Equal<DatePickerSlotValue, DateValue | null>>;
type _datePickerContentSlotValue = Assert<Equal<DatePickerContentSlotValue, DateValue | null>>;
type _menuDoesNotExposeOpen = Assert<Equal<'open' extends keyof MenuProps ? true : false, false>>;
type _menuButtonExposesOpen = Assert<Equal<'open' extends keyof MenuButtonProps ? true : false, true>>;
type _virtualRowValue = Assert<Equal<VirtualRowValue, VirtualRow>>;
type _virtualGridValue = Assert<Equal<VirtualGridValue, VirtualRow>>;
type _virtualMasonryValue = Assert<Equal<VirtualMasonryValue, VirtualRow>>;
type _virtualSpatialValue = Assert<Equal<VirtualSpatialValue, VirtualRow>>;
import { provideFormControlReset } from '@sectile/vue/form-boundary';
const decorateNativeReset: (reset: () => void) => void = provideFormControlReset;
void decorateNativeReset;
