import type { StableID } from '@sectile/core';
import type { ChartCommand } from '@sectile/chart/interaction';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartProjection, ChartViewport } from '@sectile/chart/projection';
import { hitTestChartProjection } from '@sectile/chart/query';
import type {
  ChartRenderer,
  ChartRendererDiagnostics,
  DOMChartConnection,
  DOMChartOptions,
  NormalizedChartRenderPolicy,
} from '../chart.js';
import { ChartOverlay } from './chart-overlay.js';
import { stableIDElementToken } from './stable-id-token.js';

let connectionID = 0;

type ChartWindow = Window & typeof globalThis;

export class DOMChart<ID extends StableID> implements DOMChartConnection<ID> {
  public readonly controller: ChartController<ID>;
  readonly #options: DOMChartOptions<ID>;
  readonly #renderer: ChartRenderer;
  readonly #ownsRenderer: boolean;
  readonly #policy: NormalizedChartRenderPolicy;
  readonly #view: ChartWindow;
  readonly #accessibilityLimit: number;
  readonly #prefix = `sectile-chart-${++connectionID}`;
  readonly #list: HTMLDivElement;
  readonly #live: HTMLDivElement;
  readonly #overlay: ChartOverlay<ID>;
  readonly #nodes = new Map<ID, HTMLElement>();
  readonly #rootAttributes: AttributeSnapshot;
  readonly #canvasAttributes: AttributeSnapshot;
  readonly #unsubscribe: () => void;
  readonly #resizeObserver: ResizeObserver | null;
  #viewport: ChartViewport;
  #projection: ChartProjection<ID> | null = null;
  #accessibilityGeneration = -1;
  #frame = 0;
  #renderScale: number;
  #pendingPointer: { readonly x: number; readonly y: number } | null = null;
  #active = true;
  #inFrame = false;

