import type { Result, StableID } from '@sectile/core';
import { SectileResultError } from '@sectile/core/result';
import { chartSelectionContains, type ChartCommand, type ChartSelection } from '@sectile/chart/interaction';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartProjection, ChartViewport } from '@sectile/chart/projection';
import { hitTestChartProjection } from '@sectile/chart/query';
import type {
  DOMChartLifecycleDiagnostics,
  DOMChartNavigation,
  ChartRenderer,
  ChartRendererDiagnostics,
  DOMChartConnection,
  DOMChartOptions,
  NormalizedDOMChartNavigation,
  NormalizedChartRenderPolicy,
} from '../chart.js';
import { ChartNavigationAdapter } from './chart-navigation.js';
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
  readonly #navigation: ChartNavigationAdapter<ID>;
  readonly #nodes = new Map<ID, HTMLElement>();
  readonly #rootAttributes: AttributeSnapshot;
  readonly #canvasAttributes: AttributeSnapshot;
  readonly #unsubscribe: () => void;
  readonly #resizeObserver: ResizeObserver | null;
  #viewport: ChartViewport;
  #projection: ChartProjection<ID> | null = null;
  #accessibilityGeneration = -1;
  #accessibilityStart = 0;
  #accessibilityCount = 0;
  #accessibilityActive: ID | null = null;
  #accessibilityCursor: ID | null = null;
  #accessibilitySelection: ChartSelection<ID> | null = null;
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
    navigation: NormalizedDOMChartNavigation<ID>,
  ) {
    const cleanup: Array<() => void> = [];
    this.#options = options;
    this.controller = options.controller;
    this.#renderer = renderer;
    this.#ownsRenderer = ownsRenderer;
    this.#policy = policy;
    this.#accessibilityLimit = accessibilityLimit;
    this.#view = view;
    this.#renderScale = policy.maximumRenderScale;
    try {
      this.#rootAttributes = snapshotAttributes(options.root, ['role', 'tabindex', 'aria-label']);
      this.#canvasAttributes = snapshotAttributes(options.canvas, ['aria-hidden']);
      cleanup.push(() => {
        restoreAttributes(options.root, this.#rootAttributes);
        restoreAttributes(options.canvas, this.#canvasAttributes);
      });
      options.root.setAttribute('role', 'region');
      options.root.setAttribute('tabindex', '0');
      options.root.setAttribute('aria-label', options.accessibilityLabel ?? 'Chart');
      options.canvas.setAttribute('aria-hidden', 'true');
      this.#list = createAssistiveContainer(options.root.ownerDocument, `${this.#prefix}-data`, 'listbox');
      this.#live = createAssistiveContainer(options.root.ownerDocument, `${this.#prefix}-live`, 'status');
      this.#live.setAttribute('aria-live', 'polite');
      cleanup.push(() => { this.#list.remove(); this.#live.remove(); });
      options.root.append(this.#list, this.#live);
      this.#overlay = new ChartOverlay(options.root);
      cleanup.push(() => this.#overlay.disconnect());
      this.#viewport = this.#measureViewport();
      this.#navigation = new ChartNavigationAdapter(
        options.root, options.canvas, this.controller, view, navigation, () => this.#projection,
      );
      cleanup.push(() => this.#navigation.disconnect());
      this.#unsubscribe = this.controller.subscribeCommands(this.#handleCommand);
      if (typeof this.#unsubscribe !== 'function') throw new TypeError('Chart controller subscription must return an unsubscribe function.');
      cleanup.push(() => this.#unsubscribe());
      cleanup.push(() => options.canvas.removeEventListener('pointermove', this.#handlePointerMove));
      options.canvas.addEventListener('pointermove', this.#handlePointerMove);
      cleanup.push(() => options.canvas.removeEventListener('pointerleave', this.#handlePointerLeave));
      options.canvas.addEventListener('pointerleave', this.#handlePointerLeave);
      cleanup.push(() => options.canvas.removeEventListener('click', this.#handleClick));
      options.canvas.addEventListener('click', this.#handleClick);
      cleanup.push(() => options.root.removeEventListener('keydown', this.#handleKeyDown));
      options.root.addEventListener('keydown', this.#handleKeyDown);
      if (typeof view.ResizeObserver === 'function') {
        const observer = new view.ResizeObserver(this.#handleResize);
        this.#resizeObserver = observer;
        cleanup.push(() => observer.disconnect());
        observer.observe(options.root);
      } else this.#resizeObserver = null;
      cleanup.push(() => {
        if (this.#frame !== 0) view.cancelAnimationFrame(this.#frame);
        this.#frame = 0;
      });
      this.refresh();
    } catch (error) {
      this.#active = false;
      for (let index = cleanup.length - 1; index >= 0; index -= 1) {
        try { cleanup[index]?.(); }
        catch { /* Continue rolling back the remaining owned resources. */ }
      }
      throw error;
    }
  }

  public getViewport(): ChartViewport { return this.#viewport; }
  public getProjection(): ChartProjection<ID> | null { return this.#projection; }
  public getRendererDiagnostics(): ChartRendererDiagnostics | null { return this.#renderer.getDiagnostics(); }
  public getLifecycleDiagnostics(): DOMChartLifecycleDiagnostics {
    if (!this.#active) return Object.freeze({ listeners: 0, observers: 0, frames: 0, timers: 0, subscriptions: 0, overlayNodes: 0 });
    const navigation = this.#navigation.diagnostics();
    return Object.freeze({
      listeners: 4 + navigation.listeners,
      observers: this.#resizeObserver === null ? 0 : 1,
      frames: this.#frame === 0 ? 0 : 1,
      timers: navigation.timers,
      subscriptions: 1,
      overlayNodes: 1,
    });
  }
  public setAccessibilityLabel(label?: string): void {
    if (!this.#active) return;
    this.#options.root.setAttribute('aria-label', label ?? 'Chart');
  }
  public setNavigation(navigation?: DOMChartNavigation<ID>): Result<void> {
    return this.#navigation.setNavigation(navigation);
  }

  public refresh(): void {
    if (!this.#active) return;
    if (this.#frame !== 0) {
      this.#view.cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
    this.#viewport = this.#measureViewport();
    const startedAt = this.#view.performance.now();
    const projected = this.controller.project({
      viewport: this.#viewport,
      ...(this.#policy.maximumRepresentatives === undefined ? {} : {
        maximumRepresentatives: this.#policy.maximumRepresentatives,
      }),
    });
    if (!projected.ok) {
      if (this.#projection === null || this.#options.onProjectionError === undefined) {
        throw new SectileResultError(projected.error);
      }
      this.#options.onProjectionError(projected.error);
      return;
    }
    this.#projection = projected.value;
    let failure: readonly [unknown] | undefined;
    try { this.#renderer.render(projected.value); }
    catch (error) { failure ??= [error]; }
    try { this.#overlay.render(projected.value, this.controller.getSnapshot().state); }
    catch (error) { failure ??= [error]; }
    try { this.#navigation.refreshCapabilities(projected.value); }
    catch (error) { failure ??= [error]; }
    try { this.#refreshAccessibility(); }
    catch (error) { failure ??= [error]; }
    try {
      const elapsed = this.#view.performance.now() - startedAt;
      if (this.#policy.type === 'adaptive' && this.#adaptScale(elapsed)) this.#schedule();
    } catch (error) { failure ??= [error]; }
    try { this.#options.onProjectionChange?.(projected.value); }
    catch (error) { failure ??= [error]; }
    if (failure !== undefined) throw failure[0];
  }

  public flush(): void {
    if (!this.#active) return;
    if (this.#frame !== 0) { this.#view.cancelAnimationFrame(this.#frame); this.#frame = 0; }
    let failure: readonly [unknown] | undefined;
    try { this.#runFrame(); }
    catch (error) { failure ??= [error]; }
    try { this.#renderer.flush(); }
    catch (error) { failure ??= [error]; }
    if (failure !== undefined) throw failure[0];
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    if (this.#frame !== 0) this.#view.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#pendingPointer = null;
    this.#resizeObserver?.disconnect();
    this.#unsubscribe();
    this.#navigation.disconnect();
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
    let failure: readonly [unknown] | undefined;
    if (command.type === 'render-requested') {
      try { if (!this.#inFrame) this.#schedule(); }
      catch (error) { failure ??= [error]; }
    } else if (command.type === 'focus-datum' && this.#accessibilityLimit !== 0) {
      try { this.#refreshAccessibility(command.id); }
      catch (error) { failure ??= [error]; }
      try { this.#nodes.get(command.id)?.focus({ preventScroll: true }); }
      catch (error) { failure ??= [error]; }
    } else if (command.type === 'announce-datum') {
      try { this.#live.textContent = this.#label(command.id, this.controller.getModel().indexOf(command.id)); }
      catch (error) { failure ??= [error]; }
    } else if (command.type === 'view-phase' && command.phase === 'settled') {
      try { this.#announceView(command.axisID); }
      catch (error) { failure ??= [error]; }
    }
    try { this.#options.onCommand?.(command); }
    catch (error) { failure ??= [error]; }
    if (failure !== undefined) throw failure[0];
  };

  readonly #handleResize = (): void => { this.#schedule(); };
  readonly #handlePointerMove = (event: PointerEvent): void => {
    if (this.#navigation.isPointerGestureActive()) return;
    const rect = this.#options.canvas.getBoundingClientRect();
    this.#pendingPointer = Object.freeze({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    this.#schedule();
  };
  readonly #handlePointerLeave = (): void => {
    this.#pendingPointer = null;
    this.controller.dispatch({ type: 'pointer-candidate', id: null });
  };
  readonly #handleClick = (event: MouseEvent): void => {
    if (this.#navigation.consumeClick()) return;
    const hit = this.#hitAt(event.clientX, event.clientY);
    if (hit === null) return;
    let failure: readonly [unknown] | undefined;
    try { this.controller.dispatch({ type: 'set-selection', selection: { type: 'points', ids: [hit] } }); }
    catch (error) { failure ??= [error]; }
    try { this.controller.dispatch({ type: 'set-cursor', id: hit }); }
    catch (error) { failure ??= [error]; }
    if (failure !== undefined) throw failure[0];
  };
  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (this.#navigation.handleKeyDown(event)) return;
    if (this.#accessibilityLimit === 0) return;
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
    let failure: readonly [unknown] | undefined;
    try {
      if (this.#pendingPointer !== null && this.#projection !== null) {
        const pointer = this.#pendingPointer;
        this.#pendingPointer = null;
        try {
          const hits = hitTestChartProjection(this.#projection, { ...pointer, maximumHits: 1 });
          const hit = hits[0];
          this.controller.dispatch({ type: 'pointer-candidate', id: hit?.kind === 'datum' ? hit.id : null });
        } catch (error) { failure ??= [error]; }
      }
      try { this.refresh(); }
      catch (error) { failure ??= [error]; }
    } finally {
      this.#inFrame = false;
    }
    if (failure !== undefined) throw failure[0];
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

  #refreshAccessibility(anchorID?: ID): void {
    const model = this.controller.getModel();
    const state = this.controller.getSnapshot().state;
    const anchor = anchorID ?? state.cursor;
    const anchorIndex = anchor === null ? -1 : model.indexOf(anchor);
    const anchorOutsideWindow = anchorIndex >= 0
      && (anchorIndex < this.#accessibilityStart || anchorIndex >= this.#accessibilityStart + this.#accessibilityCount);
    if (model.generation !== this.#accessibilityGeneration || anchorOutsideWindow) {
      this.#accessibilityGeneration = model.generation;
      this.#nodes.clear();
      this.#list.replaceChildren();
      const count = Math.min(model.size, this.#accessibilityLimit);
      const start = anchorIndex < 0 || count === 0
        ? 0
        : Math.min(Math.max(0, anchorIndex - Math.floor(count / 2)), model.size - count);
      this.#accessibilityStart = start;
      this.#accessibilityCount = count;
      const fragment = this.#options.root.ownerDocument.createDocumentFragment();
      for (let index = start; index < start + count; index += 1) {
        const id = model.identityAt(index);
        if (id === null) continue;
        const option = this.#options.root.ownerDocument.createElement('div');
        option.id = `${this.#prefix}-${stableIDElementToken(id)}`;
        option.setAttribute('role', 'option');
        option.setAttribute('tabindex', '-1');
        option.setAttribute('aria-posinset', String(index + 1));
        option.setAttribute('aria-setsize', String(model.size));
        option.textContent = this.#label(id, index);
        fragment.append(option);
        this.#nodes.set(id, option);
      }
      this.#list.append(fragment);
      this.#list.setAttribute('aria-setsize', String(model.size));
      this.#accessibilityActive = null;
      this.#accessibilityCursor = null;
      this.#accessibilitySelection = null;
    }
    if (state.activeDatum !== this.#accessibilityActive) {
      if (this.#accessibilityActive !== null) this.#nodes.get(this.#accessibilityActive)?.removeAttribute('data-active');
      if (state.activeDatum !== null) this.#nodes.get(state.activeDatum)?.setAttribute('data-active', '');
      this.#accessibilityActive = state.activeDatum;
    }
    if (state.cursor !== this.#accessibilityCursor) {
      if (this.#accessibilityCursor !== null) this.#nodes.get(this.#accessibilityCursor)?.removeAttribute('aria-current');
      const current = state.cursor === null ? undefined : this.#nodes.get(state.cursor);
      if (current === undefined) this.#list.removeAttribute('aria-activedescendant');
      else { current.setAttribute('aria-current', 'true'); this.#list.setAttribute('aria-activedescendant', current.id); }
      this.#accessibilityCursor = state.cursor;
    }
    if (state.selection !== this.#accessibilitySelection) {
      for (const [id, node] of this.#nodes) node.setAttribute('aria-selected', String(chartSelectionContains(state.selection, id)));
      this.#accessibilitySelection = state.selection;
    }
  }

  #label(id: ID, index: number): string {
    return this.#options.getAccessibleDatumLabel?.(id, index) ?? `Data point ${index + 1}: ${String(id)}`;
  }

  #announceView(axisID: ID): void {
    const view = this.controller.getSnapshot().state.view?.axes.find((axis) => axis.axisID === axisID);
    if (view === undefined) return;
    const layout = this.#projection?.layout?.axes.find((axis) => axis.axis.id === axisID);
    const name = layout?.axis.label ?? String(axisID);
    if (view.visible.kind === 'continuous') {
      this.#live.textContent = `${name} range ${view.visible.minimum} to ${view.visible.maximum}`;
      return;
    }
    const categories = view.categories?.slice(view.visible.start, view.visible.end);
    this.#live.textContent = categories === undefined || categories.length === 0
      ? `${name} items ${view.visible.start + 1} to ${view.visible.end}`
      : `${name} range ${String(categories[0])} to ${String(categories.at(-1))}`;
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
