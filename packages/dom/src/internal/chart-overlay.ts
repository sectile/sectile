import type { StableID } from '@sectile/core';
import type { ChartState } from '@sectile/chart/interaction';
import type { ChartAxisLayout } from '@sectile/chart/layout';
import type { ChartProjection } from '@sectile/chart/projection';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAXIMUM_OVERLAY_TICKS = 512;
const MAXIMUM_LEGEND_ITEMS = 64;
const MAXIMUM_INTERACTION_MARKS = 512;
const MAXIMUM_AXIS_FRACTION_DIGITS = 12;
const FALLBACK_AXIS_SIGNIFICANT_DIGITS = 6;

export class ChartOverlay<ID extends StableID> {
  readonly #root: HTMLElement;
  readonly #svg: SVGSVGElement;
  readonly #position: string;
  #active = true;

  public constructor(root: HTMLElement) {
    this.#root = root;
    this.#position = root.style.position;
    let svg: SVGSVGElement | undefined;
    try {
      if (root.ownerDocument.defaultView?.getComputedStyle(root).position === 'static') root.style.position = 'relative';
      svg = root.ownerDocument.createElementNS(SVG_NAMESPACE, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.style.position = 'absolute';
      svg.style.inset = '0';
      svg.style.pointerEvents = 'none';
      svg.style.overflow = 'visible';
      root.append(svg);
      this.#svg = svg;
    } catch (error) {
      svg?.remove();
      root.style.position = this.#position;
      throw error;
    }
  }

  public render(projection: ChartProjection<ID>, state?: ChartState<ID>): void {
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
    if (state !== undefined) appendInteraction(fragment, projection, state, this.#root.ownerDocument);
    this.#svg.replaceChildren(fragment);
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#svg.remove();
    this.#root.style.position = this.#position;
  }
}

function appendInteraction<ID extends StableID>(
  fragment: DocumentFragment,
  projection: ChartProjection<ID>,
  state: ChartState<ID>,
  document: Document,
): void {
  const group = svgGroup(document, 'interaction');
  const selection = state.selection;
  if (selection.type === 'axis-interval') {
    const axis = projection.layout?.axes.find((candidate) => candidate.axis.id === selection.axisID);
    if (axis !== undefined && projection.layout !== undefined) appendInterval(group, axis, selection.start, selection.end, projection.layout.plot, document);
  } else if (selection.type === 'domain-region') {
    const x = projection.layout?.axes.find((axis) => axis.axis.id === selection.xAxisID);
    const y = projection.layout?.axes.find((axis) => axis.axis.id === selection.yAxisID);
    if (x !== undefined && y !== undefined) {
      const x1 = x.geometryScale.normalize(selection.xStart); const x2 = x.geometryScale.normalize(selection.xEnd);
      const y1 = y.geometryScale.normalize(selection.yStart); const y2 = y.geometryScale.normalize(selection.yEnd);
      if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) group.append(interactionRect(document, Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), 'selection'));
    }
  }
  const selected = selection.type === 'points'
    ? new Set(selection.ids.slice(0, MAXIMUM_INTERACTION_MARKS))
    : new Set<ID>();
  if (selected.size === 0 && state.activeDatum === null && state.cursor === null) {
    if (group.childNodes.length > 0) fragment.append(group);
    return;
  }
  let emitted = 0;
  for (const batch of projection.batches) {
    for (let index = 0; index < batch.identityIndices.length && emitted < MAXIMUM_INTERACTION_MARKS; index += 1) {
      const representative = batch.representatives?.[index];
      const id = representative?.kind === 'datum'
        ? representative.id as ID
        : projection.identities[batch.identityIndices[index] as number];
      if (id === undefined) continue;
      const kind = id === state.activeDatum ? 'active' : id === state.cursor ? 'cursor' : selected.has(id) ? 'selection' : null;
      if (kind === null) continue;
      const point = primitiveCenter(batch, index);
      if (point === null) continue;
      const marker = document.createElementNS(SVG_NAMESPACE, 'circle');
      marker.setAttribute('cx', String(point.x));
      marker.setAttribute('cy', String(point.y));
      marker.setAttribute('r', kind === 'selection' ? '5' : '7');
      marker.setAttribute('fill', 'none');
      marker.setAttribute('stroke', 'currentColor');
      marker.setAttribute('stroke-width', kind === 'active' ? '3' : '2');
      marker.setAttribute('data-chart-overlay', `interaction-${kind}`);
      group.append(marker);
      emitted += 1;
    }
    if (emitted >= MAXIMUM_INTERACTION_MARKS) break;
  }
  if (group.childNodes.length > 0) fragment.append(group);
}

