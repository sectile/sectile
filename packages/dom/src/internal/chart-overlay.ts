import type { StableID } from '@sectile/core';
import type { ChartAxisLayout } from '@sectile/chart/layout';
import type { ChartProjection } from '@sectile/chart/projection';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAXIMUM_OVERLAY_TICKS = 512;
const MAXIMUM_LEGEND_ITEMS = 64;

export class ChartOverlay<ID extends StableID> {
  readonly #root: HTMLElement;
  readonly #svg: SVGSVGElement;
  readonly #position: string;
  #active = true;

  public constructor(root: HTMLElement) {
    this.#root = root;
    this.#position = root.style.position;
    if (root.ownerDocument.defaultView?.getComputedStyle(root).position === 'static') root.style.position = 'relative';
    this.#svg = root.ownerDocument.createElementNS(SVG_NAMESPACE, 'svg');
    this.#svg.setAttribute('aria-hidden', 'true');
    this.#svg.setAttribute('focusable', 'false');
    this.#svg.style.position = 'absolute';
    this.#svg.style.inset = '0';
    this.#svg.style.pointerEvents = 'none';
    this.#svg.style.overflow = 'visible';
    root.append(this.#svg);
  }

  public render(projection: ChartProjection<ID>): void {
    if (!this.#active) return;
    const { width, height } = projection.viewport;
    this.#svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.#svg.setAttribute('width', String(width));
    this.#svg.setAttribute('height', String(height));
    const fragment = this.#root.ownerDocument.createDocumentFragment();
    const layout = projection.layout;
    if (layout !== undefined) {
      const grid = svgGroup(this.#root.ownerDocument, 'grid');
      const axes = svgGroup(this.#root.ownerDocument, 'axes');
      for (const axis of layout.axes) appendAxis(grid, axes, axis, layout.plot);
      fragment.append(grid, axes);
    }
    appendLegend(fragment, projection, this.#root.ownerDocument, width);
    this.#svg.replaceChildren(fragment);
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#svg.remove();
    this.#root.style.position = this.#position;
  }
}

function appendAxis(
  grid: SVGGElement,
  axes: SVGGElement,
  axis: ChartAxisLayout,
  plot: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): void {
  const document = axes.ownerDocument;
  const horizontal = axis.axis.orientation === 'x';
  const baseline = svgLine(document,
    horizontal ? plot.x : plot.x,
    horizontal ? plot.y + plot.height : plot.y,
    horizontal ? plot.x + plot.width : plot.x,
    horizontal ? plot.y + plot.height : plot.y + plot.height,
    'axis-baseline',
  );
  axes.append(baseline);
  for (const tick of sampledTicks(axis.ticks, MAXIMUM_OVERLAY_TICKS)) {
    const position = tick.position;
    grid.append(svgLine(document,
      horizontal ? position : plot.x,
      horizontal ? plot.y : position,
      horizontal ? position : plot.x + plot.width,
      horizontal ? plot.y + plot.height : position,
      'grid-line',
    ));
    axes.append(svgLine(document,
      horizontal ? position : plot.x - 4,
      horizontal ? plot.y + plot.height : position,
      horizontal ? position : plot.x,
      horizontal ? plot.y + plot.height + 4 : position,
      'axis-tick',
    ));
    const value = svgText(document, String(tick.value), 'axis-value');
    value.setAttribute('x', String(horizontal ? position : plot.x - 8));
    value.setAttribute('y', String(horizontal ? plot.y + plot.height + 16 : position + 4));
    value.setAttribute('text-anchor', horizontal ? 'middle' : 'end');
    axes.append(value);
  }
  const labelText = axisLabel(axis);
  if (labelText === '') return;
  const label = svgText(document, labelText, 'axis-label');
  if (horizontal) {
    label.setAttribute('x', String(plot.x + plot.width / 2));
    label.setAttribute('y', String(plot.y + plot.height + 34));
  } else {
    const x = Math.max(12, plot.x - 36);
    const y = plot.y + plot.height / 2;
    label.setAttribute('x', String(x));
    label.setAttribute('y', String(y));
    label.setAttribute('transform', `rotate(-90 ${x} ${y})`);
  }
  label.setAttribute('text-anchor', 'middle');
  axes.append(label);
}

function appendLegend<ID extends StableID>(
  fragment: DocumentFragment,
  projection: ChartProjection<ID>,
  document: Document,
  width: number,
): void {
  const revisions = projection.layerRevisions;
  if (revisions === undefined || revisions.length === 0) return;
  const legend = svgGroup(document, 'legend');
  const count = Math.min(revisions.length, MAXIMUM_LEGEND_ITEMS);
  for (let index = 0; index < count; index += 1) {
    const revision = revisions[index];
    if (revision === undefined) continue;
    const batch = projection.batches.find((candidate) => candidate.layerIndex === index);
    const color = batch?.colors;
    const swatch = document.createElementNS(SVG_NAMESPACE, 'rect');
    swatch.setAttribute('x', String(Math.max(0, width - 136)));
    swatch.setAttribute('y', String(8 + index * 18));
    swatch.setAttribute('width', '10');
    swatch.setAttribute('height', '10');
    swatch.setAttribute('fill', color === undefined ? 'currentColor' : rgbaBytes(color));
    const label = svgText(document, String(revision.layerID), 'legend-label');
    label.setAttribute('x', String(Math.max(14, width - 120)));
    label.setAttribute('y', String(17 + index * 18));
    legend.append(swatch, label);
  }
  fragment.append(legend);
}

function sampledTicks(ticks: readonly unknown[], maximum: number): readonly { readonly value: number | string; readonly position: number }[] {
  if (ticks.length <= maximum) return ticks as readonly { readonly value: number | string; readonly position: number }[];
  const step = Math.ceil(ticks.length / maximum);
  const output: { readonly value: number | string; readonly position: number }[] = [];
  for (let index = 0; index < ticks.length && output.length < maximum; index += step) {
    output.push(ticks[index] as { readonly value: number | string; readonly position: number });
  }
  return output;
}

function axisLabel(axis: ChartAxisLayout): string {
  const label = axis.axis.label ?? '';
  const unit = axis.axis.unit === undefined ? '' : String(axis.axis.unit);
  return label === '' ? unit : unit === '' ? label : `${label} (${unit})`;
}

function svgGroup(document: Document, name: string): SVGGElement {
  const group = document.createElementNS(SVG_NAMESPACE, 'g');
  group.setAttribute('data-chart-overlay', name);
  return group;
}

function svgLine(document: Document, x1: number, y1: number, x2: number, y2: number, name: string): SVGLineElement {
  const line = document.createElementNS(SVG_NAMESPACE, 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('data-chart-overlay', name);
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-opacity', name === 'grid-line' ? '0.12' : '0.55');
  return line;
}

function svgText(document: Document, content: string, name: string): SVGTextElement {
  const text = document.createElementNS(SVG_NAMESPACE, 'text');
  text.textContent = content;
  text.setAttribute('data-chart-overlay', name);
  text.setAttribute('fill', 'currentColor');
  text.setAttribute('font-size', '11');
  return text;
}

function rgbaBytes(colors: Uint8Array): string {
  return `rgba(${colors[0]}, ${colors[1]}, ${colors[2]}, ${(colors[3] as number) / 255})`;
}
