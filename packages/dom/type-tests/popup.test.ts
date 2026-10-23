import type { DialogConnection, DialogOptions } from '@sectile/dom/dialog';
import type { ComboboxOptions, ComboboxPresentation, ComboboxConstructionErrorCode } from '@sectile/dom/combobox';
const inlineComboboxMode: ComboboxPresentation = 'inline';
const invalidPresentationCode: ComboboxConstructionErrorCode = 'dom.combobox-presentation'; void invalidPresentationCode;
const inlineComboboxOptions: ComboboxOptions<'open'> = { input: document.createElement('input'), popup: document.createElement('div'), items: [{ id: 'open', label: 'Open' }], presentation: inlineComboboxMode, policies: { eligible: id => id === 'open' } };
// @ts-expect-error Native presentation is a closed host choice.
const invalidComboboxMode: ComboboxPresentation = 'floating';
void [inlineComboboxOptions, invalidComboboxMode];
import type { MenuModel } from '@sectile/core/menu';
import type { MenuOptions, MenuConstructionErrorCode, MenuConnection } from '@sectile/dom/menu';
import type { MenuButtonOptions } from '@sectile/dom/menu-button';
import { tryCreateContextMenu, type ContextMenuOptions, type ContextMenuConstructionErrorCode } from '@sectile/dom/context-menu';
import type { MenubarOptions } from '@sectile/dom/menubar';
import type { NavigationMenuOptions } from '@sectile/dom/navigation-menu';
declare const preparedMenu: MenuModel<'file' | 'open'>;
const contextDefinition: ContextMenuOptions<'file' | 'open'> = { root: document.createElement('div'), trigger: document.createElement('button'), model: preparedMenu, onInvoke(id) { const exact: 'file' | 'open' = id; void exact; } };
const contextMenu = tryCreateContextMenu(contextDefinition);
if (!contextMenu.ok) { const code: ContextMenuConstructionErrorCode = contextMenu.error.code; void code; }
if (contextMenu.ok) {
  const geometry: import('@sectile/dom/position').PositionRect | undefined = contextMenu.value.getAnchorRect();
  if (geometry) {
    // @ts-expect-error The host publishes a readonly geometry snapshot.
    geometry.x = 50;
  }
  contextMenu.value.handleEvent({ type: 'focus', id: 'open' });
  // @ts-expect-error Context menu preserves its declared identity domain.
  contextMenu.value.handleEvent({ type: 'focus', id: 'foreign' });
  contextMenu.value.syncControlledValue(true); contextMenu.value.suspend(); contextMenu.value.resume();
}
const restoredContext: ContextMenuOptions<'file' | 'open'> = { ...contextDefinition, anchorRect: { x: 10, y: 20, width: 0, height: 0 } }; void restoredContext;
// @ts-expect-error A context menu requires a concrete native invocation target.
const missingContextTarget: ContextMenuOptions<'file'> = { root: document.createElement('div'), items: [{ id: 'file', parentID: null }] };
// @ts-expect-error Prepared and raw definitions have one canonical owner.
const mixedContextDefinition: ContextMenuOptions<'file' | 'open'> = { ...contextDefinition, items: [] };
// @ts-expect-error Trigger behavior is supplied by the context profile, not a public implementation flag.
const exposedContextFlag: ContextMenuOptions<'file' | 'open'> = { ...contextDefinition, triggerMode: 'context-menu' };
void [missingContextTarget, mixedContextDefinition, exposedContextFlag];
declare const connectedMenu: MenuConnection<'file' | 'open'>;
connectedMenu.prepareMove(); connectedMenu.completeMove(); connectedMenu.completeMove(false);
// @ts-expect-error Retained menu completion accepts cancellation, not a destination selector.
connectedMenu.completeMove('body');
const registeredSubmenuID: string | undefined = connectedMenu.getSubmenuID('file'); void registeredSubmenuID;
// @ts-expect-error Registered submenu queries preserve the declared menu domain.
connectedMenu.getSubmenuID('foreign');
const menuElement = document.createElement('div');
const preparedMenuOptions: readonly [MenuOptions<'file' | 'open'>, MenuButtonOptions<'file' | 'open'>, MenubarOptions<'file' | 'open'>, NavigationMenuOptions<'file' | 'open'>] = [
  { root: menuElement, model: preparedMenu }, { root: menuElement, trigger: document.createElement('button'), model: preparedMenu },
  { root: menuElement, model: preparedMenu }, { root: menuElement, model: preparedMenu },
];
const menuDefinitionError: MenuConstructionErrorCode = 'dom.menu-definition-ambiguous';
// @ts-expect-error A menu requires exactly one domain definition.
const missingMenuDefinition: MenuOptions<'file'> = { root: menuElement };
// @ts-expect-error Raw inputs and a prepared model cannot compete.
const mixedMenuDefinition: MenuOptions<'file' | 'open'> = { root: menuElement, items: [], model: preparedMenu };
// @ts-expect-error A model cannot widen an explicitly declared menu identity domain.
const foreignMenuDefinition: MenuOptions<'file'> = { root: menuElement, model: preparedMenu };
void [preparedMenuOptions, menuDefinitionError, missingMenuDefinition, mixedMenuDefinition, foreignMenuDefinition];
import type { AlertDialogConnection, AlertDialogOptions } from '@sectile/dom/alert-dialog';
import type { DrawerConnection, DrawerOptions } from '@sectile/dom/drawer';
import type { PopoverConnection, PopoverOptions } from '@sectile/dom/popover';
import type { TooltipConnection, TooltipOptions } from '@sectile/dom/tooltip';
import type { PositionRect } from '@sectile/dom/position';
const contextPoint: PositionRect = { x: 10, y: 20, width: 0, height: 0 };
const rectPopover: PopoverOptions = { root: document.createElement('div'), anchorRect: contextPoint };
const rectTooltip: TooltipOptions = { root: document.createElement('div'), anchorRect: contextPoint };
const unchangedElementAnchor: HTMLElement | undefined = rectPopover.anchor;
declare const rectPopup: PopoverConnection;
rectPopup.prepareMove(); rectPopup.completeMove(); rectPopup.completeMove(false);
// @ts-expect-error Move completion accepts a boolean cancellation choice, not a selector.
rectPopup.completeMove('body');
rectPopup.syncPosition({ anchorRect: contextPoint });
rectPopup.syncPosition({ anchorRect: null });
// @ts-expect-error A rectangle requires both dimensions, even for a point.
rectPopup.syncPosition({ anchorRect: { x: 10, y: 20 } });
// @ts-expect-error Geometry snapshots cannot replace the HTMLElement context anchor.
rectPopup.syncPosition({ anchor: contextPoint });
// @ts-expect-error Coordinates are CSS-pixel numbers, not CSS text.
const invalidPoint: PositionRect = { x: '10px', y: 20, width: 0, height: 0 };
void [rectPopover, rectTooltip, unchangedElementAnchor, invalidPoint];
import { tryCreateToast, type ToastErrorCode } from '@sectile/dom/toast';
const nativeToast = tryCreateToast({ root: document.createElement('ol'), tickIntervalMs: 100 });
const detachedToast = tryCreateToast<'saved'>({ initialToasts: [{ id: 'saved', title: 'Saved' }] });
if (detachedToast.ok) {
  detachedToast.value.setViewport(document.createElement('ol'), 'Notifications');
  detachedToast.value.setViewport(undefined);
  detachedToast.value.setToastAttributes(undefined, 'saved'); detachedToast.value.setCloseButtonAttributes(undefined, 'saved');
  const element: HTMLElement | undefined = detachedToast.value.getToastElement('saved'); void element;
  detachedToast.value.syncConfiguration({ closeLabel: 'Close', maxVisible: 3, defaultDurationMs: null });
  // @ts-expect-error Viewport attachment needs an HTMLElement, not a selector.
  detachedToast.value.setViewport('#toasts');
  // @ts-expect-error Native configuration does not reconstruct the construction interval.
  detachedToast.value.syncConfiguration({ tickIntervalMs: 10 });
  // @ts-expect-error Callback lifetime remains constructor-owned.
  detachedToast.value.syncConfiguration({ onUpdate() {} });
  // @ts-expect-error Native registrations keep their queue identity domain.
  detachedToast.value.getToastElement('foreign');
}
if (!nativeToast.ok) { const code: ToastErrorCode = nativeToast.error.code; void code; }
// @ts-expect-error Native clock inputs are numeric durations.
tryCreateToast({ root: document.createElement('ol'), tickIntervalMs: '100' });
import { getTooltipTriggerAttributes, connectTooltipDescription, type TooltipTriggerAttributes, type TooltipTriggerAttributesOptions } from '@sectile/dom/tooltip';
const tooltipReference: TooltipTriggerAttributesOptions = { id: 'tip', describedBy: 'help', active: true };
const tooltipAttributes: TooltipTriggerAttributes = getTooltipTriggerAttributes(tooltipReference);
const releaseTooltipReference: () => void = connectTooltipDescription(document.createElement('button'), 'tip');
void [tooltipAttributes, releaseTooltipReference];
// @ts-expect-error Native description references are strings, not numeric values.
getTooltipTriggerAttributes({ id: 'tip', describedBy: 42 });
import { connectLayerHost, reserveLayerPresentation, type LayerHostConnection, type LayerHostPolicy, type LayerReservation } from '@sectile/dom/layer-host';

