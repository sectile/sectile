export const DEFAULT_ITEM_COUNT = 100_000;
export const ITEM_COUNT = benchmarkItemCount();
export const DEFAULT_ROW_HEIGHT = 72;
export const MINIMUM_ROW_HEIGHT = 16;
export const MAXIMUM_SCROLL_HEIGHT = 16_000_000;
export const ROW_HEIGHT = benchmarkRowHeight(ITEM_COUNT);
export const CONTENT_VARIANT_COUNT = 256;
export const CONTENT_CORPUS_VERSION = 1;
export const VIEWPORT_HEIGHT = 480;
export const VIEWPORT_WIDTH = 720;
export const OVERSCAN_ROWS = 8;
export const OVERSCAN_PX = ROW_HEIGHT * OVERSCAN_ROWS;

export type RowProfile = 'uniform' | 'heterogeneous';

export interface BenchmarkItem {
  readonly id: string;
  readonly index: number;
  readonly contentVariant: number;
  readonly expanded: boolean;
}

export interface BenchmarkContent {
  readonly title: string;
  readonly summary: string;
  readonly metadata: string;
  readonly tags: readonly string[];
  readonly detail: string;
}

const subjects = Object.freeze([
  'Payment confirmation', 'Shipping address', 'Account access', 'Refund review',
  'Subscription change', 'Invoice correction', 'Delivery schedule', 'Product availability',
]);
const clauses = Object.freeze([
  'The customer added context after the original request was reviewed.',
  'The latest response includes order details and a preferred resolution window.',
  'A related transaction requires comparison with the account activity history.',
  'The request contains several steps owned by different support teams.',
  'The customer attached additional information that changes the next action.',
  'A follow-up question needs a clear summary of the previous decision.',
]);
const tagPool = Object.freeze(['billing', 'delivery', 'account', 'priority', 'follow-up', 'review']);

export const contentVariants: readonly BenchmarkContent[] = Object.freeze(Array.from(
  { length: CONTENT_VARIANT_COUNT },
  (_, variant) => {
    const sentenceCount = 1 + (variant % 5);
    const tagCount = variant % 4;
    return Object.freeze({
      title: `${subjects[variant % subjects.length]} · request ${String(variant + 1).padStart(3, '0')}`,
      summary: Array.from({ length: sentenceCount }, (_, offset) => clauses[(variant * 3 + offset) % clauses.length]).join(' '),
      metadata: `Queue ${1 + (variant % 9)} · updated ${2 + (variant % 57)} minutes ago`,
      tags: Object.freeze(Array.from({ length: tagCount }, (_, offset) => tagPool[(variant + offset * 2) % tagPool.length])),
      detail: `${clauses[(variant + 2) % clauses.length]} ${clauses[(variant + 4) % clauses.length]}`,
    });
  },
));

export const items: readonly BenchmarkItem[] = Object.freeze(Array.from({ length: ITEM_COUNT }, (_, index) => Object.freeze({
  id: `row-${index}`,
  index,
  contentVariant: stableVariant(index),
  expanded: false,
})));

export function contentFor(item: BenchmarkItem): BenchmarkContent {
  return contentVariants[item.contentVariant] ?? contentVariants[0]!;
}

export function stableVariant(index: number): number {
  let value = (index + 1) * 0x45d9f3b;
  value = ((value >>> 16) ^ value) * 0x45d9f3b;
  value = (value >>> 16) ^ value;
  return Math.abs(value) % CONTENT_VARIANT_COUNT;
}

export function benchmarkRowHeight(itemCount: number): number {
  const boundedCount = Math.max(1, itemCount);
  return Math.max(
    MINIMUM_ROW_HEIGHT,
    Math.min(DEFAULT_ROW_HEIGHT, Math.floor(MAXIMUM_SCROLL_HEIGHT / boundedCount)),
  );
}

function benchmarkItemCount(): number {
  if (typeof window === 'undefined') return DEFAULT_ITEM_COUNT;
  const value = Number(new URLSearchParams(window.location.search).get('rows'));
  return Number.isInteger(value) && value >= 2 && value <= 1_000_000 ? value : DEFAULT_ITEM_COUNT;
}
