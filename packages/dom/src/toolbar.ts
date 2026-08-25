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
export type { ToolbarPolicies } from '@sectile/core/toolbar';
import { findDelegatedID } from './internal/delegated-event.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';
import type { KeyboardInput } from './tabs.js';
import { horizontalArrow, type ReadingDirection } from './internal/direction.js';

export type ToolbarEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-control'; readonly id: ID }
  | { readonly type: 'invoke-control'; readonly id: ID };

export interface ToolbarOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly disabled?: boolean;
  readonly items: readonly ID[];
  readonly policies?: ToolbarPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly direction?: ReadingDirection;
  readonly label?: string;
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
  setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void;
  handleEvent(event: ToolbarEvent<ID>): boolean;
  disconnect(): void;
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
      ? Object.freeze({ type: 'focus-control', id: command.id })
      : Object.freeze({ type: 'invoke-control', id: command.id }),
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMToolbarConnection(options, domain.value, runtime.value, controlled, disabled.value) };
}

export function toToolbarEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  direction: ReadingDirection = 'ltr',
): ToolbarEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'Home') return 'first';
  if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'invoke';
  if (orientation === 'horizontal') {
    const horizontal = horizontalArrow(input.key, direction);
    if (horizontal !== null) return horizontal;
  }
  if (orientation === 'vertical' && input.key === 'ArrowDown') return 'next';
  if (orientation === 'vertical' && input.key === 'ArrowUp') return 'previous';
  return null;
}

class DOMToolbarConnection<ID extends StableID> implements ToolbarConnection<ID> {
  readonly #options: ToolbarOptions<ID>;
  readonly #domain: Sequence<ID>;
  readonly #runtime: SemanticController<ToolbarState<ID>, ToolbarEvent<ID>, ToolbarEffect<ID>>;
  readonly #controlled: boolean;
  readonly #disabledItems: ReadonlySet<ID>;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;

  public constructor(
    options: ToolbarOptions<ID>, domain: Sequence<ID>,
    runtime: SemanticController<ToolbarState<ID>, ToolbarEvent<ID>, ToolbarEffect<ID>>,
    controlled: boolean,
    disabledItems: ReadonlySet<ID>,
  ) {
    this.#options = options;
    this.#domain = domain;
    this.#runtime = runtime;
    this.#controlled = controlled;
    this.#disabledItems = disabledItems;
    options.root.setAttribute('role', 'toolbar');
    setInteractionAttributes(options.root, options);
    options.root.setAttribute('aria-orientation', options.orientation ?? 'horizontal');
    options.root.setAttribute('dir', options.direction ?? 'ltr');
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    this.#keydown = (event): void => {
      const semantic = toToolbarEvent<ID>(event, options.orientation, options.direction);
      if (semantic === null) return;
      event.preventDefault();
      this.handleEvent(semantic);
    };
    this.#click = (event): void => {
      const id = findDelegatedID(event.target, options.root, 'toolbarId');
      if (id !== null) this.handleEvent({ type: 'invoke', id: id as ID });
    };
    options.root.addEventListener('keydown', this.#keydown);
    options.root.addEventListener('click', this.#click);
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

  public setItemAttributes(element: HTMLElement, id: ID, disabled = false): void {
    element.dataset['toolbarId'] = id;
    element.tabIndex = this.#runtime.getSnapshot().state.cursor.current === id ? 0 : -1;
    if (disabled || this.#disabledItems.has(id)) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
  }

  public handleEvent(event: ToolbarEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const effect of result.commands) {
        if (effect.type === 'invoke-control') this.#options.onInvoke?.(effect.id);
      }
      queueMicrotask(() => {
        for (const element of this.#options.root.querySelectorAll<HTMLElement>('[data-toolbar-id]')) {
          if (element.dataset['toolbarId'] === result.snapshot.state.cursor.current) element.focus();
        }
      });
    }
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }

  public disconnect(): void {
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.root.removeEventListener('click', this.#click);
  }
}
