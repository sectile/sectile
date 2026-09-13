import type {
  TerminalAppearance,
  TerminalStyleReference,
} from './appearance.js';
import { createTerminalAppearance } from './appearance.js';
import {
  graphemeSegments,
  terminalGraphemeWidth,
  terminalStringWidth,
} from './internal/grapheme.js';

export type TerminalDimension = number | 'auto' | 'fill';
export type TerminalAlignment = 'start' | 'center' | 'end' | 'stretch';
export type TerminalJustification = 'start' | 'center' | 'end' | 'space-between';
export type TerminalCursorShape = 'block' | 'bar' | 'underline';
export type TerminalBorder = 'none' | 'single' | 'double' | 'rounded';

export interface TerminalSpacing {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export type TerminalSpacingInput = number | Partial<TerminalSpacing>;

export interface TerminalCursorSpec {
  readonly codeUnitOffset: number;
  readonly visible?: boolean;
  readonly shape?: TerminalCursorShape;
  readonly blink?: boolean;
}

interface TerminalNodeBase {
  readonly width?: TerminalDimension;
  readonly height?: TerminalDimension;
  readonly style?: TerminalStyleReference;
}

export interface TerminalTextNode extends TerminalNodeBase {
  readonly type: 'text';
  readonly value: string;
  readonly wrap?: boolean;
  readonly cursor?: TerminalCursorSpec;
}

export interface TerminalRowNode extends TerminalNodeBase {
  readonly type: 'row';
  readonly children: readonly TerminalScreenNode[];
  readonly gap?: number;
  readonly padding?: TerminalSpacingInput;
  readonly align?: TerminalAlignment;
  readonly justify?: TerminalJustification;
}

export interface TerminalColumnNode extends TerminalNodeBase {
  readonly type: 'column';
  readonly children: readonly TerminalScreenNode[];
  readonly gap?: number;
  readonly padding?: TerminalSpacingInput;
  readonly align?: TerminalAlignment;
  readonly justify?: TerminalJustification;
}

export interface TerminalBoxNode extends TerminalNodeBase {
  readonly type: 'box';
  readonly child?: TerminalScreenNode;
  readonly border?: TerminalBorder;
  readonly borderStyle?: TerminalStyleReference;
  readonly title?: string;
  readonly padding?: TerminalSpacingInput;
}

export interface TerminalSpacerNode extends TerminalNodeBase {
  readonly type: 'spacer';
}

export type TerminalScreenNode =
  | TerminalTextNode
  | TerminalRowNode
  | TerminalColumnNode
  | TerminalBoxNode
  | TerminalSpacerNode;

export interface TerminalTextOptions extends TerminalNodeBase {
  readonly wrap?: boolean;
  readonly cursor?: TerminalCursorSpec;
}

export interface TerminalContainerOptions extends TerminalNodeBase {
  readonly gap?: number;
  readonly padding?: TerminalSpacingInput;
  readonly align?: TerminalAlignment;
  readonly justify?: TerminalJustification;
}

export interface TerminalBoxOptions extends TerminalNodeBase {
  readonly border?: TerminalBorder;
  readonly borderStyle?: TerminalStyleReference;
  readonly title?: string;
  readonly padding?: TerminalSpacingInput;
}

export interface TerminalSpacerOptions extends TerminalNodeBase {}

export interface TerminalFrameCell {
  readonly text: string;
  readonly style?: TerminalStyleReference;
  readonly continuation?: boolean;
}

export interface TerminalFrameCursor {
  readonly row: number;
  readonly column: number;
  readonly visible: boolean;
  readonly shape: TerminalCursorShape;
  readonly blink: boolean;
}

export interface TerminalFrame {
  readonly columns: number;
  readonly rows: number;
  readonly cells: readonly (readonly TerminalFrameCell[])[];
  readonly cursor: TerminalFrameCursor | null;
}

export interface RenderTerminalScreenOptions {
  /** Non-negative safe integer, at most 4,096. */
  readonly columns: number;
  /** Non-negative safe integer, at most 4,096. */
  readonly rows: number;
  readonly appearance?: TerminalAppearance;
}

const MAX_SCREEN_DIMENSION = 4_096;
const MAX_SCREEN_CELLS = 1_048_576;

interface MutableFrameCell {
  text: string;
  style?: TerminalStyleReference;
  continuation?: boolean;
}

// Measurements belong to one render, keyed by node identity and exact constraints.
// Separate numeric keys preserve width/height distinctions without encoding limits.
type Measurements = WeakMap<TerminalScreenNode, Map<number, Map<number, Size>>>;

interface MutableFrame {
  readonly measurements: Measurements;
  readonly columns: number;
  readonly rows: number;
  readonly cells: MutableFrameCell[][];
  cursor: TerminalFrameCursor | null;
}

interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

interface MeasurementFrame {
  readonly node: TerminalRowNode | TerminalColumnNode | TerminalBoxNode;
  readonly heights: Map<number, Size>;
  readonly children: readonly TerminalScreenNode[];
  readonly horizontal: boolean;
  readonly extraWidth: number;
  readonly extraHeight: number;
  nextIndex: number;
  width: number;
  height: number;
}

interface NodeRenderTask {
  readonly kind: 'node';
  readonly node: TerminalScreenNode;
  readonly rectangle: Rectangle;
  readonly parentClip: Rectangle;
}

interface ChildrenRenderTask {
  readonly kind: 'children';
  readonly node: TerminalRowNode | TerminalColumnNode;
  readonly children: readonly TerminalScreenNode[];
  readonly content: Rectangle;
  readonly clip: Rectangle;
  readonly horizontal: boolean;
  readonly availableCross: number;
  readonly mainSizes: readonly number[];
  readonly distributedGap: number;
  index: number;
  cursor: number;
}

type RenderTask = NodeRenderTask | ChildrenRenderTask;

interface TerminalTextWalk {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly codeUnitOffset: number;
}

interface TerminalTextVisitor {
  readonly position?: (x: number, y: number, codeUnitOffset: number) => boolean | void;
  readonly grapheme?: (x: number, y: number, grapheme: string, width: number) => void;
}

interface BorderCharacters {
  readonly horizontal: string;
  readonly vertical: string;
  readonly topLeft: string;
  readonly topRight: string;
  readonly bottomLeft: string;
  readonly bottomRight: string;
}

export function terminalText(value: string, options: TerminalTextOptions = {}): TerminalTextNode {
  return Object.freeze({ type: 'text', value, ...options });
}

export function terminalRow(
  children: readonly TerminalScreenNode[],
  options: TerminalContainerOptions = {},
): TerminalRowNode {
  return Object.freeze({ type: 'row', children: Object.freeze([...children]), ...options });
}

export function terminalColumn(
  children: readonly TerminalScreenNode[],
  options: TerminalContainerOptions = {},
): TerminalColumnNode {
  return Object.freeze({ type: 'column', children: Object.freeze([...children]), ...options });
}

export function terminalBox(
  child: TerminalScreenNode | undefined,
  options: TerminalBoxOptions = {},
): TerminalBoxNode {
  return Object.freeze({ type: 'box', ...(child === undefined ? {} : { child }), ...options });
}

export function terminalSpacer(options: TerminalSpacerOptions = {}): TerminalSpacerNode {
  return Object.freeze({ type: 'spacer', ...options });
}

/**
 * Renders a dense viewport of at most 1,048,576 cells (rows multiplied by columns).
 * @throws RangeError when dimensions are invalid or exceed a viewport limit,
 * before allocating the frame or reading the node and appearance.
 */
export function renderTerminalScreen(
  node: TerminalScreenNode,
  options: RenderTerminalScreenOptions,
): TerminalFrame {
  const columns = options.columns;
  const rows = options.rows;
  assertDimension(columns, 'columns');
  assertDimension(rows, 'rows');
  // Both axes are bounded first, so the product is an exact safe integer.
  if (rows * columns > MAX_SCREEN_CELLS) {
    throw new RangeError(`Terminal screen cell count must not exceed ${MAX_SCREEN_CELLS}.`);
  }
  const appearance = options.appearance ?? createTerminalAppearance();
  const frame: MutableFrame = {
    measurements: new WeakMap(),
    columns,
    rows,
    cells: Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => ({ text: ' ' }))),
    cursor: null,
  };
  const viewport = { x: 0, y: 0, width: columns, height: rows };
  renderNode(frame, node, viewport, viewport, appearance);
  return Object.freeze({
    columns: frame.columns,
    rows: frame.rows,
    cells: Object.freeze(frame.cells.map((row) =>
      Object.freeze(row.map((cell) => Object.freeze({ ...cell }))))),
    cursor: frame.cursor,
  });
}

