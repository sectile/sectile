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
  readonly columns: number;
  readonly rows: number;
  readonly appearance?: TerminalAppearance;
}

interface MutableFrameCell {
  text: string;
  style?: TerminalStyleReference;
  continuation?: boolean;
}

interface MutableFrame {
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

interface TerminalTextWalk {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly codeUnitOffset: number;
}

interface TerminalTextVisitor {
  readonly position?: (x: number, y: number, codeUnitOffset: number) => void;
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

export function renderTerminalScreen(
  node: TerminalScreenNode,
  options: RenderTerminalScreenOptions,
): TerminalFrame {
  assertDimension(options.columns, 'columns');
  assertDimension(options.rows, 'rows');
  const appearance = options.appearance ?? createTerminalAppearance();
  const frame: MutableFrame = {
    columns: options.columns,
    rows: options.rows,
    cells: Array.from({ length: options.rows }, () =>
      Array.from({ length: options.columns }, () => ({ text: ' ' }))),
    cursor: null,
  };
  const viewport = { x: 0, y: 0, width: options.columns, height: options.rows };
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
  const clip = intersectRectangles(parentClip, rectangle);
  if (rectangle.width <= 0 || rectangle.height <= 0 || clip.width <= 0 || clip.height <= 0) return;
  if (node.type === 'text') {
    renderText(frame, node, rectangle, clip);
    return;
  }
  if (node.type === 'row' || node.type === 'column') {
    renderContainer(frame, node, rectangle, clip, appearance);
    return;
  }
  if (node.type === 'box') renderBox(frame, node, rectangle, clip, appearance);
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
  appearance: TerminalAppearance,
): void {
  const padding = normalizeSpacing(node.padding);
  const content = insetRectangle(rectangle, padding);
  const horizontal = node.type === 'row';
  const availableMain = horizontal ? content.width : content.height;
  const availableCross = horizontal ? content.height : content.width;
  const gap = clampNonNegative(node.gap ?? 0);
  const totalGap = Math.max(0, node.children.length - 1) * gap;
  const mainSizes = distributeMainSizes(
    node.children,
    Math.max(0, availableMain - totalGap),
    availableCross,
    horizontal,
  );
  const occupied = mainSizes.reduce((sum, size) => sum + size, 0) + totalGap;
  const justify = node.justify ?? 'start';
  const offset = justifyOffset(justify, availableMain, occupied, node.children.length);
  const distributedGap = justify === 'space-between' && node.children.length > 1
    ? gap + Math.max(0, Math.floor((availableMain - occupied) / (node.children.length - 1)))
    : gap;
  let cursor = (horizontal ? content.x : content.y) + offset;

  node.children.forEach((child, index) => {
    const main = mainSizes[index] ?? 0;
    const intrinsic = measureNode(child, content.width, content.height);
    const desiredCross = resolveCrossSize(
      horizontal ? child.height : child.width,
      horizontal ? intrinsic.height : intrinsic.width,
      availableCross,
      node.align ?? 'stretch',
    );
    const crossOffset = alignmentOffset(node.align ?? 'stretch', availableCross, desiredCross);
    const childRectangle: Rectangle = horizontal
      ? { x: cursor, y: content.y + crossOffset, width: main, height: desiredCross }
      : { x: content.x + crossOffset, y: cursor, width: desiredCross, height: main };
    renderNode(frame, child, childRectangle, clip, appearance);
    cursor += main + distributedGap;
  });
}

function renderBox(
  frame: MutableFrame,
  node: TerminalBoxNode,
  rectangle: Rectangle,
  clip: Rectangle,
  appearance: TerminalAppearance,
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
  renderNode(frame, node.child, insetRectangle(rectangle, {
    top: padding.top + borderSize,
    right: padding.right + borderSize,
    bottom: padding.bottom + borderSize,
    left: padding.left + borderSize,
  }), clip, appearance);
}

function distributeMainSizes(
  children: readonly TerminalScreenNode[],
  available: number,
  availableCross: number,
  horizontal: boolean,
): readonly number[] {
  const sizes = children.map((child) => {
    const dimension = horizontal ? child.width : child.height;
    if (typeof dimension === 'number') return clampNonNegative(dimension);
    if (dimension === 'fill') return -1;
    const measured = measureNode(
      child,
      horizontal ? available : availableCross,
      horizontal ? availableCross : available,
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

function measureNode(node: TerminalScreenNode, maximumWidth: number, maximumHeight: number): Size {
  if (node.type === 'text') {
    const lines = node.value.split('\n');
    const intrinsicWidth = Math.max(0, ...lines.map((line) => terminalStringWidth(line)));
    const width = resolveDimension(node.width, intrinsicWidth, maximumWidth);
    const intrinsicHeight = node.wrap === false || width === 0
      ? lines.length
      : walkTerminalText(node.value, width, true).height;
    return {
      width,
      height: resolveDimension(node.height, intrinsicHeight, maximumHeight),
    };
  }
  if (node.type === 'spacer') return resolveSize(node, { width: 0, height: 0 }, maximumWidth, maximumHeight);
  if (node.type === 'box') {
    const border = (node.border ?? 'single') === 'none' ? 0 : 2;
    const padding = normalizeSpacing(node.padding);
    const child = node.child === undefined
      ? { width: 0, height: 0 }
      : measureNode(node.child, maximumWidth, maximumHeight);
    return resolveSize(node, {
      width: child.width + padding.left + padding.right + border,
      height: child.height + padding.top + padding.bottom + border,
    }, maximumWidth, maximumHeight);
  }
  const padding = normalizeSpacing(node.padding);
  const horizontal = node.type === 'row';
  const children = node.children.map((child) => measureNode(child, maximumWidth, maximumHeight));
  const gap = Math.max(0, children.length - 1) * clampNonNegative(node.gap ?? 0);
  const intrinsic = horizontal
    ? {
        width: children.reduce((sum, size) => sum + size.width, 0) + gap + padding.left + padding.right,
        height: Math.max(0, ...children.map((size) => size.height)) + padding.top + padding.bottom,
      }
    : {
        width: Math.max(0, ...children.map((size) => size.width)) + padding.left + padding.right,
        height: children.reduce((sum, size) => sum + size.height, 0) + gap + padding.top + padding.bottom,
      };
  return resolveSize(node, intrinsic, maximumWidth, maximumHeight);
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
    visitor.position?.(x, y, codeUnitOffset);
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
}
