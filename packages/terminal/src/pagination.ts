import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
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
  type PaginationEvent,
  type PaginationItem,
  type PaginationItemRange,
  type PaginationModel,
  type PaginationModelOptions,
  type PaginationState,
} from '@sectile/core/pagination';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface PaginationOptions extends Omit<PaginationModelOptions, 'itemsPerPage'> {
  readonly page?: number;
  readonly defaultPage?: number;
  readonly itemsPerPage?: number;
  readonly defaultItemsPerPage?: number;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onPageChange?: (page: number) => void;
  readonly onItemsPerPageChange?: (itemsPerPage: number) => void;
  readonly onUpdate?: () => void;
}

export type PaginationControlledValues =
  | { readonly page: number; readonly itemsPerPage: number }
  | { readonly page?: never; readonly itemsPerPage?: never };

export interface PaginationConnection {
  getSnapshot(): RevisionSnapshot<PaginationState>;
  getItems(): readonly PaginationItem[];
  getItemRange(): PaginationItemRange;
  getPageCount(): number;
  syncControlledValues(values: PaginationControlledValues): Result<RevisionSnapshot<PaginationState>>;
  handleEvent(event: PaginationEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
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
    ? { ok: true, value: new TerminalPagination(options, model.value, runtime.value, controlled) }
    : runtime;
}

class TerminalPagination implements PaginationConnection {
  readonly #options: PaginationOptions;
  readonly #model: PaginationModel;
  readonly #runtime: SemanticController<PaginationState, PaginationEvent, PaginationCommand>;
  readonly #controlled: boolean;

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

  public handleEvent(event: PaginationEvent): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    if (input.altKey === true || input.ctrlKey === true) return false;
    const event = input.key === 'left' ? 'previous-page'
      : input.key === 'right' ? 'next-page'
        : input.key === 'home' ? 'first-page'
          : input.key === 'end' ? 'last-page'
            : null;
    return event === null ? false : this.handleEvent(event);
  }
}