const hostResult = connectLayerHost({ element: document.createElement('div'), policy: { key: 'admitted-profile', capacity: 1000 } });
declare const host: LayerHostConnection;
const focusTargets: Pick<DialogOptions, 'restoreFocusTarget'> & Pick<DrawerOptions, 'restoreFocusTarget'> & Pick<AlertDialogOptions, 'restoreFocusTarget'> = { restoreFocusTarget: document.createElement('button') };
void focusTargets;
const reserved = reserveLayerPresentation({ element: document.createElement('div'), layerHost: host });
if (reserved.ok) {
  const options: Pick<DialogOptions, 'reservation'> & Pick<DrawerOptions, 'reservation'> & Pick<AlertDialogOptions, 'reservation'> = { reservation: reserved.value };
  reserved.value.release(); void options;
}
// @ts-expect-error Only the document owner issues admission tickets.
const forgedReservation: LayerReservation = { release() {} };
void forgedReservation;
declare const transferPopup: PopoverConnection;
transferPopup.suspend(); transferPopup.resume();
const nativeActive: boolean = transferPopup.getActive(); void nativeActive;
declare const selectPopup: import('@sectile/dom/select').SelectConnection<'a' | 'b'>;
selectPopup.suspend(); selectPopup.resume();
const selectActive: boolean = selectPopup.getActive(), selectOrder: number | null = selectPopup.getLayerOrder();
const reparentSelect: import('@sectile/core/result').Result<void, import('@sectile/dom/dialog').DOMLayerReparentErrorCode> = selectPopup.syncLayerParent(null);
const selectPresentation: import('@sectile/dom/dialog').DOMLayerPresentationSubscription = selectPopup.subscribeLayerPresentation(snapshot => {
  const generation: number = snapshot.generation; void generation;
}); void selectPresentation;
void [selectActive, selectOrder, reparentSelect];
// @ts-expect-error Resumable native presentation preserves the selected identifier domain.
selectPopup.syncControlledValues({ value: 'c' });
declare const cascadePopup: import('@sectile/dom/cascade-select').CascadeSelectConnection<'asia' | 'seoul'>;
const cascadePath: Pick<import('@sectile/dom/cascade-select').CascadeSelectOptions<'asia' | 'seoul'>, 'defaultPath'> = { defaultPath: ['asia'] };
void cascadePath;
const cascadeDirection: Pick<import('@sectile/dom/cascade-select').CascadeSelectOptions<'asia' | 'seoul'>, 'direction'> = { direction: 'rtl' };
const cascadeListDirection: Pick<import('@sectile/dom/cascade-list').CascadeListOptions<'asia' | 'seoul'>, 'direction'> = { direction: 'ltr' };
void [cascadeDirection, cascadeListDirection];
// @ts-expect-error Directions are a closed reading-direction domain, not arbitrary text.
const invalidCascadeDirection: typeof cascadeDirection = { direction: 'sideways' }; void invalidCascadeDirection;
// @ts-expect-error Initial navigation keeps the tree identifier domain.
const invalidCascadePath: typeof cascadePath = { defaultPath: ['unknown'] }; void invalidCascadePath;
cascadePopup.suspend(); cascadePopup.resume(); cascadePopup.refresh();
const cascadeActive: boolean = cascadePopup.getActive(), cascadeOrder: number | null = cascadePopup.getLayerOrder();
const cascadePresentation: import('@sectile/dom/dialog').DOMLayerPresentationSubscription = cascadePopup.subscribeLayerPresentation(() => {});
const cascadeParent: import('@sectile/core/result').Result<void, import('@sectile/dom/dialog').DOMLayerReparentErrorCode> = cascadePopup.syncLayerParent(null);
void [cascadeActive, cascadeOrder, cascadePresentation, cascadeParent];
// @ts-expect-error Resumption does not widen the tree identifier domain.
cascadePopup.syncControlledValues({ value: 'unknown' });
const transferred: import('@sectile/core/result').Result<void, import('@sectile/dom/layer-host').LayerHostTransferErrorCode> = transferPopup.syncLayerHost(host);
declare const comboboxPopup: import('@sectile/dom/combobox').ComboboxConnection<'a' | 'b'>;
comboboxPopup.suspend(); comboboxPopup.resume(); comboboxPopup.render();
const comboboxActive: boolean = comboboxPopup.getActive(), comboboxOrder: number | null = comboboxPopup.getLayerOrder();
const comboboxPresentation: import('@sectile/dom/dialog').DOMLayerPresentationSubscription = comboboxPopup.subscribeLayerPresentation(() => {});
const comboboxParent: import('@sectile/core/result').Result<void, import('@sectile/dom/dialog').DOMLayerReparentErrorCode> = comboboxPopup.syncLayerParent(null);
void [comboboxActive, comboboxOrder, comboboxPresentation, comboboxParent];
// @ts-expect-error Resumption preserves the Combobox identifier domain.
comboboxPopup.syncControlledValues({ value: 'unknown' });
declare const menuPopup: import('@sectile/dom/menu-button').MenuButtonConnection<'file' | 'open'>;
menuPopup.suspend(); menuPopup.resume(); menuPopup.refresh('file');
menuPopup.setItemAttributes(undefined, 'file'); menuPopup.setSubmenuAttributes(undefined, 'file');
const menuActive: boolean = menuPopup.getActive(), menuOrder: number | null = menuPopup.getLayerOrder();
const menuPresentation: import('@sectile/dom/dialog').DOMLayerPresentationSubscription = menuPopup.subscribeLayerPresentation(() => {});
const menuParent: import('@sectile/core/result').Result<void, import('@sectile/dom/dialog').DOMLayerReparentErrorCode> = menuPopup.syncLayerParent(null);
const menuPath: Pick<import('@sectile/dom/menu-button').MenuButtonOptions<'file' | 'open'>, 'defaultOpenPath'> = { defaultOpenPath: ['file'] };
void [menuActive, menuOrder, menuPresentation, menuParent, menuPath];
// @ts-expect-error Menu paths preserve the identifier domain.
const invalidMenuPath: typeof menuPath = { defaultOpenPath: ['unknown'] }; void invalidMenuPath;
const transferTargets: readonly [Parameters<DialogConnection['syncLayerHost']>[0], Parameters<AlertDialogConnection['syncLayerHost']>[0], Parameters<DrawerConnection['syncLayerHost']>[0], Parameters<TooltipConnection['syncLayerHost']>[0]] = [host, host, host, host];
// @ts-expect-error Host transfer requires a genuine connection, not a target selector.
transferPopup.syncLayerHost('#portal');
void [transferred, transferTargets];
const dismissal: import('@sectile/dom/dialog').PopupDismissalOptions = { closeOnEscape: true, closeOnInteractOutside: false };
transferPopup.syncDismissal(dismissal);
transferPopup.syncDisabled(true);
// @ts-expect-error Disabled state is a boolean, not a DOM attribute string.
transferPopup.syncDisabled('true');
declare const gestureDrawer: DrawerConnection;
const gestureResult: import('@sectile/core/result').Result<void, import('@sectile/dom/drawer').DrawerGestureErrorCode> = gestureDrawer.syncGesture({ side: 'left', swipeToDismiss: true });
void gestureResult;
// @ts-expect-error Drawer direction is a closed side vocabulary.
gestureDrawer.syncGesture({ side: 'start', swipeToDismiss: true });
// @ts-expect-error Gesture replacement requires explicit enablement.
gestureDrawer.syncGesture({ side: 'bottom' });
const behavior: import('@sectile/dom/dialog').PopupBehaviorOptions = { modal: false, trapFocus: false, autoFocus: true, restoreFocus: true };
const behaviorResult: import('@sectile/core/result').Result<void, import('@sectile/dom/dialog').PopupBehaviorErrorCode> = transferPopup.syncBehavior(behavior);
void behaviorResult;
// @ts-expect-error Native behavior updates require complete boolean flags.
transferPopup.syncBehavior({ modal: false });
const placement: import('@sectile/dom/popover').PopupPositionOptions = { side: 'top', position: false, tracking: 'events' };
transferPopup.syncPosition(placement);
declare const externalGeometryAnchor: HTMLElement;
const initiatingPopover: Pick<PopoverOptions, 'restoreFocusTarget'> = { restoreFocusTarget: externalGeometryAnchor };
void initiatingPopover;
transferPopup.syncBehavior({ ...behavior, restoreFocusTarget: externalGeometryAnchor });
transferPopup.syncBehavior({ ...behavior, restoreFocusTarget: null });
// @ts-expect-error Focus return uses a live element, not a serialized selector.
transferPopup.syncBehavior({ ...behavior, restoreFocusTarget: '#opener' });
transferPopup.syncPosition({ anchor: externalGeometryAnchor });
transferPopup.syncPosition({ anchor: null });
// @ts-expect-error Geometry references are elements, not selector strings.
transferPopup.syncPosition({ anchor: '#cell-value' });
declare const positionedTooltip: TooltipConnection;
positionedTooltip.syncPosition({});
positionedTooltip.syncBehavior({ modal: false, autoFocus: false, restoreFocus: false, trapFocus: false });
// @ts-expect-error Tooltip does not own modal or autofocus behavior.
positionedTooltip.syncBehavior({ modal: true, autoFocus: true, restoreFocus: false, trapFocus: false });
declare const fixedModal: AlertDialogConnection;
fixedModal.syncBehavior({ modal: true, autoFocus: true, restoreFocus: true, trapFocus: true });
// @ts-expect-error AlertDialog retains its required modal behavior.
fixedModal.syncBehavior({ modal: false, autoFocus: true, restoreFocus: true, trapFocus: true });
// @ts-expect-error Position changes use logical options, not CSS lengths.
transferPopup.syncPosition({ sideOffset: '8px' });
const tooltipOutside: Pick<TooltipOptions, 'closeOnInteractOutside' | 'onInteractOutside'> = {
  closeOnInteractOutside: true, onInteractOutside: event => event.preventDefault(),
};
void tooltipOutside;
// @ts-expect-error A complete boolean dismissal policy is required.
transferPopup.syncDismissal({ closeOnEscape: false });
const hostedOptions: readonly [DialogOptions['layerHost'], AlertDialogOptions['layerHost'], DrawerOptions['layerHost'], PopoverOptions['layerHost'], TooltipOptions['layerHost']] = [host, host, host, host, host];
type ChoiceHosts = readonly [import('@sectile/dom/select').SelectOptions<'a'>['layerHost'], ComboboxOptions<'a'>['layerHost'], import('@sectile/dom/cascade-select').CascadeSelectOptions<'a'>['layerHost']];
const hostedChoices: ChoiceHosts = [host, host, host];
const inactiveChoices: ChoiceHosts = [null, null, null];
// @ts-expect-error Hosted choice connections require a real host, not a CSS selector.
const invalidChoiceHost: ChoiceHosts = ['#host', host, host];
void [hostedChoices, inactiveChoices, invalidChoiceHost];
host.reconfigure({ key: 'next', capacity: 2 }, [host]);
transferPopup.syncLayerHost(undefined);
const preparedPolicy = host.preparePolicy({ key: 'prepared', capacity: 2 }, [host]);
if (preparedPolicy.ok) {
  const committed: import('@sectile/core/result').Result<void, import('@sectile/dom/layer-host').LayerHostErrorCode> = preparedPolicy.value();
  void committed;
}
// @ts-expect-error Capacity is numeric, not a CSS length.
const invalidHostPolicy: LayerHostPolicy = { key: 'profile', capacity: '2px' };
// @ts-expect-error Lifecycle state is read-only.
host.active = false;
void [hostResult, hostedOptions, invalidHostPolicy];