export function serializeTerminalFrame(
  frame: TerminalFrame,
  appearance: TerminalAppearance = createTerminalAppearance(),
): readonly string[] {
  return Object.freeze(frame.cells.map((row) => {
    let rendered = '';
    let activeStyle: TerminalStyleReference | undefined;
    for (const cell of row) {
      if (cell.continuation === true) continue;
      if (!sameStyle(activeStyle, cell.style)) {
        if (activeStyle !== undefined) rendered += appearance.reset;
        activeStyle = cell.style;
        if (activeStyle !== undefined) rendered += appearance.open(activeStyle);
      }
      rendered += cell.text;
    }
    if (activeStyle !== undefined) rendered += appearance.reset;
    return rendered;
  }));
}

function renderNode(
  frame: MutableFrame,
  node: TerminalScreenNode,
  rectangle: Rectangle,
  parentClip: Rectangle,
  appearance: TerminalAppearance,
): void {
  const pending: RenderTask[] = [{ kind: 'node', node, rectangle, parentClip }];
  while (pending.length > 0) {
    const task = pending.pop()!;
    if (task.kind === 'children') {
      renderChild(frame, task, pending);
      continue;
    }
    const { node: current, rectangle: bounds } = task;
    const clip = intersectRectangles(task.parentClip, bounds);
    if (bounds.width <= 0 || bounds.height <= 0 || clip.width <= 0 || clip.height <= 0) continue;
    if (current.type === 'text') renderText(frame, current, bounds, clip);
    else if (current.type === 'row' || current.type === 'column') {
      renderContainer(frame, current, bounds, clip, pending);
    } else if (current.type === 'box') renderBox(frame, current, bounds, clip, appearance, pending);
  }
}

