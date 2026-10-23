import { clampRect, type Rect, type Insets } from '@sectile/core/geometry';

const target: Rect = { x: -10, y: -20, width: 200, height: 160 };
const boundary: Rect = { x: 0, y: 0, width: 100, height: 80 };
const oldConsumer: (rect: Rect, bounds: Rect, padding?: Insets) => Rect = clampRect;
const nearest: Rect = clampRect(target, boundary, undefined, 'nearest');
const start: Rect = clampRect(target, boundary, undefined, 'start');
void [oldConsumer(target, boundary), nearest, start];
// @ts-expect-error Overflow alignment is a closed geometry contract.
clampRect(target, boundary, undefined, 'center');
