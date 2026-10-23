import type {
  TabularDOMColumnSizeState,
  TabularDOMColumnSizeOptions,
  TabularDOMColumnResizeHandleOptions,
} from '../contracts.js';
import type {
  TabularColumnID,
  TabularResult,
} from '@sectile/tabular';
import {
  domFailure,
  ok,
} from '../result.js';
import {
  type BindingScope,
  bindEvent,
} from './scope.js';

export class ColumnSizeStore {
  readonly #controlled: boolean;
  readonly #onChange: ((state: TabularDOMColumnSizeState) => void) | undefined;
  #state: TabularDOMColumnSizeState;

  public constructor(options: TabularDOMColumnSizeOptions) {
    this.#controlled = options.columnSizes !== undefined;
    this.#onChange = options.onColumnSizesChange;
    const initial = options.columnSizes ?? options.defaultColumnSizes ?? {};
    this.#state = freezeColumnSizes(0, initial);
  }

  public getState(): TabularDOMColumnSizeState { return this.#state; }

  public synchronize(values: Readonly<Record<TabularColumnID, number>> | undefined): TabularResult<TabularDOMColumnSizeState> {
    if (this.#controlled !== (values !== undefined)) {
      return domFailure('invalid-controlled-shape', 'Controlled column sizes must preserve construction-time ownership.');
    }
    if (values === undefined) return ok(this.#state);
    const valid = validateColumnSizes(values);
    if (!valid.ok) return valid;
    this.#state = freezeColumnSizes(this.#state.revision + 1, values);
    return ok(this.#state);
  }

  public propose(columnID: TabularColumnID, size: number): TabularResult<TabularDOMColumnSizeState> {
    if (!Number.isFinite(size) || size <= 0) return domFailure('invalid-column-definition', 'Column size must be a positive finite number.', { columnID, size });
    const next = freezeColumnSizes(this.#state.revision + 1, { ...this.#state.values, [columnID]: size });
    this.#onChange?.(next);
    if (!this.#controlled) this.#state = next;
    return ok(this.#controlled ? this.#state : next);
  }
}

export function validateColumnSizeOptions(options: TabularDOMColumnSizeOptions): TabularResult<true> {
  return validateColumnSizes(options.columnSizes ?? options.defaultColumnSizes ?? {});
}

export function bindColumnResizeHandle(
  scope: BindingScope,
  element: HTMLElement,
  store: ColumnSizeStore,
  options: TabularDOMColumnResizeHandleOptions,
  refreshers: Set<() => void>,
  onUpdate: () => void,
): () => void {
  if (!scope.active) return () => {};
  let bindingActive = true;
  const minimum = options.minSize ?? 24;
  const maximum = options.maxSize ?? Number.MAX_SAFE_INTEGER;
  const step = options.step ?? 8;
  element.setAttribute('role', 'separator');
  element.setAttribute('aria-orientation', 'vertical');
  element.setAttribute('data-column-id', options.columnID);
  element.tabIndex = 0;
  let automaticSize: number | undefined;
  const currentSize = (sample = false): number => {
    const configured = store.getState().values[options.columnID];
    if (configured !== undefined) { automaticSize = undefined; return configured; }
    if (sample || automaticSize === undefined) {
      const header = element.closest<HTMLElement>('[data-part="column-header"]');
      const span = Number(header?.getAttribute('aria-colspan') ?? header?.getAttribute('colspan') ?? '1');
      const width = span === 1 ? header?.getBoundingClientRect().width : undefined;
      automaticSize = width !== undefined && Number.isFinite(width) && width > 0
        ? Math.min(maximum, Math.max(minimum, width)) : minimum;
    }
    return automaticSize ?? minimum;
  };
  const refresh = (): void => {
    element.setAttribute('aria-valuemin', String(minimum));
    element.setAttribute('aria-valuemax', String(maximum));
    element.setAttribute('aria-valuenow', String(currentSize()));
  };
  const propose = (size: number): void => {
    const bounded = Math.min(maximum, Math.max(minimum, size));
    if (store.propose(options.columnID, bounded).ok) onUpdate();
  };
  let releaseDrag: (() => void) | undefined;
  const keydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = currentSize(true);
    propose(current + (event.key === 'ArrowRight' ? step : -step));
  };
  const pointerdown = (event: PointerEvent): void => {
    if (event.button !== 0 || !bindingActive || !scope.active) return;
    event.preventDefault();
    element.focus({ preventScroll: true });
    if (!bindingActive || !scope.active) return;
    releaseDrag?.();
    const start = event.clientX;
    const pointerID = event.pointerId;
    const initial = currentSize(true);
    refresh();
    const view = element.ownerDocument.defaultView;
    if (view === null) return;
    const move = (next: PointerEvent): void => {
      if (next.pointerId === pointerID) propose(initial + next.clientX - start);
    };
    const end = (next: PointerEvent): void => { if (next.pointerId === pointerID) release(); };
    const release = scope.retain(() => {
      view.removeEventListener('pointermove', move);
      view.removeEventListener('pointerup', end);
      view.removeEventListener('pointercancel', end);
      if (releaseDrag === release) releaseDrag = undefined;
    });
    releaseDrag = release;
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
  };
  const removeKey = bindEvent(scope, element, 'keydown', keydown);
  const removeFocus = bindEvent(scope, element, 'focus', () => { currentSize(true); refresh(); });
  const removePointer = bindEvent(scope, element, 'pointerdown', pointerdown);
  refreshers.add(refresh);
  refresh();
  return scope.retain(() => { bindingActive = false; releaseDrag?.(); removeKey(); removeFocus(); removePointer(); refreshers.delete(refresh); });
}

export function setColumnInlineSize(
  element: HTMLElement,
  columnID: TabularColumnID,
  state: TabularDOMColumnSizeState,
): void {
  const size = state.values[columnID];
  if (size === undefined) element.style.removeProperty('inline-size');
  else element.style.inlineSize = `${size}px`;
}

function validateColumnSizes(values: Readonly<Record<TabularColumnID, number>>): TabularResult<true> {
  for (const [columnID, size] of Object.entries(values)) {
    if (!Number.isFinite(size) || size <= 0) return domFailure('invalid-column-definition', 'Column sizes must be positive finite numbers.', { columnID, size });
  }
  return ok(true);
}

function freezeColumnSizes(revision: number, values: Readonly<Record<TabularColumnID, number>>): TabularDOMColumnSizeState {
  return Object.freeze({ revision, values: Object.freeze({ ...values }) });
}