const escapePolicies: readonly [
  DialogOptions['closeOnEscape'], AlertDialogOptions['closeOnEscape'],
  DrawerOptions['closeOnEscape'], PopoverOptions['closeOnEscape'],
  TooltipOptions['closeOnEscape'],
] = [false, true, undefined, false, true];
void escapePolicies;
// @ts-expect-error Escape policy is a boolean option.
const invalid: DialogOptions['closeOnEscape'] = 'disabled';
void invalid;

const orders: readonly [
  ReturnType<DialogConnection['getLayerOrder']>, ReturnType<AlertDialogConnection['getLayerOrder']>,
  ReturnType<DrawerConnection['getLayerOrder']>, ReturnType<PopoverConnection['getLayerOrder']>,
  ReturnType<TooltipConnection['getLayerOrder']>,
] = [0, null, 2, 3, null];
void orders;
// @ts-expect-error An absent layer is null, not undefined.
const invalidOrder: ReturnType<DialogConnection['getLayerOrder']> = undefined;
void invalidOrder;

declare const popup: PopoverConnection;
const subscription = popup.subscribeLayerPresentation(snapshot => {
  const phase: 'active' | 'exiting' | 'closed' = snapshot.phase;
  const order: number | null = snapshot.order;
  const generation: number = snapshot.generation;
  const hostedRank: number | undefined = snapshot.hostOrder;
  // @ts-expect-error Committed presentation snapshots are immutable.
  snapshot.order = 0;
  void [phase, order, generation, hostedRank];
});
if (subscription.ok) subscription.value();
else {
  const code: import('@sectile/dom/popover').DOMLayerPresentationErrorCode = subscription.error.code;
  void code;
}
const listeners: readonly [
  Parameters<DialogConnection['subscribeLayerPresentation']>[0],
  Parameters<AlertDialogConnection['subscribeLayerPresentation']>[0],
  Parameters<DrawerConnection['subscribeLayerPresentation']>[0],
  Parameters<TooltipConnection['subscribeLayerPresentation']>[0],
] = [() => {}, () => {}, () => {}, () => {}];
void listeners;

