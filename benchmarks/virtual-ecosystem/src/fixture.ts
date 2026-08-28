import {
  CONTENT_CORPUS_VERSION,
  CONTENT_VARIANT_COUNT,
  ROW_HEIGHT,
  VIEWPORT_WIDTH,
  contentFor,
  contentVariants,
  type BenchmarkItem,
  type RowProfile,
} from './constants.js';

export interface HeightDistribution {
  readonly minimum: number;
  readonly median: number;
  readonly p95: number;
  readonly maximum: number;
  readonly distinct: number;
}

export interface ExpectedLayout {
  readonly prefix: Float64Array;
  readonly totalHeight: number;
  heightAt(index: number): number;
  offsetAt(index: number): number;
  indexAt(offset: number): number;
}

export interface HeightOracle {
  readonly rowProfile: RowProfile;
  readonly corpusVersion: number;
  readonly contentVariants: number;
  readonly distribution: HeightDistribution;
  heightOf(item: BenchmarkItem): number;
  layout(items: readonly BenchmarkItem[]): ExpectedLayout;
}

let heterogeneousOracle: Promise<HeightOracle> | undefined;

export function createHeightOracle(rowProfile: RowProfile): Promise<HeightOracle> {
  if (rowProfile === 'uniform') return Promise.resolve(createUniformOracle());
  heterogeneousOracle ??= calibrateHeterogeneousOracle();
  return heterogeneousOracle;
}

export function appendRowContent(root: HTMLElement, item: BenchmarkItem): void {
  const content = contentFor(item);
  const header = document.createElement('div');
  header.className = 'bench-row__header';
  const title = document.createElement('strong');
  title.className = 'bench-row__title';
  title.textContent = content.title;
  const metadata = document.createElement('span');
  metadata.className = 'bench-row__metadata';
  metadata.textContent = content.metadata;
  header.append(title, metadata);

  const summary = document.createElement('p');
  summary.className = 'bench-row__summary';
  summary.textContent = content.summary;
  root.append(header, summary);

  if (content.tags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'bench-row__tags';
    for (const value of content.tags) {
      const tag = document.createElement('span');
      tag.className = 'bench-row__tag';
      tag.textContent = value;
      tags.append(tag);
    }
    root.append(tags);
  }

  if (item.expanded) {
    const detail = document.createElement('p');
    detail.className = 'bench-row__detail';
    detail.textContent = content.detail;
    root.append(detail);
  }
}

function createUniformOracle(): HeightOracle {
  return Object.freeze({
    rowProfile: 'uniform',
    corpusVersion: CONTENT_CORPUS_VERSION,
    contentVariants: 1,
    distribution: Object.freeze({ minimum: ROW_HEIGHT, median: ROW_HEIGHT, p95: ROW_HEIGHT, maximum: ROW_HEIGHT, distinct: 1 }),
    heightOf: () => ROW_HEIGHT,
    layout: (items: readonly BenchmarkItem[]) => createExpectedLayout(items, () => ROW_HEIGHT),
  });
}

async function calibrateHeterogeneousOracle(): Promise<HeightOracle> {
  await document.fonts.ready;
  const first = await measureContentVariants();
  const second = await measureContentVariants();
  for (const [key, height] of first) {
    const repeated = second.get(key);
    if (repeated === undefined || Math.abs(repeated - height) > 0.5) {
      throw new Error(`Heterogeneous row calibration changed for ${key}: ${height}px to ${String(repeated)}px.`);
    }
  }
  const collapsed = Array.from({ length: CONTENT_VARIANT_COUNT }, (_, variant) => first.get(calibrationKey(variant, false))!);
  const sorted = [...collapsed].sort((left, right) => left - right);
  const distinct = new Set(sorted.map((height) => Math.round(height * 10) / 10)).size;
  if (distinct < 6 || sorted.at(-1)! < sorted[0]! * 2) {
    throw new Error(`Heterogeneous fixture produced only ${distinct} heights across ${sorted[0]}-${sorted.at(-1)}px.`);
  }
  const heightOf = (item: BenchmarkItem): number => {
    const height = first.get(calibrationKey(item.contentVariant, item.expanded));
    if (height === undefined) throw new Error(`Missing calibrated height for variant ${item.contentVariant}.`);
    return height;
  };
  return Object.freeze({
    rowProfile: 'heterogeneous',
    corpusVersion: CONTENT_CORPUS_VERSION,
    contentVariants: contentVariants.length,
    distribution: Object.freeze({
      minimum: sorted[0]!,
      median: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      maximum: sorted.at(-1)!,
      distinct,
    }),
    heightOf,
    layout: (items: readonly BenchmarkItem[]) => createExpectedLayout(items, heightOf),
  });
}

async function measureContentVariants(): Promise<ReadonlyMap<string, number>> {
  const container = document.createElement('div');
  container.className = 'bench-calibration';
  container.style.width = `${VIEWPORT_WIDTH}px`;
  const rows: { readonly key: string; readonly element: HTMLElement }[] = [];
  for (let variant = 0; variant < CONTENT_VARIANT_COUNT; variant += 1) {
    for (const expanded of [false, true]) {
      const item = Object.freeze({ id: `calibration-${variant}-${expanded ? 'expanded' : 'collapsed'}`, index: variant, contentVariant: variant, expanded });
      const element = document.createElement('div');
      element.className = 'bench-row bench-row--heterogeneous';
      appendRowContent(element, item);
      rows.push({ key: calibrationKey(variant, expanded), element });
      container.append(element);
    }
  }
  document.body.append(container);
  await nextFrame();
  const measurements = new Map(rows.map(({ key, element }) => [key, element.getBoundingClientRect().height]));
  container.remove();
  return measurements;
}

function createExpectedLayout(
  items: readonly BenchmarkItem[],
  heightOf: (item: BenchmarkItem) => number,
): ExpectedLayout {
  const prefix = new Float64Array(items.length + 1);
  for (let index = 0; index < items.length; index += 1) prefix[index + 1] = prefix[index]! + heightOf(items[index]!);
  return Object.freeze({
    prefix,
    totalHeight: prefix.at(-1) ?? 0,
    heightAt: (index: number) => prefix[index + 1]! - prefix[index]!,
    offsetAt: (index: number) => prefix[Math.min(items.length, Math.max(0, index))]!,
    indexAt(offset: number) {
      let low = 0;
      let high = items.length;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (prefix[middle + 1]! <= offset) low = middle + 1;
        else high = middle;
      }
      return Math.min(items.length - 1, Math.max(0, low));
    },
  });
}

function calibrationKey(variant: number, expanded: boolean): string {
  return `${variant}:${expanded ? 1 : 0}`;
}

function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