function appendInterval(
  group: SVGGElement,
  axis: ChartAxisLayout,
  start: number,
  end: number,
  plot: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  document: Document,
): void {
  const first = axis.geometryScale.normalize(start);
  const second = axis.geometryScale.normalize(end);
  if (first === null || second === null) return;
  if (axis.axis.orientation === 'x') group.append(interactionRect(document, Math.min(first, second), plot.y, Math.abs(second - first), plot.height, 'selection'));
  else group.append(interactionRect(document, plot.x, Math.min(first, second), plot.width, Math.abs(second - first), 'selection'));
}

function interactionRect(document: Document, x: number, y: number, width: number, height: number, kind: string): SVGRectElement {
  const rect = document.createElementNS(SVG_NAMESPACE, 'rect');
  rect.setAttribute('x', String(x)); rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(width)); rect.setAttribute('height', String(height));
  rect.setAttribute('fill', 'currentColor'); rect.setAttribute('fill-opacity', '0.08');
  rect.setAttribute('stroke', 'currentColor'); rect.setAttribute('stroke-opacity', '0.45');
  rect.setAttribute('data-chart-overlay', `interaction-${kind}`);
  return rect;
}

function primitiveCenter(batch: ChartProjection['batches'][number], index: number): { readonly x: number; readonly y: number } | null {
  if (batch.type === 'point' || batch.type === 'polyline') return {
    x: batch.positions[index * 2] as number,
    y: batch.positions[index * 2 + 1] as number,
  };
  if (batch.type === 'rectangle') return {
    x: (batch.rectangles[index * 4] as number) + (batch.rectangles[index * 4 + 2] as number) / 2,
    y: (batch.rectangles[index * 4 + 1] as number) + (batch.rectangles[index * 4 + 3] as number) / 2,
  };
  if (batch.type === 'cell') return {
    x: (batch.cells[index * 5] as number) + (batch.cells[index * 5 + 2] as number) / 2,
    y: (batch.cells[index * 5 + 1] as number) + (batch.cells[index * 5 + 3] as number) / 2,
  };
  const offset = index * 6;
  const angle = ((batch.arcs[offset + 4] as number) + (batch.arcs[offset + 5] as number)) / 2;
  const radius = ((batch.arcs[offset + 2] as number) + (batch.arcs[offset + 3] as number)) / 2;
  return {
    x: (batch.arcs[offset] as number) + Math.cos(angle) * radius,
    y: (batch.arcs[offset + 1] as number) + Math.sin(angle) * radius,
  };
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
  const ticks = sampledTicks(axis.ticks, MAXIMUM_OVERLAY_TICKS);
  const fractionDigits = axisFractionDigits(axis, ticks);
  for (let tickIndex = 0; tickIndex < ticks.length; tickIndex += 1) {
    const tick = ticks[tickIndex];
    if (tick === undefined) continue;
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
    const value = svgText(document, formatAxisTickValue(axis, tick.value, fractionDigits), 'axis-value');
    value.setAttribute('x', String(horizontal ? position : plot.x - 8));
    value.setAttribute('y', String(horizontal ? plot.y + plot.height + 16 : position + 4));
    value.setAttribute('text-anchor', horizontal
      ? tickIndex === 0 ? 'start' : tickIndex === ticks.length - 1 ? 'end' : 'middle'
      : 'end');
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

function formatAxisTickValue(axis: ChartAxisLayout, value: number | string, fractionDigits: number | null): string {
  if (typeof value !== 'number') return String(value);
  if (axis.axis.scale === 'temporal') return new Date(value).toISOString().slice(0, 10);
  if (axis.axis.scale === 'categorical') return String(value);
  return fractionDigits === null
    ? String(Number(value.toPrecision(FALLBACK_AXIS_SIGNIFICANT_DIGITS)))
    : String(Number(value.toFixed(fractionDigits)));
}

function axisFractionDigits(
  axis: ChartAxisLayout,
  ticks: readonly { readonly value: number | string }[],
): number | null {
  if (axis.axis.scale === 'temporal' || axis.axis.scale === 'categorical') return null;
  let previous: number | undefined;
  let minimumStep = Number.POSITIVE_INFINITY;
  for (const tick of ticks) {
    if (typeof tick.value !== 'number') continue;
    if (previous !== undefined) {
      const step = Math.abs(tick.value - previous);
      if (step > 0 && step < minimumStep) minimumStep = step;
    }
    previous = tick.value;
  }
  if (!Number.isFinite(minimumStep)) return null;
  const fractionDigits = Math.max(0, 1 - Math.floor(Math.log10(minimumStep)));
  return fractionDigits <= MAXIMUM_AXIS_FRACTION_DIGITS ? fractionDigits : null;
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
