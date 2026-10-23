import { getDOMLayerManager, type LayerHostConnection, type LayerHostErrorCode, type LayerHostPolicy, type LayerReservation, type LayerReservationErrorCode } from './overlay/layer/manager.js';
import type { Result } from '@sectile/core/result';

export type { LayerHostConnection, LayerHostErrorCode, LayerHostPolicy, LayerHostTransferErrorCode, LayerReservation, LayerReservationErrorCode } from './overlay/layer/manager.js';

/** Join this element's document paint policy. Does not move nodes or inject CSS. */
export function connectLayerHost(options: { readonly element: HTMLElement; readonly policy: LayerHostPolicy }): Result<LayerHostConnection, LayerHostErrorCode> {
  return getDOMLayerManager(options.element).connectHost(options.policy);
}

/** Reserve before asynchronous mounting; the accepting popup consumes the slot. */
export function reserveLayerPresentation(options: { readonly element: HTMLElement; readonly layerHost?: LayerHostConnection }): Result<LayerReservation, LayerReservationErrorCode> {
  return getDOMLayerManager(options.element).reserve(options.layerHost);
}
