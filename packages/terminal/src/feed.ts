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
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export interface FeedOptions<ID extends StableID = StableID> {
  readonly items: readonly ID[];
  readonly revision?: number;
  readonly start?: number;
  readonly total?: number | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly disabled?: boolean;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onRequestWindow?: (
    direction: FeedDirection,
    anchor: ID | null,
    revision: number,
    requestGeneration: number,
  ) => void;
  readonly onUpdate?: () => void;
}

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
  handleEvent(event: FeedEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createFeed<ID extends StableID>(
  options: FeedOptions<ID>,
): FacadeConnection<FeedConnection<ID>> {
  return unwrap(tryCreateFeed(options));
}

export function tryCreateFeed<ID extends StableID>(
  options: FeedOptions<ID>,
): Result<FacadeConnection<FeedConnection<ID>>> {
  return createFacadeConnection(options, (normalized) => tryCreateFeedConnection(normalized));
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
      options.defaultHighlightedValue ?? options.items[0] ?? null,
      options.revision ?? 0,
      null,
      { start: options.start ?? 0, total: options.total ?? null },
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
    ? { ok: true, value: new TerminalFeed(options, model, runtime.value) }
    : runtime;
}

class TerminalFeed<ID extends StableID> implements FeedConnection<ID> {
  readonly #options: FeedOptions<ID>;
  readonly #model: { value: Sequence<ID> };
  readonly #runtime: SemanticController<FeedState<ID>, FeedEvent<ID>, FeedCommand<ID>>;

  public constructor(
    options: FeedOptions<ID>,
    model: { value: Sequence<ID> },
    runtime: SemanticController<FeedState<ID>, FeedEvent<ID>, FeedCommand<ID>>,
  ) {
    this.#options = options;
    this.#model = model;
    this.#runtime = runtime;
  }

  public getSnapshot(): RevisionSnapshot<FeedState<ID>> {
    return this.#runtime.getSnapshot();
  }

  public syncWindow(window: FeedWindow<ID>): Result<RevisionSnapshot<FeedState<ID>>> {
    const items = tryCreateSequence(window.items);
    if (!items.ok) return items;
    const previous = this.getSnapshot().state;
    const state = synchronizeFeedWindow(items.value, previous, {
      revision: window.revision,
      ...(window.requestGeneration === undefined ? {} : { requestGeneration: window.requestGeneration }),
      ...(window.start === undefined ? {} : { start: window.start }),
      ...(window.total === undefined ? {} : { total: window.total }),
      current: window.highlightedValue
        ?? (previous.cursor.current !== null && items.value.contains(previous.cursor.current)
          ? previous.cursor.current
          : window.items[0] ?? null),
    });
    if (!state.ok) return state;
    this.#model.value = items.value;
    const result = this.#runtime.replace(state);
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: FeedEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'request-window') {
          this.#options.onRequestWindow?.(
            command.direction,
            command.anchor,
            command.revision,
            command.requestGeneration,
          );
        }
      }
    }
    this.#options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const event = input.key === 'down' || input.key === 'page-down'
      ? 'next'
      : input.key === 'up' || input.key === 'page-up'
        ? 'previous'
        : input.key === 'load-before'
          ? 'request-before'
          : input.key === 'load-after' ? 'request-after' : null;
    return event === null ? false : this.handleEvent(event);
  }
}