function renderText(
  frame: MutableFrame,
  node: TerminalTextNode,
  rectangle: Rectangle,
  clip: Rectangle,
): void {
  const wrap = node.wrap !== false;
  const cursorOffset = node.cursor?.codeUnitOffset;
  if (cursorOffset !== undefined && (!Number.isSafeInteger(cursorOffset) || cursorOffset < 0)) {
    throw new RangeError('Terminal cursor offset must be a non-negative safe integer.');
  }
  const projectionBottom = clip.y + clip.height - rectangle.y;
  const projectionRight = clip.x + clip.width - rectangle.x;

  const layout = walkTerminalText(node.value, rectangle.width, wrap, {
    position: (x, y, codeUnitOffset) => {
      if (cursorOffset !== undefined && frame.cursor === null && cursorOffset <= codeUnitOffset) {
        frame.cursor = createFrameCursor(
          node.cursor,
          rectangle.x + x,
          rectangle.y + y,
          frame,
          rectangle,
          clip,
          wrap,
        );
      }
      const drawingComplete = y >= projectionBottom
        || (y === projectionBottom - 1 && x >= projectionRight);
      if (drawingComplete && (cursorOffset === undefined || frame.cursor !== null)) return false;
      return undefined;
    },
    grapheme: (x, y, grapheme, width) => {
      if (y >= rectangle.height) return;
      drawGrapheme(frame, rectangle.x + x, rectangle.y + y, grapheme, width, node.style, clip);
    },
  });
  if (cursorOffset !== undefined && frame.cursor === null && cursorOffset >= layout.codeUnitOffset) {
    frame.cursor = createFrameCursor(
      node.cursor,
      rectangle.x + layout.x,
      rectangle.y + layout.y,
      frame,
      rectangle,
      clip,
      wrap,
    );
  }
}

