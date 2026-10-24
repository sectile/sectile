import { shallowRef, type ShallowRef } from 'vue';
import { useMediaGesture, type MediaGestureErrorCode, type MediaGestureInput, type UseMediaGestureReturn, type MediaPointerAdmission } from '@sectile/vue/media-gesture';
const element = shallowRef<HTMLElement | null>(null), active = shallowRef(true);
const gesture: UseMediaGestureReturn = useMediaGesture({ element, active, dragThreshold: 4,
  admitPointer(input) { const admission: MediaPointerAdmission = input; return !admission.protectedOrigin; },
  onStart: () => true, onMove(input) { const value: MediaGestureInput = input; void value; }, onWheel: input => input.delta < 0 });
const error: Readonly<ShallowRef<MediaGestureErrorCode | undefined>> = gesture.error; void error;
const measure = gesture.measure, projected = measure([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
if (projected.ok) {
  const y: number = projected.value.points[1].y; void y;
  // @ts-expect-error Point tuple cardinality survives the stable public method.
  projected.value.points[2];
  // @ts-expect-error Projected points are immutable.
  projected.value.points[0].x = 5;
}
const empty = measure();
if (empty.ok) {
  // @ts-expect-error Measuring without samples returns an empty tuple.
  empty.value.points[0];
}
gesture.cancel();
// @ts-expect-error Errors are published only by the owning bridge.
gesture.error.value = undefined;
// @ts-expect-error A reactive HTML target is required.
useMediaGesture({ element: document.createElement('div'), onStart: () => true, onMove() {} });
// @ts-expect-error Gesture admission must return a boolean.
useMediaGesture({ element, onStart: () => 'yes', onMove() {} });
