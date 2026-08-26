import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import {
  applyPaginationEvent,
  tryCreatePaginationModel,
  tryCreatePaginationState,
  getPaginationItemRange,
  getPaginationItems,
  getPaginationPageCount,
  type PaginationCommand,
  type PaginationControl,
  type PaginationEvent,
  type PaginationItem,
  type PaginationItemRange,
  type PaginationModel,
  type PaginationModelOptions,
  type PaginationState,
} from '@sectile/core/pagination';
import type { RevisionSnapshot } from '@sectile/core/revision';
export type { PaginationControl, PaginationItem, PaginationItemRange } from '@sectile/core/pagination';
import { findDelegatedID } from './internal/delegated-event.js';
import { setInteractionAttributes } from './internal/interaction.js';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';

export interface PaginationOptions extends Omit<PaginationModelOptions, 'itemsPerPage'> {
  readonly root: HTMLElement;
  readonly page?: number;
  readonly defaultPage?: number;
  readonly itemsPerPage?: number;
  readonly defaultItemsPerPage?: number;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly getPageLabel?: (page: number) => string;
  readonly getControlLabel?: (control: PaginationControl) => string;
  readonly onPageChange?: (page: number) => void;
  readonly onItemsPerPageChange?: (itemsPerPage: number) => void;
  readonly onUpdate?: () => void;
}

export type PaginationPageLabelResolver = NonNullable<PaginationOptions['getPageLabel']>;
export type PaginationControlLabelResolver = NonNullable<PaginationOptions['getControlLabel']>;
export type PaginationPageChangeHandler = NonNullable<PaginationOptions['onPageChange']>;
export type PaginationItemsPerPageChangeHandler = NonNullable<PaginationOptions['onItemsPerPageChange']>;
export type PaginationUpdateHandler = NonNullable<PaginationOptions['onUpdate']>;

export type PaginationControlledValues =
  | { readonly page: number; readonly itemsPerPage: number }
  | { readonly page?: never; readonly itemsPerPage?: never };

export interface PaginationConnection {
  getSnapshot(): RevisionSnapshot<PaginationState>;
  getItems(): readonly PaginationItem[];
  getItemRange(): PaginationItemRange;
  getPageCount(): number;
  syncControlledValues(values: PaginationControlledValues): Result<RevisionSnapshot<PaginationState>>;
  setItemAttributes(element: HTMLElement, item: PaginationItem): void;
  handleEvent(event: PaginationEvent): boolean;
  disconnect(): void;
}

export interface PaginationView {
  readonly items: readonly PaginationItem[];
  readonly range: PaginationItemRange;
  readonly pageCount: number;
}

/** Computes the renderable pagination view without requiring a DOM connection. */
export function getPaginationView(options: Omit<PaginationOptions, 'root'>): Result<PaginationView> {
  const itemsPerPage = options.itemsPerPage ?? options.defaultItemsPerPage ?? 10;
  const model = tryCreatePaginationModel({
    total: options.total,
    itemsPerPage,
    ...(options.siblingCount === undefined ? {} : { siblingCount: options.siblingCount }),
    ...(options.showEdges === undefined ? {} : { showEdges: options.showEdges }),
    ...(options.showControls === undefined ? {} : { showControls: options.showControls }),
  });
  if (!model.ok) return model;
  const state = tryCreatePaginationState(model.value, options.page ?? options.defaultPage ?? 1, itemsPerPage);
  if (!state.ok) return state;
  const items = getPaginationItems(model.value, state.value);
  if (!items.ok) return items;
  const range = getPaginationItemRange(model.value, state.value);
  if (!range.ok) return range;
  const pageCount = getPaginationPageCount(model.value, state.value);
  if (!pageCount.ok) return pageCount;
  return { ok: true, value: Object.freeze({
    items: items.value,
    range: range.value,
    pageCount: pageCount.value,
  }) };
}

export function createPagination(
  options: PaginationOptions,
): FacadeConnection<PaginationConnection> {
  return unwrap(tryCreatePagination(options));
}

export function tryCreatePagination(
  options: PaginationOptions,
): Result<FacadeConnection<PaginationConnection>> {
  return createFacadeConnection(options, (options) => tryCreatePaginationConnection(options));
}

function tryCreatePaginationConnection(options: PaginationOptions): Result<PaginationConnection> {
  const controlled = options.page !== undefined || options.itemsPerPage !== undefined;
  if (controlled && (options.page === undefined || options.itemsPerPage === undefined)) {
    return { ok: false, error: {
      class: 'construction',
      code: 'incomplete-controlled-pagination',
      message: 'Controlled pagination requires both page and itemsPerPage.',
    } };
  }
  const initialItemsPerPage = options.itemsPerPage ?? options.defaultItemsPerPage ?? 10;
  const model = tryCreatePaginationModel({
    total: options.total,
    itemsPerPage: initialItemsPerPage,
    ...(options.siblingCount === undefined ? {} : { siblingCount: options.siblingCount }),
    ...(options.showEdges === undefined ? {} : { showEdges: options.showEdges }),
    ...(options.showControls === undefined ? {} : { showControls: options.showControls }),
  });
  if (!model.ok) return model;
  const runtime = createSemanticController<
    PaginationState, PaginationEvent, PaginationCommand, PaginationCommand
  >({
    initial: tryCreatePaginationState(
      model.value,
      options.page ?? options.defaultPage ?? 1,
      initialItemsPerPage,
    ),
    reducer: (state, event) => applyPaginationEvent(model.value, state, event),
    reconcile: (previous, proposed) => tryCreatePaginationState(
      model.value,
      controlled || options.readOnly === true ? previous.page : proposed.page,
      controlled || options.readOnly === true ? previous.itemsPerPage : proposed.itemsPerPage,
    ),
    notify: (previous, proposed) => {
      if (previous.page !== proposed.page) options.onPageChange?.(proposed.page);
      if (previous.itemsPerPage !== proposed.itemsPerPage) {
        options.onItemsPerPageChange?.(proposed.itemsPerPage);
      }
    },
    toEffect: (command) => command,
    interaction: options,
    interactionIntent: () => 'mutate',
  });
  return runtime.ok
    ? { ok: true, value: new DOMPagination(options, model.value, runtime.value, controlled) }
    : runtime;
}