function renderContainer(
  frame: MutableFrame,
  node: TerminalRowNode | TerminalColumnNode,
  rectangle: Rectangle,
  clip: Rectangle,
  pending: RenderTask[],
): void {
  const padding = normalizeSpacing(node.padding);
  const content = insetRectangle(rectangle, padding);
  const horizontal = node.type === 'row';
  const availableMain = horizontal ? content.width : content.height;
  const availableCross = horizontal ? content.height : content.width;
  const children = node.children;
  const gap = clampNonNegative(node.gap ?? 0);
  const totalGap = Math.max(0, children.length - 1) * gap;
  const mainSizes = distributeMainSizes(
    children,
    Math.max(0, availableMain - totalGap),
    availableCross,
    horizontal,
    frame.measurements,
  );
  const occupied = mainSizes.reduce((sum, size) => sum + size, 0) + totalGap;
  const justify = node.justify ?? 'start';
  const offset = justifyOffset(justify, availableMain, occupied, children.length);
  const distributedGap = justify === 'space-between' && children.length > 1
    ? gap + Math.max(0, Math.floor((availableMain - occupied) / (children.length - 1)))
    : gap;
  if (children.length > 0) pending.push({
    kind: 'children', node, children, content, clip, horizontal, availableCross,
    mainSizes, distributedGap, index: 0, cursor: (horizontal ? content.x : content.y) + offset,
  });
}

function renderChild(frame: MutableFrame, task: ChildrenRenderTask, pending: RenderTask[]): void {
  const { node, content, clip, horizontal, availableCross } = task;
  const index = task.index++;
  const child = task.children[index]!;
  const main = task.mainSizes[index] ?? 0;
  const intrinsic = measureNode(
    child,
    horizontal ? main : content.width,
    content.height,
    frame.measurements,
  );
  const desiredCross = resolveCrossSize(
    horizontal ? child.height : child.width,
    horizontal ? intrinsic.height : intrinsic.width,
    availableCross,
    node.align ?? 'stretch',
  );
  const crossOffset = alignmentOffset(node.align ?? 'stretch', availableCross, desiredCross);
  const rectangle: Rectangle = horizontal
    ? { x: task.cursor, y: content.y + crossOffset, width: main, height: desiredCross }
    : { x: content.x + crossOffset, y: task.cursor, width: desiredCross, height: main };
  task.cursor += main + task.distributedGap;
  // Resume siblings only after this child's subtree, preserving paint/cursor order.
  if (task.index < task.children.length) pending.push(task);
  pending.push({ kind: 'node', node: child, rectangle, parentClip: clip });
}

function renderBox(
  frame: MutableFrame,
  node: TerminalBoxNode,
  rectangle: Rectangle,
  clip: Rectangle,
  appearance: TerminalAppearance,
  pending: RenderTask[],
): void {
  const border = node.border ?? 'single';
  const hasBorder = border !== 'none';
  const borderSize = hasBorder ? 1 : 0;
  if (hasBorder) {
    const characters = borderCharacters(border, appearance.capabilities.unicode);
    drawBorder(frame, rectangle, characters, node.borderStyle ?? node.style, clip);
    if (node.title !== undefined && rectangle.width > 4) {
      const titleStyle = node.borderStyle ?? node.style;
      renderText(frame, terminalText(` ${node.title} `, {
        wrap: false,
        ...(titleStyle === undefined ? {} : { style: titleStyle }),
      }), {
        x: rectangle.x + 2,
        y: rectangle.y,
        width: rectangle.width - 4,
        height: 1,
      }, clip);
    }
  }
  if (node.child === undefined) return;
  const padding = normalizeSpacing(node.padding);
  pending.push({
    kind: 'node', node: node.child, parentClip: clip,
    rectangle: insetRectangle(rectangle, {
      top: padding.top + borderSize,
      right: padding.right + borderSize,
      bottom: padding.bottom + borderSize,
      left: padding.left + borderSize,
    }),
  });
}

