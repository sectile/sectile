import type { Result, StableID } from '@sectile/core';
import {
  applyFeedEvent,
  synchronizeFeedWindow,
  tryCreateFeedState,
  type FeedCommand,
  type FeedDirection,
  type FeedEvent,
  type FeedState,
} from '@sectile/core/feed';
import { unwrap } from '@sectile/core/result';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './interaction/attributes.js';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { readAxisAlignedScale } from './internal/viewport.js';

export type { FeedDirection } from '@sectile/core/feed';

export interface FeedOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly items: readonly ID[];
  readonly revision?: number;
  readonly start?: number;
  readonly total?: number | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly setSize?: number;
  readonly getPosition?: (id: ID) => number;
  /** Scroll owner for opt-in compensation after an accepted earlier window. */
  readonly scrollport?: HTMLElement;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onRequestWindow?: (
    direction: FeedDirection,
    anchor: ID | null,
    revision: number,
    requestGeneration: number,
  ) => void;
  readonly onUpdate?: () => void;
}

export type FeedPositionResolver<ID extends StableID = StableID> =
  NonNullable<FeedOptions<ID>['getPosition']>;
export type FeedHighlightedValueChangeHandler<ID extends StableID = StableID> =
  NonNullable<FeedOptions<ID>['onHighlightedValueChange']>;
export type FeedRequestWindowHandler<ID extends StableID = StableID> =
  NonNullable<FeedOptions<ID>['onRequestWindow']>;
export type FeedUpdateHandler<ID extends StableID = StableID> =
  NonNullable<FeedOptions<ID>['onUpdate']>;

export interface FeedWindow<ID extends StableID = StableID> {
  readonly items: readonly ID[];
  readonly revision: number;
  readonly requestGeneration?: number;
  readonly start?: number;
  readonly total?: number | null;
  readonly highlightedValue?: ID | null;
}

export interface FeedConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<FeedState<ID>>;
  syncWindow(window: FeedWindow<ID>): Result<RevisionSnapshot<FeedState<ID>>>;
  /** Apply pending compensation after the accepted items have been rendered. */
  restoreScrollAnchor(): void;
  setItemAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: FeedEvent<ID>): boolean;
  focusCurrent(): void;
  disconnect(): void;
}

export function createFeed<ID extends StableID>(
  options: FeedOptions<ID>,
): FacadeConnection<FeedConnection<ID>> {
  return unwrap(tryCreateFeed(options));
}

export function tryCreateFeed<ID extends StableID>(
  options: FeedOptions<ID>,
): Result<FacadeConnection<FeedConnection<ID>>> {
  return createFacadeConnection(options, tryCreateFeedConnection);
}

