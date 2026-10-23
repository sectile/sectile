import { shallowRef, type ShallowRef } from 'vue';
import type { Result } from '@sectile/core/result';
import { useFullscreen, type FullscreenSnapshot, type FullscreenErrorCode, type UseFullscreenReturn } from '@sectile/vue/fullscreen';
const element = shallowRef<HTMLElement | null>(null), active = shallowRef(true);
const observation: UseFullscreenReturn = useFullscreen({ element, active });
const snapshot: Readonly<ShallowRef<FullscreenSnapshot | undefined>> = observation.snapshot;
const failure: FullscreenErrorCode | undefined = observation.error.value;
const enter: Promise<Result<void, FullscreenErrorCode>> = observation.enter();
const exit: Promise<Result<void, FullscreenErrorCode>> = observation.exit();
const refresh: Result<void, FullscreenErrorCode> = observation.refresh();
void snapshot; void failure; void enter; void exit; void refresh;
// @ts-expect-error Published snapshots cannot be replaced by the consumer.
observation.snapshot.value = undefined;
// @ts-expect-error Native facts are immutable.
observation.snapshot.value!.active = true;
// @ts-expect-error The target must be reactive rather than an inert native node.
useFullscreen({ element: document.createElement('div') });
// @ts-expect-error A document is not an HTML fullscreen target.
useFullscreen({ element: shallowRef(document) });
// @ts-expect-error SVG is not the HTML target contract.
useFullscreen({ element: shallowRef(document.createElementNS('http://www.w3.org/2000/svg', 'svg')) });
// @ts-expect-error Participation must remain reactive.
useFullscreen({ element, active: true });