const retaining: PopoverOptions = { root: document.createElement('div'), retainExit: true };
const completion: import('@sectile/core/result').Result<void> = popup.completeLayerExit(1);
// @ts-expect-error A completion requires a numeric canonical generation.
popup.completeLayerExit('1');
void [retaining, completion];
const parentSurface = document.createElement('div');
const reparented: import('@sectile/core/result').Result<void, import('@sectile/dom/popover').DOMLayerReparentErrorCode> = popup.syncLayerParent(parentSurface);
popup.syncLayerParent(null);
// @ts-expect-error Parent admission uses owned DOM surfaces, not private layer IDs.
popup.syncLayerParent('layer-id');
const parents: readonly [Parameters<DialogConnection['syncLayerParent']>[0], Parameters<AlertDialogConnection['syncLayerParent']>[0], Parameters<DrawerConnection['syncLayerParent']>[0], Parameters<TooltipConnection['syncLayerParent']>[0]] = [parentSurface, null, parentSurface, null];
void [reparented, parents];

const inputMethods: readonly [import('@sectile/dom/dialog').PopupInputMethod, import('@sectile/dom/alert-dialog').PopupInputMethod,
  import('@sectile/dom/drawer').PopupInputMethod, import('@sectile/dom/popover').PopupInputMethod,
  import('@sectile/dom/tooltip').PopupInputMethod] = ['keyboard', 'pointer', 'programmatic', 'keyboard', 'pointer'];
const inputHandler: import('@sectile/dom/popover').PopupOpenChangeHandler = (open, method) => {
  const value: boolean = open; const source: 'keyboard' | 'pointer' | 'programmatic' = method; void [value, source];
};
const inputOptions: PopoverOptions = { root: document.createElement('div'), onOpenChange: inputHandler };
const oldHandler: DialogOptions = { root: document.createElement('div'), onOpenChange: open => { const value: boolean = open; void value; } };
const closeHandler: import('@sectile/dom/dialog').PopupOpenChangeHandler = (open, method, reason) => {
  const cause: import('@sectile/dom/dialog').PopupCloseReason | undefined = reason; void [open, method, cause];
};
popup.handleEvent('close', 'keyboard', 'close-button'); gestureDrawer.handleEvent('close', 'pointer', 'swipe');
// @ts-expect-error Close cause uses the canonical popup vocabulary.
popup.handleEvent('close', 'programmatic', 'unknown');
void closeHandler;
popup.handleEvent('close', 'keyboard'); gestureDrawer.handleEvent('close', 'pointer');
// @ts-expect-error Input origin is a closed native vocabulary.
popup.handleEvent('open', 'touch');
void [inputMethods, inputOptions, oldHandler];