  public constructor(
    options: DOMChartOptions<ID>,
    renderer: ChartRenderer,
    ownsRenderer: boolean,
    policy: NormalizedChartRenderPolicy,
    accessibilityLimit: number,
    view: ChartWindow,
  ) {
    this.#options = options;
    this.controller = options.controller;
    this.#renderer = renderer;
    this.#ownsRenderer = ownsRenderer;
    this.#policy = policy;
    this.#accessibilityLimit = accessibilityLimit;
    this.#view = view;
    this.#renderScale = policy.maximumRenderScale;
    this.#rootAttributes = snapshotAttributes(options.root, ['role', 'tabindex', 'aria-label']);
    this.#canvasAttributes = snapshotAttributes(options.canvas, ['aria-hidden']);
    options.root.setAttribute('role', 'region');
    options.root.setAttribute('tabindex', '0');
    options.root.setAttribute('aria-label', options.accessibilityLabel ?? 'Chart');
    options.canvas.setAttribute('aria-hidden', 'true');
    this.#list = createAssistiveContainer(options.root.ownerDocument, `${this.#prefix}-data`, 'listbox');
    this.#live = createAssistiveContainer(options.root.ownerDocument, `${this.#prefix}-live`, 'status');
    this.#live.setAttribute('aria-live', 'polite');
    options.root.append(this.#list, this.#live);
    this.#overlay = new ChartOverlay(options.root);
    this.#viewport = this.#measureViewport();
    this.#unsubscribe = this.controller.subscribeCommands(this.#handleCommand);
    options.canvas.addEventListener('pointermove', this.#handlePointerMove);
    options.canvas.addEventListener('pointerleave', this.#handlePointerLeave);
    options.canvas.addEventListener('click', this.#handleClick);
    options.root.addEventListener('keydown', this.#handleKeyDown);
    if (typeof view.ResizeObserver === 'function') {
      const observer = new view.ResizeObserver(this.#handleResize);
      observer.observe(options.root);
      this.#resizeObserver = observer;
    } else this.#resizeObserver = null;
    this.refresh();
  }

  public getViewport(): ChartViewport { return this.#viewport; }
  public getProjection(): ChartProjection<ID> | null { return this.#projection; }
  public getRendererDiagnostics(): ChartRendererDiagnostics | null { return this.#renderer.getDiagnostics(); }

  public refresh(): void {
    if (!this.#active) return;
    this.#viewport = this.#measureViewport();
    const startedAt = this.#view.performance.now();
    const projected = this.controller.project({
      viewport: this.#viewport,
      ...(this.#policy.maximumRepresentatives === undefined ? {} : {
        maximumRepresentatives: this.#policy.maximumRepresentatives,
      }),
    });
    if (!projected.ok) return;
    this.#projection = projected.value;
    this.#renderer.render(projected.value);
    this.#overlay.render(projected.value);
    this.#options.onProjectionChange?.(projected.value);
    this.#refreshAccessibility();
    const elapsed = this.#view.performance.now() - startedAt;
    if (this.#policy.type === 'adaptive' && this.#adaptScale(elapsed)) this.#schedule();
  }

  public flush(): void {
    if (!this.#active) return;
    if (this.#frame !== 0) { this.#view.cancelAnimationFrame(this.#frame); this.#frame = 0; }
    this.#runFrame();
    this.#renderer.flush();
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    if (this.#frame !== 0) this.#view.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#pendingPointer = null;
    this.#resizeObserver?.disconnect();
    this.#unsubscribe();
    this.#options.canvas.removeEventListener('pointermove', this.#handlePointerMove);
    this.#options.canvas.removeEventListener('pointerleave', this.#handlePointerLeave);
    this.#options.canvas.removeEventListener('click', this.#handleClick);
    this.#options.root.removeEventListener('keydown', this.#handleKeyDown);
    if (this.#ownsRenderer) this.#renderer.disconnect();
    this.#nodes.clear();
    this.#projection = null;
    this.#list.remove();
    this.#live.remove();
    this.#overlay.disconnect();
    restoreAttributes(this.#options.root, this.#rootAttributes);
    restoreAttributes(this.#options.canvas, this.#canvasAttributes);
  }

  readonly #handleCommand = (command: ChartCommand<ID>): void => {
    if (!this.#active) return;
    this.#options.onCommand?.(command);
    if (command.type === 'render-requested') {
      if (!this.#inFrame) this.#schedule();
    } else if (command.type === 'focus-datum') {
      this.#nodes.get(command.id)?.focus({ preventScroll: true });
    } else if (command.type === 'announce-datum') {
      this.#live.textContent = this.#label(command.id, this.controller.getModel().indexOf(command.id));
    }
  };

  readonly #handleResize = (): void => { this.#schedule(); };
  readonly #handlePointerMove = (event: PointerEvent): void => {
    const rect = this.#options.canvas.getBoundingClientRect();
    this.#pendingPointer = Object.freeze({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    this.#schedule();
  };
  readonly #handlePointerLeave = (): void => {
    this.#pendingPointer = null;
    this.controller.dispatch({ type: 'pointer-candidate', id: null });
  };
  readonly #handleClick = (event: MouseEvent): void => {
    const hit = this.#hitAt(event.clientX, event.clientY);
    if (hit === null) return;
    this.controller.dispatch({ type: 'set-selection', selection: { type: 'points', ids: [hit] } });
    this.controller.dispatch({ type: 'set-cursor', id: hit });
  };
  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 'next'
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 'previous'
        : event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : null;
    if (direction !== null) {
      event.preventDefault();
      this.controller.dispatch({ type: 'move-focus', direction });
    }
  };

  #schedule(): void {
    if (!this.#active || this.#frame !== 0) return;
    this.#frame = this.#view.requestAnimationFrame(this.#runFrame);
  }

  readonly #runFrame = (): void => {
    if (!this.#active) return;
    this.#frame = 0;
    this.#inFrame = true;
    if (this.#pendingPointer !== null && this.#projection !== null) {
      const hits = hitTestChartProjection(this.#projection, { ...this.#pendingPointer, maximumHits: 1 });
      const hit = hits[0];
      this.controller.dispatch({ type: 'pointer-candidate', id: hit?.kind === 'datum' ? hit.id : null });
      this.#pendingPointer = null;
    }
    this.refresh();
    this.#inFrame = false;
  };

  #hitAt(clientX: number, clientY: number): ID | null {
    if (this.#projection === null) return null;
    const rect = this.#options.canvas.getBoundingClientRect();
    const hit = hitTestChartProjection(this.#projection, { x: clientX - rect.left, y: clientY - rect.top, maximumHits: 1 })[0];
    return hit?.kind === 'datum' ? hit.id : null;
  }

  #measureViewport(): ChartViewport {
    const rect = this.#options.root.getBoundingClientRect();
    const width = Math.max(1, rect.width || this.#options.canvas.clientWidth || 1);
    const height = Math.max(1, rect.height || this.#options.canvas.clientHeight || 1);
    const ratio = Math.max(0.25, Math.min(8, this.#view.devicePixelRatio || 1)) * this.#renderScale;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.#options.canvas.width !== pixelWidth) this.#options.canvas.width = pixelWidth;
    if (this.#options.canvas.height !== pixelHeight) this.#options.canvas.height = pixelHeight;
    return Object.freeze({ width, height, devicePixelRatio: ratio });
  }

  #adaptScale(elapsed: number): boolean {
    const before = this.#renderScale;
    if (elapsed > this.#policy.frameBudgetMs) this.#renderScale = Math.max(this.#policy.minimumRenderScale, before * 0.85);
    else if (elapsed < this.#policy.frameBudgetMs * 0.6) this.#renderScale = Math.min(this.#policy.maximumRenderScale, before * 1.05);
    return Math.abs(this.#renderScale - before) > 0.001;
  }

  #refreshAccessibility(): void {
    const model = this.controller.getModel();
    if (model.generation === this.#accessibilityGeneration) return;
    this.#accessibilityGeneration = model.generation;
    this.#nodes.clear();
    this.#list.replaceChildren();
    const count = Math.min(model.size, this.#accessibilityLimit);
    const fragment = this.#options.root.ownerDocument.createDocumentFragment();
    for (let index = 0; index < count; index += 1) {
      const id = model.identityAt(index);
      if (id === null) continue;
      const option = this.#options.root.ownerDocument.createElement('div');
      option.id = `${this.#prefix}-${stableIDElementToken(id)}`;
      option.setAttribute('role', 'option');
      option.setAttribute('tabindex', '-1');
      option.textContent = this.#label(id, index);
      fragment.append(option);
      this.#nodes.set(id, option);
    }
    this.#list.append(fragment);
    this.#list.setAttribute('aria-setsize', String(model.size));
  }

  #label(id: ID, index: number): string {
    return this.#options.getAccessibleDatumLabel?.(id, index) ?? `Data point ${index + 1}: ${String(id)}`;
  }
}

type AttributeSnapshot = ReadonlyMap<string, string | null>;

function snapshotAttributes(element: Element, names: readonly string[]): AttributeSnapshot {
  return new Map(names.map((name) => [name, element.getAttribute(name)]));
}

function restoreAttributes(element: Element, snapshot: AttributeSnapshot): void {
  for (const [name, value] of snapshot) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
}

function createAssistiveContainer(document: Document, id: string, role: string): HTMLDivElement {
  const element = document.createElement('div');
  element.id = id;
  element.setAttribute('role', role);
  element.style.position = 'absolute';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.padding = '0';
  element.style.margin = '-1px';
  element.style.overflow = 'hidden';
  element.style.clipPath = 'inset(50%)';
  element.style.whiteSpace = 'nowrap';
  return element;
}
