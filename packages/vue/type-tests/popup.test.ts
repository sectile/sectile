import type { DialogRootProps, DialogRootSlotProps } from '@sectile/vue/dialog';
const optionalDescription: DialogRootProps = { describedBy: null };
const externalDescription: DialogRootProps = { describedBy: 'help' };
// @ts-expect-error Description association is an ID or explicit removal.
const invalidDescription: DialogRootProps = { describedBy: false };
void [optionalDescription, externalDescription, invalidDescription];
import type { AlertDialogRootSlotProps } from '@sectile/vue/alert-dialog';
import type { DrawerRootSlotProps } from '@sectile/vue/drawer';
import type { DrawerRootProps, DrawerPresentation } from '@sectile/vue/drawer';
import { DrawerRoot } from '@sectile/vue/drawer';
const inlineDrawer: DrawerRootProps = { presentation: 'inline', unmountOnExit: false };
const overlayDrawer: DrawerRootProps = { open: true };
declare const drawerSlot: DrawerRootSlotProps;
const placement: DrawerPresentation = drawerSlot.placement;
// @ts-expect-error Inline retains one closed navigation subtree.
const openInlineDrawer: DrawerRootProps = { presentation: 'inline', open: true, unmountOnExit: false };
// @ts-expect-error Inline must explicitly retain its content.
const unmountedInlineDrawer: DrawerRootProps = { presentation: 'inline' };
void [inlineDrawer, overlayDrawer, placement, openInlineDrawer, unmountedInlineDrawer];
declare const drawerInstance: InstanceType<typeof DrawerRoot>;
drawerInstance.requestClose(); drawerInstance.$emit('update:open', false);
drawerInstance.$emit('closeRequest', 'swipe');
// @ts-expect-error Close requests carry an actual canonical cause.
drawerInstance.$emit('closeRequest', 'unknown');
const actualInlineProps: typeof drawerInstance.$props = inlineDrawer;
// @ts-expect-error The actual component preserves inline's closed-state contract.
const actualOpenInlineProps: typeof drawerInstance.$props = { presentation: 'inline', open: true, unmountOnExit: false };
void [actualInlineProps, actualOpenInlineProps];
import type { PopoverRootSlotProps, PopoverRootExpose } from '@sectile/vue/popover';
import type { PopoverRootProps } from '@sectile/vue/popover';
import type { SelectRootProps } from '@sectile/vue/select';
import type { ComboboxRootProps } from '@sectile/vue/combobox';
import type { CascadeSelectRootProps } from '@sectile/vue/cascade-select';
import type { MenuButtonRootProps } from '@sectile/vue/menu-button';
import type { DatePickerRootProps } from '@sectile/vue/temporal/date-picker';
const independentPosition = { side: 'bottom', flip: false, shift: true } as const satisfies PopoverRootProps & TooltipRootProps;
const selectPosition: SelectRootProps = { items: ['a'], ...independentPosition };
const comboboxPosition: ComboboxRootProps = { items: [{ id: 'a', label: 'Alpha' }], ...independentPosition };
const cascadePosition: CascadeSelectRootProps = { nodes: [{ id: 'a', parentID: null }], ...independentPosition };
const menuPosition: MenuButtonRootProps = { items: [{ id: 'a', parentID: null }], ...independentPosition };
const pickerPosition: DatePickerRootProps = { ...independentPosition };
// @ts-expect-error Per-policy overrides remain booleans through public Vue declarations.
const invalidFlip: PopoverRootProps = { flip: 'never' };
// @ts-expect-error Drawer presentation does not own anchored collision policy.
const positionedDrawer: DrawerRootProps = { flip: false };
void [selectPosition, comboboxPosition, cascadePosition, menuPosition, pickerPosition, invalidFlip, positionedDrawer];
import { DatePickerContent, type DatePickerContentSlotProps, type DateValue } from '@sectile/vue/temporal/date-picker';
import type { DateRangePickerContentSlotProps, DateRange } from '@sectile/vue/temporal/date-range-picker';
import type { DateTimePickerContentSlotProps, DateTimeValue } from '@sectile/vue/temporal/date-time-picker';
import type { DateTimeRangePickerContentSlotProps, DateTimeRange } from '@sectile/vue/temporal/date-time-range-picker';
import type { MonthPickerContentSlotProps } from '@sectile/vue/temporal/month-picker';
import type { MonthRangePickerContentSlotProps } from '@sectile/vue/temporal/month-range-picker';
import type { YearPickerContentSlotProps } from '@sectile/vue/temporal/year-picker';
import { YearRangePickerContent, type YearRangePickerContentSlotProps } from '@sectile/vue/temporal/year-range-picker';
declare const pickerSlots: readonly [DatePickerContentSlotProps, DateRangePickerContentSlotProps, DateTimePickerContentSlotProps, DateTimeRangePickerContentSlotProps,
  MonthPickerContentSlotProps, MonthRangePickerContentSlotProps, YearPickerContentSlotProps, YearRangePickerContentSlotProps];
const pickerValues: readonly [DateValue | null, DateRange | null, DateTimeValue | null, DateTimeRange | null,
  DateValue | null, DateRange | null, DateValue | null, DateRange | null] =
  [pickerSlots[0].value, pickerSlots[1].value, pickerSlots[2].value, pickerSlots[3].value, pickerSlots[4].value, pickerSlots[5].value, pickerSlots[6].value, pickerSlots[7].value];