function distributeMainSizes(
  children: readonly TerminalScreenNode[],
  available: number,
  availableCross: number,
  horizontal: boolean,
  measurements: Measurements,
): readonly number[] {
  const sizes = children.map((child) => {
    const dimension = horizontal ? child.width : child.height;
    if (typeof dimension === 'number') return clampNonNegative(dimension);
    if (dimension === 'fill') return -1;
    const measured = measureNode(
      child,
      horizontal ? available : availableCross,
      horizontal ? availableCross : available,
      measurements,
    );
    return horizontal ? measured.width : measured.height;
  });
  const fillCount = sizes.filter((size) => size === -1).length;
  const fixed = sizes.reduce((sum, size) => sum + Math.max(0, size), 0);
  const remainder = Math.max(0, available - fixed);
  let distributed = 0;
  return Object.freeze(sizes.map((size) => {
    if (size !== -1) return size;
    const next = fillCount === 0 ? 0 : Math.floor((remainder + distributed) / fillCount);
    distributed = Math.max(0, distributed + remainder - next * fillCount);
    return next;
  }));
}

function measureNode(
  node: TerminalScreenNode,
  maximumWidth: number,
  maximumHeight: number,
  measurements: Measurements,
): Size {
  let current = node;
  let heights = measurementHeights(current, maximumWidth, measurements);
  let measured = heights.get(maximumHeight);
  if (measured !== undefined) return measured;
  const pending: MeasurementFrame[] = [];

  while (true) {
    if (measured === undefined) {
      if (current.type === 'text') {
        const lines = current.value.split('\n');
        let intrinsicWidth = 0;
        for (const line of lines) intrinsicWidth = Math.max(intrinsicWidth, terminalStringWidth(line));
        const width = resolveDimension(current.width, intrinsicWidth, maximumWidth);
        const intrinsicHeight = current.wrap === false || width === 0
          ? lines.length
          : walkTerminalText(current.value, width, true).height;
        measured = { width, height: resolveDimension(current.height, intrinsicHeight, maximumHeight) };
      } else if (current.type === 'spacer') {
        measured = resolveSize(current, { width: 0, height: 0 }, maximumWidth, maximumHeight);
      } else {
        const padding = normalizeSpacing(current.padding);
        const horizontal = current.type === 'row';
        const children = current.type === 'box'
          ? (current.child === undefined ? [] : [current.child])
          : current.children;
        const border = current.type === 'box' && (current.border ?? 'single') !== 'none' ? 2 : 0;
        const gap = current.type === 'box' ? 0 : Math.max(0, children.length - 1) * clampNonNegative(current.gap ?? 0);
        const extraWidth = padding.left + padding.right + border + (horizontal ? gap : 0);
        const extraHeight = padding.top + padding.bottom + border + (horizontal ? 0 : gap);
        if (children.length > 0) {
          pending.push({
            node: current, heights, children, horizontal, extraWidth, extraHeight,
            nextIndex: 1, width: 0, height: 0,
          });
          current = children[0]!;
          heights = measurementHeights(current, maximumWidth, measurements);
          measured = heights.get(maximumHeight);
          continue;
        }
        measured = resolveSize(current, { width: extraWidth, height: extraHeight }, maximumWidth, maximumHeight);
      }
      heights.set(maximumHeight, measured);
    }

    const parent = pending[pending.length - 1];
    if (parent === undefined) return measured;
    parent.width = parent.horizontal ? parent.width + measured.width : Math.max(parent.width, measured.width);
    parent.height = parent.horizontal ? Math.max(parent.height, measured.height) : parent.height + measured.height;
    if (parent.nextIndex < parent.children.length) {
      current = parent.children[parent.nextIndex++]!;
      heights = measurementHeights(current, maximumWidth, measurements);
      measured = heights.get(maximumHeight);
    } else {
      // Complete one post-order frame without calling back through its ancestors.
      measured = resolveSize(parent.node, {
        width: parent.width + parent.extraWidth,
        height: parent.height + parent.extraHeight,
      }, maximumWidth, maximumHeight);
      parent.heights.set(maximumHeight, measured);
      pending.pop();
    }
  }
}

function measurementHeights(
  node: TerminalScreenNode,
  maximumWidth: number,
  measurements: Measurements,
): Map<number, Size> {
  let widths = measurements.get(node);
  if (widths === undefined) {
    widths = new Map();
    measurements.set(node, widths);
  }
  let heights = widths.get(maximumWidth);
  if (heights === undefined) {
    heights = new Map();
    widths.set(maximumWidth, heights);
  }
  return heights;
}