class DOMPagination implements PaginationConnection {
  readonly #options: PaginationOptions;
  readonly #model: PaginationModel;
  readonly #runtime: SemanticController<PaginationState, PaginationEvent, PaginationCommand>;
  readonly #controlled: boolean;
  readonly #click: (event: MouseEvent) => void;

  public constructor(
    options: PaginationOptions,
    model: PaginationModel,
    runtime: SemanticController<PaginationState, PaginationEvent, PaginationCommand>,
    controlled: boolean,
  ) {
    this.#options = options;
    this.#model = model;
    this.#runtime = runtime;
    this.#controlled = controlled;
    this.#click = (event): void => {
      const unavailable = findDelegatedID(event.target, options.root, 'paginationUnavailable');
      if (unavailable === 'true' || options.readOnly === true) {
        event.preventDefault?.();
        return;
      }
      const pageValue = findDelegatedID(event.target, options.root, 'paginationPage');
      if (pageValue !== null) {
        const page = Number(pageValue);
        if (Number.isSafeInteger(page)) this.handleEvent({ type: 'go-to-page', page });
        return;
      }
      const controlValue = findDelegatedID(event.target, options.root, 'paginationControl');
      const control = toPaginationControl(controlValue);
      if (control !== null) this.handleEvent(control);
    };
    options.root.addEventListener('click', this.#click);
    options.root.setAttribute('role', 'navigation');
    options.root.setAttribute('aria-label', options.label ?? 'Pagination');
    setInteractionAttributes(options.root, options, { readOnly: true });
  }

  public getSnapshot(): RevisionSnapshot<PaginationState> { return this.#runtime.getSnapshot(); }
  public getItems(): readonly PaginationItem[] {
    return unwrap(getPaginationItems(this.#model, this.getSnapshot().state));
  }
  public getItemRange(): PaginationItemRange {
    return unwrap(getPaginationItemRange(this.#model, this.getSnapshot().state));
  }
  public getPageCount(): number {
    return unwrap(getPaginationPageCount(this.#model, this.getSnapshot().state));
  }

  public syncControlledValues(
    values: PaginationControlledValues,
  ): Result<RevisionSnapshot<PaginationState>> {
    const supplied = values.page !== undefined || values.itemsPerPage !== undefined;
    if (this.#controlled !== supplied
      || (supplied && (values.page === undefined || values.itemsPerPage === undefined))) {
      return { ok: false, error: {
        class: 'construction',
        code: 'controlled-shape-mismatch',
        message: 'Controlled pagination values must preserve their construction-time shape.',
      } };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreatePaginationState(
      this.#model,
      this.#controlled ? values.page as number : state.page,
      this.#controlled ? values.itemsPerPage as number : state.itemsPerPage,
    ));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public setItemAttributes(element: HTMLElement, item: PaginationItem): void {
    delete element.dataset['paginationPage'];
    delete element.dataset['paginationControl'];
    delete element.dataset['paginationUnavailable'];
    element.removeAttribute('aria-current');
    element.removeAttribute('aria-hidden');
    element.removeAttribute('aria-disabled');
    element.removeAttribute('data-pagination-type');
    if ('disabled' in element) (element as HTMLButtonElement).disabled = false;

    element.setAttribute('data-pagination-type', item.type);
    if (item.type === 'ellipsis') {
      element.setAttribute('aria-hidden', 'true');
      element.tabIndex = -1;
      return;
    }

    const unavailable = this.#options.disabled === true
      || (item.type === 'control' && item.disabled);
    if (item.type === 'page') {
      element.dataset['paginationPage'] = String(item.page);
      element.setAttribute('aria-label', this.#options.getPageLabel?.(item.page) ?? `Page ${item.page}`);
      if (item.selected) element.setAttribute('aria-current', 'page');
    } else {
      element.dataset['paginationControl'] = item.control;
      element.setAttribute('aria-label', this.#options.getControlLabel?.(item.control) ?? controlLabels[item.control]);
    }
    element.tabIndex = unavailable ? -1 : 0;
    if (unavailable) {
      element.dataset['paginationUnavailable'] = 'true';
      element.setAttribute('aria-disabled', 'true');
    }
    if ('disabled' in element) (element as HTMLButtonElement).disabled = unavailable;
  }

  public handleEvent(event: PaginationEvent): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public disconnect(): void {
    this.#options.root.removeEventListener('click', this.#click);
  }
}

const controlLabels: Readonly<Record<PaginationControl, string>> = Object.freeze({
  'first-page': 'First page',
  'previous-page': 'Previous page',
  'next-page': 'Next page',
  'last-page': 'Last page',
});

function toPaginationControl(value: string | null): PaginationControl | null {
  return value === 'first-page' || value === 'previous-page'
    || value === 'next-page' || value === 'last-page'
    ? value
    : null;
}