declare const actualDateContent: Parameters<NonNullable<InstanceType<typeof DatePickerContent>['$slots']['default']>>[0];
declare const actualYearRangeContent: Parameters<NonNullable<InstanceType<typeof YearRangePickerContent>['$slots']['default']>>[0];
const dateContent: DatePickerContentSlotProps = actualDateContent;
const yearRangeContent: YearRangePickerContentSlotProps = actualYearRangeContent;
void [pickerValues, dateContent, yearRangeContent];
import { TooltipRoot, type TooltipRootExpose, type TooltipRootProps } from '@sectile/vue/tooltip';
declare const tooltipRootInstance: InstanceType<typeof TooltipRoot>;
const tooltipRootExpose: TooltipRootExpose = tooltipRootInstance;
tooltipRootExpose.requestClose();
tooltipRootInstance.$emit('afterClose'); tooltipRootInstance.$emit('closeRequest', 'escape');
// @ts-expect-error Tooltip does not offer modal behavior.
const modalTooltip: typeof tooltipRootInstance.$props = { modal: true };
void modalTooltip;
declare const forwardedTooltipProps: { readonly [K in keyof TooltipRootProps]: TooltipRootProps[K] | undefined };
const actualTooltipProps: typeof tooltipRootInstance.$props = forwardedTooltipProps;
void actualTooltipProps;
import { provideFormBoundary } from '@sectile/vue/form-boundary';
declare const rootExpose: PopoverRootExpose;
rootExpose.requestClose(); provideFormBoundary();
// @ts-expect-error Closure delegates to its mounted owner; it accepts no forged open state.
rootExpose.requestClose(true);
import type { TooltipRootSlotProps } from '@sectile/vue/tooltip';
import { computed, defineComponent, h, shallowRef } from 'vue';
import { HostPortal, provideHostPortal, provideHostLayer, useHostLayer, provideHostActive, useHostActive, provideHostPopup, useHostPopup, type HostPopupBinding, type HostPortalProps, type HostProviderProps } from '@sectile/vue/host-provider';
const activeHost = useHostActive(); provideHostActive(activeHost);
import { provideHostLayerParent, useHostLayerParent, type HostLayerParent } from '@sectile/vue/host-provider';
provideHostLayerParent({ active: activeHost, open: computed(() => true), element: shallowRef<HTMLElement>(),
  presentation: shallowRef<import('@sectile/dom/dialog').DOMLayerPresentationSnapshot>() });
const logicalParent: HostLayerParent | undefined = useHostLayerParent();
if (logicalParent) {
  const eligible: boolean = logicalParent.available.value; void eligible;
  // @ts-expect-error Logical descendants borrow availability; they do not own it.
  logicalParent.available.value = true;
  // @ts-expect-error Logical descendants cannot replace their ancestor's native element.
  logicalParent.element.value = undefined;
}
const cachedProvider: HostProviderProps = { active: () => true }; void cachedProvider;
import type { LayerHostConnection } from '@sectile/dom/layer-host';
declare const host: LayerHostConnection;
const popupBinding: HostPopupBinding = {
  attach(requestClose) { requestClose(); }, onCloseRequest(reason) { const cause: import('@sectile/dom/dialog').PopupCloseReason = reason; void cause; },
  onOpenChange(open) { const accepted: boolean = open; void accepted; }, onAfterClose() {}, detach() {},
  onActiveChange(active) { const nativeAvailable: boolean = active; void nativeAvailable; },
};
provideHostPopup(popupBinding);
const claimedPopup: HostPopupBinding | undefined = useHostPopup(); void claimedPopup;
// @ts-expect-error Accepted state is a boolean, not a close cause.
popupBinding.onOpenChange('escape');
const provider: HostProviderProps = { layerHost: computed(() => host) };
const unavailable: HostProviderProps = { layerHost: null };
provideHostLayer(computed(() => host));
const layer: import('vue').ComputedRef<LayerHostConnection | null | undefined> = useHostLayer();
// @ts-expect-error A portal selector is not document layer admission.
const invalid: HostProviderProps = { layerHost: '#portal' };
void [provider, unavailable, layer, invalid];
const portal: HostPortalProps = { to: '#overlays', disabled: false, defer: true };
provideHostPortal(defineComponent({ setup: (_, { slots }) => () => h('div', slots['default']?.()) }));
h(HostPortal, portal);
// @ts-expect-error A portal target must be a selector or native element.
const invalidPortal: HostPortalProps = { to: 1 };
void invalidPortal;

declare const slots: readonly [DialogRootSlotProps, AlertDialogRootSlotProps, DrawerRootSlotProps, PopoverRootSlotProps, TooltipRootSlotProps];
for (const slot of [...slots, ...pickerSlots]) {
  const phase: 'active' | 'exiting' | 'closed' | undefined = slot.presentation?.phase;
  const order: number | null | undefined = slot.presentation?.order;
  // @ts-expect-error Committed generation snapshots are immutable.
  if (slot.presentation) slot.presentation.order = 0;
  void [phase, order];
}
import type { MenuRootSlotProps, MenuItemSlotProps } from '@sectile/vue/menu';
declare const menuSlot: MenuRootSlotProps, menuItemSlot: MenuItemSlotProps;
const menuModel: import('@sectile/core/menu').MenuModel<string> = menuSlot.model;
const menuLayer: import('@sectile/dom/dialog').DOMLayerPresentationSnapshot | undefined = menuSlot.presentation;
const menuBranch: boolean = menuItemSlot.branch;
void [menuModel, menuLayer, menuBranch];