function tryCreateFeedConnection<ID extends StableID>(
  options: FeedOptions<ID>,
): Result<FeedConnection<ID>> {
  const items = tryCreateSequence(options.items);
  if (!items.ok) return items;
  const model = { value: items.value };
  const runtime = createSemanticController<FeedState<ID>, FeedEvent<ID>, FeedCommand<ID>, FeedCommand<ID>>({
    initial: tryCreateFeedState(
      items.value,
      options.defaultHighlightedValue === undefined ? items.value.at(0) : options.defaultHighlightedValue,
      options.revision ?? 0,
      null,
      { start: options.start ?? 0, total: options.total ?? options.setSize ?? null },
    ),
    reducer: (state, event) => applyFeedEvent(model.value, state, event),
    notify: (previous, proposed) => {
      if (previous.cursor.current !== proposed.cursor.current) {
        options.onHighlightedValueChange?.(proposed.cursor.current);
      }
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMFeed(options, model, runtime.value) }
    : runtime;
}

class DOMFeed<ID extends StableID> implements FeedConnection<ID> {
  readonly #options: FeedOptions<ID>;
  readonly #model: { value: Sequence<ID> };
  readonly #runtime: SemanticController<FeedState<ID>, FeedEvent<ID>, FeedCommand<ID>>;
  readonly #elements = new Map<ID, {
    readonly element: HTMLElement;
    readonly click: () => void;
  }>();
  readonly #keydown: (event: KeyboardEvent) => void;
  #active = true;
  #earlierRequest: { readonly id: ID; readonly generation: number } | undefined;
  #scrollAnchor: { readonly id: ID; readonly scrollTop: number; readonly offset: number } | undefined;

  public constructor(
    options: FeedOptions<ID>,
    model: { value: Sequence<ID> },
    runtime: SemanticController<FeedState<ID>, FeedEvent<ID>, FeedCommand<ID>>,
  ) {
    this.#options = options;
    this.#model = model;
    this.#runtime = runtime;
    this.#keydown = (event) => {
      const semantic = event.key === 'ArrowDown' || event.key === 'PageDown'
        ? 'next'
        : event.key === 'ArrowUp' || event.key === 'PageUp' ? 'previous' : null;
      if (semantic !== null) {
        this.handleEvent(semantic);
        event.preventDefault();
      }
    };
    options.root.addEventListener('keydown', this.#keydown);
    options.root.setAttribute('role', 'feed');
    setInteractionAttributes(options.root, options);
  }

  public getSnapshot(): RevisionSnapshot<FeedState<ID>> {
    return this.#runtime.getSnapshot();
  }

  public syncWindow(window: FeedWindow<ID>): Result<RevisionSnapshot<FeedState<ID>>> {
    const items = tryCreateSequence(window.items);
    if (!items.ok) return items;
    const state = synchronizeFeedWindow(items.value, this.getSnapshot().state, {
      revision: window.revision,
      ...(window.requestGeneration === undefined ? {} : { requestGeneration: window.requestGeneration }),
      ...(window.start === undefined ? {} : { start: window.start }),
      ...(window.total === undefined ? {} : { total: window.total }),
      current: window.highlightedValue === undefined
        ? resolveCurrent(items.value, this.getSnapshot().state.cursor.current)
        : window.highlightedValue,
    });
    if (!state.ok) return state;
    this.#scrollAnchor = undefined;
    const request = this.#earlierRequest;
    const scrollport = this.#options.scrollport;
    if (request !== undefined && state.value.pending === null) {
      this.#earlierRequest = undefined;
      const item = this.#elements.get(request.id)?.element;
      const previousIndex = this.#model.value.indexOf(request.id);
      const nextIndex = items.value.indexOf(request.id);
      if (scrollport !== undefined && item !== undefined && scrollport.contains(item)
        && window.requestGeneration === request.generation && previousIndex !== null && nextIndex !== null && nextIndex > previousIndex) {
        this.#scrollAnchor = {
          id: request.id,
          offset: item.getBoundingClientRect().top - scrollport.getBoundingClientRect().top,
          scrollTop: scrollport.scrollTop,
        };
      }
    }
    this.#model.value = items.value;
    for (const [id, registration] of this.#elements) {
      if (items.value.contains(id)) continue;
      registration.element.removeEventListener('click', registration.click);
      this.#elements.delete(id);
    }
    const result = this.#runtime.replace(state);
    if (result.ok) {
      this.#refresh();
      this.#options.onUpdate?.();
      this.focusCurrent();
    }
    return result;
  }

  public restoreScrollAnchor(): void {
    const scrollport = this.#options.scrollport;
    const anchor = this.#scrollAnchor;
    this.#scrollAnchor = undefined;
    if (!this.#active || scrollport === undefined || anchor === undefined) return;
    const item = this.#elements.get(anchor.id)?.element;
    if (item === undefined || !scrollport.contains(item)) return;
    const offset = item.getBoundingClientRect().top - scrollport.getBoundingClientRect().top;
    // The native anchor, or the application, may already have adjusted the scrollport.
    if (scrollport.scrollTop === anchor.scrollTop && offset !== anchor.offset) {
      const delta = (offset - anchor.offset) / readAxisAlignedScale(scrollport).y;
      scrollport.scrollTop = anchor.scrollTop + delta;
    }
  }

  public setItemAttributes(element: HTMLElement, id: ID): void {
    if (!this.#model.value.contains(id)) return;
    const previous = this.#elements.get(id);
    if (previous !== undefined) previous.element.removeEventListener('click', previous.click);
    const click = (): void => { this.handleEvent({ type: 'focus', id }); };
    element.addEventListener('click', click);
    this.#elements.set(id, { element, click });
    this.#refresh();
  }

  public handleEvent(event: FeedEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'request-window') {
          this.#earlierRequest = this.#options.scrollport !== undefined && command.direction === 'before' && command.anchor !== null
            ? { id: command.anchor, generation: command.requestGeneration } : undefined;
          this.#options.onRequestWindow?.(
            command.direction,
            command.anchor,
            command.revision,
            command.requestGeneration,
          );
        } else {
          this.#elements.get(command.id)?.element.focus();
        }
      }
      this.#refresh();
    }
    this.#options.onUpdate?.();
    this.focusCurrent();
    return result.ok;
  }

  public focusCurrent(): void {
    const preventScroll = this.#scrollAnchor !== undefined;
    queueMicrotask(() => {
      if (!this.#active) return;
      const current = this.getSnapshot().state.cursor.current;
      if (current === null) this.#options.root.focus({ preventScroll });
      else this.#elements.get(current)?.element.focus({ preventScroll });
    });
  }

  public disconnect(): void {
    this.#active = false;
    this.#earlierRequest = undefined;
    this.#scrollAnchor = undefined;
    this.#options.root.removeEventListener('keydown', this.#keydown);
    for (const { element, click } of this.#elements.values()) {
      element.removeEventListener('click', click);
    }
    this.#elements.clear();
  }

  #refresh(): void {
    const current = this.getSnapshot().state.cursor.current;
    if (this.#options.label !== undefined) {
      this.#options.root.setAttribute('aria-label', this.#options.label);
    }
    for (const [id, { element }] of this.#elements) {
      element.setAttribute('role', 'article');
      if (this.#options.setSize !== undefined) {
        element.setAttribute('aria-setsize', String(this.#options.setSize));
      }
      const position = this.#options.getPosition?.(id);
      if (position !== undefined) element.setAttribute('aria-posinset', String(position));
      element.tabIndex = id === current ? 0 : -1;
    }
  }
}

function resolveCurrent<ID extends StableID>(items: Sequence<ID>, current: ID | null): ID | null {
  return current !== null && items.contains(current) ? current : items.at(0);
}
