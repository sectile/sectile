import { connectMediaGesture, readMediaViewport, type MediaGestureInput, type MediaGestureConnection, type MediaWheelInput } from '@sectile/dom/media-gesture';
const outcome = connectMediaGesture({ element: document.createElement('div'), onStart: () => true,
  onMove(input) {
    const fact: MediaGestureInput = input;
    if (fact.kind === 'pinch') {
      const x: number = fact.before[1].x; void x;
      // @ts-expect-error Exactly two native contacts are exposed.
      fact.after[2];
    }
    // @ts-expect-error Native facts are immutable.
    fact.before = { x: 1, y: 2 };
  },
  onWheel(input) { const wheel: MediaWheelInput = input; const delta: number = wheel.delta; void delta; return true; },
});
if (outcome.ok) { const connection: MediaGestureConnection = outcome.value; connection.cancel(); connection.disconnect(); }
// @ts-expect-error Admission requires an explicit caller decision.
connectMediaGesture({ element: document.createElement('div'), onMove() {} });
const measured = readMediaViewport(document.createElement('div'), [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
if (measured.ok) {
  const y: number = measured.value.points[1].y; void y;
  // @ts-expect-error Projection preserves the two-point tuple cardinality.
  measured.value.points[2];
  // @ts-expect-error Measurements are immutable.
  measured.value.viewport.width = 500;
}
const empty = readMediaViewport(document.createElement('div'));
if (empty.ok) {
  // @ts-expect-error The no-sample overload returns an empty tuple.
  empty.value.points[0];
}