function walkTerminalText(
  value: string,
  lineWidth: number,
  wrap: boolean,
  visitor: TerminalTextVisitor = {},
): TerminalTextWalk {
  let x = 0;
  let y = 0;
  let codeUnitOffset = 0;
  for (const { segment } of graphemeSegments(value)) {
    if (visitor.position?.(x, y, codeUnitOffset) === false) break;
    codeUnitOffset += segment.length;
    if (segment === '\n') {
      x = 0;
      y += 1;
      continue;
    }
    const width = terminalGraphemeWidth(segment);
    if (width === 0) continue;
    if (width > lineWidth) {
      if (!wrap) break;
      if (x > 0) {
        x = 0;
        y += 1;
      }
      continue;
    }
    if (x + width > lineWidth) {
      if (!wrap) break;
      x = 0;
      y += 1;
    }
    visitor.grapheme?.(x, y, segment, width);
    x += width;
  }
  return Object.freeze({ x, y, height: y + 1, codeUnitOffset });
}

function resolveSize(
  node: TerminalScreenNode,
  intrinsic: Size,
  maximumWidth: number,
  maximumHeight: number,
): Size {
  return {
    width: resolveDimension(node.width, intrinsic.width, maximumWidth),
    height: resolveDimension(node.height, intrinsic.height, maximumHeight),
  };
}

function resolveDimension(
  dimension: TerminalDimension | undefined,
  intrinsic: number,
  available: number,
): number {
  if (typeof dimension === 'number') return Math.min(available, clampNonNegative(dimension));
  if (dimension === 'fill') return available;
  return Math.min(available, intrinsic);
}

function resolveCrossSize(
  dimension: TerminalDimension | undefined,
  intrinsic: number,
  available: number,
  alignment: TerminalAlignment,
): number {
  if (dimension === 'fill' || (dimension === undefined && alignment === 'stretch')) return available;
  return resolveDimension(dimension, intrinsic, available);
}

function createFrameCursor(
  cursor: TerminalCursorSpec | undefined,
  x: number,
  y: number,
  frame: MutableFrame,
  rectangle: Rectangle,
  clip: Rectangle,
  wrap: boolean,
): TerminalFrameCursor {
  const projectedX = wrap && x >= rectangle.x + rectangle.width ? rectangle.x : x;
  const projectedY = wrap && x >= rectangle.x + rectangle.width ? y + 1 : y;
  const inside = projectedX >= rectangle.x
    && projectedX < rectangle.x + rectangle.width
    && projectedY >= rectangle.y
    && projectedY < rectangle.y + rectangle.height
    && projectedX >= clip.x
    && projectedX < clip.x + clip.width
    && projectedY >= clip.y
    && projectedY < clip.y + clip.height
    && projectedX >= 0
    && projectedX < frame.columns
    && projectedY >= 0
    && projectedY < frame.rows;
  return Object.freeze({
    row: Math.max(0, Math.min(frame.rows - 1, projectedY)),
    column: Math.max(0, Math.min(frame.columns - 1, projectedX)),
    visible: cursor?.visible !== false && inside,
    shape: cursor?.shape ?? 'bar',
    blink: cursor?.blink !== false,
  });
}

function drawGrapheme(
  frame: MutableFrame,
  x: number,
  y: number,
  grapheme: string,
  width: number,
  style: TerminalStyleReference | undefined,
  clip: Rectangle,
): void {
  if (y < clip.y || y >= clip.y + clip.height || x < clip.x || x + width > clip.x + clip.width) return;
  if (y < 0 || y >= frame.rows || x < 0 || x + width > frame.columns) return;
  const cell = frame.cells[y]?.[x];
  if (cell === undefined) return;
  cell.text = grapheme;
  assignOptionalStyle(cell, style);
  delete cell.continuation;
  for (let offset = 1; offset < width && x + offset < frame.columns; offset += 1) {
    const continuation = frame.cells[y]?.[x + offset];
    if (continuation === undefined) continue;
    continuation.text = '';
    continuation.continuation = true;
    assignOptionalStyle(continuation, style);
  }
}

