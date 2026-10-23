import { shallowRef, type ShallowRef } from 'vue';
import { useImage, type ImageSource, type ImageSnapshot, type ImageErrorCode, type UseImageReturn } from '@sectile/vue/image';
const element = shallowRef<HTMLImageElement | null>(null), active = shallowRef(true), source = shallowRef<ImageSource>({ src: '/avatar.svg' });
const observation: UseImageReturn = useImage({ element, active, source: () => source.value });
const snapshot: Readonly<ShallowRef<ImageSnapshot | undefined>> = observation.snapshot;
const failure: ImageErrorCode | undefined = observation.error.value; void snapshot; void failure;
// Vue optional props are present with undefined; forwarding them remains typed.
useImage({ element, source: () => ({ src: undefined, srcset: undefined, sizes: undefined, crossOrigin: undefined, referrerPolicy: undefined }) });
// @ts-expect-error Published snapshot ref is read-only.
observation.snapshot.value = undefined;
// @ts-expect-error Native facts are immutable rather than deep reactive model state.
observation.snapshot.value!.status = 'ready';
// @ts-expect-error Template source changes need a getter, not an inert copy.
useImage({ element, source: { src: '/avatar.svg' } });
// @ts-expect-error The native target must be an image.
useImage({ element: shallowRef(document.createElement('div')), source: () => ({}) });
// @ts-expect-error Active participation is reactive and explicit.
useImage({ element, source: () => ({}), active: true });
// @ts-expect-error Native source observation does not accept non-text source values.
useImage({ element, source: () => ({ src: 42 }) });
