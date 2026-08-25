import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyToolbarEvent,
  tryCreateToolbarState,
  type ToolbarCommand,
  type ToolbarEvent,
  type ToolbarPolicies,
  type ToolbarState,
} from '@sectile/core/toolbar';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { createDisabledItems } from './internal/disabled-items.js';

export type ToolbarEffect<ID extends StableID = StableID> =
  | { readonly type: 'move-control-highlight'; readonly id: ID }
  | { readonly type: 'invoke-control'; readonly id: ID };

export interface ToolbarOptions<ID extends StableID = StableID> {
  readonly disabled?: boolean;
  readonly items: readonly ID[];
  readonly policies?: ToolbarPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onInvoke?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

export type ToolbarHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<ToolbarOptions<ID>['onHighlightedValueChange']>;
export type ToolbarInvokeHandler<ID extends StableID = StableID> = NonNullable<ToolbarOptions<ID>['onInvoke']>;
export type ToolbarUpdateHandler<ID extends StableID = StableID> = NonNullable<ToolbarOptions<ID>['onUpdate']>;

export interface ToolbarConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ToolbarState<ID>>;
  syncControlledValue(value: ID | null): Result<RevisionSnapshot<ToolbarState<ID>>>;
  handleEvent(event: ToolbarEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createToolbar<ID extends StableID>(
  options: ToolbarOptions<ID>,
): FacadeConnection<ToolbarConnection<ID>> {
  return unwrap(tryCreateToolbar(options));
}

export function tryCreateToolbar<ID extends StableID>(
  options: ToolbarOptions<ID>,
): Result<FacadeConnection<ToolbarConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateToolbarConnection(options));
}

function tryCreateToolbarConnection<ID extends StableID>(
  options: ToolbarOptions<ID>,
): Result<ToolbarConnection<ID>> {
  const domain = tryCreateSequence(options.items);
  if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems);
  if (!disabled.ok) return disabled;
  const suppliedEligibility = options.policies?.eligible;
  const policies: ToolbarPolicies<ID> = Object.freeze({
    ...options.policies,
    eligible: (id: ID) => !disabled.value.has(id) && (suppliedEligibility?.(id) ?? true),
  });
  const controlled = options.highlightedValue !== undefined;
  const runtime = createSemanticController<
    ToolbarState<ID>, ToolbarEvent<ID>, ToolbarCommand<ID>, ToolbarEffect<ID>
  >({
    interaction: options,
    initial: tryCreateToolbarState(domain.value, {
      current: options.highlightedValue !== undefined
        ? options.highlightedValue
        : options.defaultHighlightedValue ?? null,
    }),
    reducer: (state, event) => applyToolbarEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateToolbarState(domain.value, {
      current: controlled ? previous.cursor.current : proposed.cursor.current,
    }),
    notify: (previous, proposed) => {
      if (previous.cursor.current !== proposed.cursor.current) {
        options.onHighlightedValueChange?.(proposed.cursor.current);
      }
    },
    toEffect: (command) => command.type === 'focus'
      ? Object.freeze({ type: 'move-control-highlight', id: command.id })
      : Object.freeze({ type: 'invoke-control', id: command.id }),
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalToolbarConnection(options, domain.value, runtime.value, controlled) };
}

export function toToolbarEvent<ID extends StableID = StableID>(
  input: TerminalKeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): ToolbarEvent<ID> | null {
  if (input.key === 'home') return 'first';
  if (input.key === 'end') return 'last';
  if (input.key === 'enter' || input.key === 'space') return 'invoke';
  if (orientation === 'horizontal' && input.key === 'right') return 'next';
  if (orientation === 'horizontal' && input.key === 'left') return 'previous';
  if (orientation === 'vertical' && input.key === 'down') return 'next';
  if (orientation === 'vertical' && input.key === 'up') return 'previous';
  return null;
}

class TerminalToolbarConnection<ID extends StableID> implements ToolbarConnection<ID> {
  readonly #options: ToolbarOptions<ID>;
  readonly #domain: Sequence<ID>;
  readonly #runtime: SemanticController<ToolbarState<ID>, ToolbarEvent<ID>, ToolbarEffect<ID>>;
  readonly #controlled: boolean;

  public constructor(
    options: ToolbarOptions<ID>, domain: Sequence<ID>,
    runtime: SemanticController<ToolbarState<ID>, ToolbarEvent<ID>, ToolbarEffect<ID>>,
    controlled: boolean,
  ) {
    this.#options = options;
    this.#domain = domain;
    this.#runtime = runtime;
    this.#controlled = controlled;
  }

  public getSnapshot(): RevisionSnapshot<ToolbarState<ID>> { return this.#runtime.getSnapshot(); }

  public syncControlledValue(value: ID | null): Result<RevisionSnapshot<ToolbarState<ID>>> {
    if (!this.#controlled) return { ok: false, error: {
      class: 'construction', code: 'uncontrolled-controller-sync',
      message: 'An uncontrolled toolbar cannot be synchronized externally.',
    } };
    const result = this.#runtime.replace(tryCreateToolbarState(this.#domain, { current: value }));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: ToolbarEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) for (const effect of result.commands) {
      if (effect.type === 'invoke-control') this.#options.onInvoke?.(effect.id);
    }
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const event = toToolbarEvent<ID>(input, this.#options.orientation);
    if (event === null) return false;
    return this.handleEvent(event);
  }
}