function drawBorder(
  frame: MutableFrame,
  rectangle: Rectangle,
  characters: BorderCharacters,
  style: TerminalStyleReference | undefined,
  clip: Rectangle,
): void {
  if (rectangle.width < 2 || rectangle.height < 2) return;
  drawGrapheme(frame, rectangle.x, rectangle.y, characters.topLeft, 1, style, clip);
  drawGrapheme(frame, rectangle.x + rectangle.width - 1, rectangle.y, characters.topRight, 1, style, clip);
  drawGrapheme(frame, rectangle.x, rectangle.y + rectangle.height - 1, characters.bottomLeft, 1, style, clip);
  drawGrapheme(frame, rectangle.x + rectangle.width - 1, rectangle.y + rectangle.height - 1, characters.bottomRight, 1, style, clip);
  for (let x = rectangle.x + 1; x < rectangle.x + rectangle.width - 1; x += 1) {
    drawGrapheme(frame, x, rectangle.y, characters.horizontal, 1, style, clip);
    drawGrapheme(frame, x, rectangle.y + rectangle.height - 1, characters.horizontal, 1, style, clip);
  }
  for (let y = rectangle.y + 1; y < rectangle.y + rectangle.height - 1; y += 1) {
    drawGrapheme(frame, rectangle.x, y, characters.vertical, 1, style, clip);
    drawGrapheme(frame, rectangle.x + rectangle.width - 1, y, characters.vertical, 1, style, clip);
  }
}

function borderCharacters(border: Exclude<TerminalBorder, 'none'>, unicode: boolean): BorderCharacters {
  if (!unicode) return { horizontal: '-', vertical: '|', topLeft: '+', topRight: '+', bottomLeft: '+', bottomRight: '+' };
  if (border === 'double') return { horizontal: '═', vertical: '║', topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝' };
  if (border === 'rounded') return { horizontal: '─', vertical: '│', topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯' };
  return { horizontal: '─', vertical: '│', topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘' };
}

function normalizeSpacing(spacing: TerminalSpacingInput | undefined): TerminalSpacing {
  if (typeof spacing === 'number') {
    const value = clampNonNegative(spacing);
    return { top: value, right: value, bottom: value, left: value };
  }
  return {
    top: clampNonNegative(spacing?.top ?? 0),
    right: clampNonNegative(spacing?.right ?? 0),
    bottom: clampNonNegative(spacing?.bottom ?? 0),
    left: clampNonNegative(spacing?.left ?? 0),
  };
}

function insetRectangle(rectangle: Rectangle, spacing: TerminalSpacing): Rectangle {
  return {
    x: rectangle.x + spacing.left,
    y: rectangle.y + spacing.top,
    width: Math.max(0, rectangle.width - spacing.left - spacing.right),
    height: Math.max(0, rectangle.height - spacing.top - spacing.bottom),
  };
}

function intersectRectangles(left: Rectangle, right: Rectangle): Rectangle {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const rightEdge = Math.min(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.min(left.y + left.height, right.y + right.height);
  return {
    x,
    y,
    width: Math.max(0, rightEdge - x),
    height: Math.max(0, bottomEdge - y),
  };
}

function justifyOffset(
  justify: TerminalJustification,
  available: number,
  occupied: number,
  count: number,
): number {
  if (justify === 'center') return Math.max(0, Math.floor((available - occupied) / 2));
  if (justify === 'end') return Math.max(0, available - occupied);
  if (justify === 'space-between' && count <= 1) return Math.max(0, Math.floor((available - occupied) / 2));
  return 0;
}

function alignmentOffset(align: TerminalAlignment, available: number, occupied: number): number {
  if (align === 'center') return Math.max(0, Math.floor((available - occupied) / 2));
  if (align === 'end') return Math.max(0, available - occupied);
  return 0;
}

function assignOptionalStyle(cell: MutableFrameCell, style: TerminalStyleReference | undefined): void {
  if (style === undefined) delete cell.style;
  else cell.style = style;
}

function sameStyle(
  left: TerminalStyleReference | undefined,
  right: TerminalStyleReference | undefined,
): boolean {
  return left === right;
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function assertDimension(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Terminal screen ${name} must be a non-negative safe integer.`);
  }
  if (value > MAX_SCREEN_DIMENSION) {
    throw new RangeError(`Terminal screen ${name} must not exceed ${MAX_SCREEN_DIMENSION}.`);
  }
}
