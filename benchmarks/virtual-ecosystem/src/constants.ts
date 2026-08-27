export const ITEM_COUNT = 100_000;
export const ROW_HEIGHT = 72;
export const VIEWPORT_HEIGHT = 480;
export const VIEWPORT_WIDTH = 720;
export const OVERSCAN_ROWS = 8;
export const OVERSCAN_PX = ROW_HEIGHT * OVERSCAN_ROWS;

export interface BenchmarkItem {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly height: number;
}

export const items: readonly BenchmarkItem[] = Object.freeze(Array.from({ length: ITEM_COUNT }, (_, index) => Object.freeze({
  id: `row-${index}`,
  index,
  label: `Customer request ${String(index).padStart(6, '0')}`,
  height: ROW_HEIGHT,
})));
