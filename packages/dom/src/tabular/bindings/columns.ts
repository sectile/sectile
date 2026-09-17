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
  const minimum = options.minSize ?? 24;
  const maximum = options.maxSize ?? Number.MAX_SAFE_INTEGER;
  const step = options.step ?? 8;
  element.setAttribute('role', 'separator');
  element.setAttribute('aria-orientation', 'vertical');
  element.setAttribute('data-column-id', options.columnID);
  element.tabIndex = 0;
  const refresh = (): void => {
    element.setAttribute('aria-valuemin', String(minimum));
    element.setAttribute('aria-valuemax', String(maximum));
    element.setAttribute('aria-valuenow', String(store.getState().values[options.columnID] ?? minimum));
  };
  const propose = (size: number): void => {
    const bounded = Math.min(maximum, Math.max(minimum, size));
    if (store.propose(options.columnID, bounded).ok) onUpdate();
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = store.getState().values[options.columnID] ?? minimum;
    propose(current + (event.key === 'ArrowRight' ? step : -step));
  };
  const pointerdown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    const start = event.clientX;
    const initial = store.getState().values[options.columnID] ?? Math.max(minimum, element.getBoundingClientRect().width);
    const view = element.ownerDocument.defaultView;
    if (view === null) return;
    const move = (next: PointerEvent): void => propose(initial + next.clientX - start);
    const end = (): void => {
      view.removeEventListener('pointermove', move);
      view.removeEventListener('pointerup', end);
      view.removeEventListener('pointercancel', end);
    };
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', end, { once: true });
    view.addEventListener('pointercancel', end, { once: true });
    scope.retain(end);
  };
  const removeKey = bindEvent(scope, element, 'keydown', keydown);
  const removePointer = bindEvent(scope, element, 'pointerdown', pointerdown);
  refreshers.add(refresh);
  refresh();
  return scope.retain(() => { removeKey(); removePointer(); refreshers.delete(refresh); });
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
