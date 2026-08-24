import type { Result, StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { Tree, TreeNodeInput } from '@sectile/core/tree';
import {
  applyMenuEvent,
  tryCreateMenuModel,
  tryCreateMenuState,
  type MenuCommand,
  type MenuEvent,
  type MenuPolicies,
  type MenuState,
} from '@sectile/core/menu';
import type { TerminalKeyboardInput } from '../keyboard.js';
import {
  createSemanticController,
  type SemanticController,
} from './semantic-controller.js';

export type MenuKind = 'menu' | 'menubar' | 'menu-button' | 'navigation-menu';

export interface MenuTypeaheadOptions<ID extends StableID> {
  readonly textValue: (id: ID) => string;
  readonly timeout?: number;
  readonly now?: () => number;
  readonly normalize?: (text: string) => string;
}

export interface MenuControlOptions<ID extends StableID> {
  readonly disabled?: boolean;
  readonly items: readonly TreeNodeInput<ID>[];
  readonly kind: MenuKind;
  readonly policies?: MenuPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly defaultHighlightedValue?: ID | null;
  readonly typeahead?: MenuTypeaheadOptions<ID>;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInvoke?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

export interface MenuControl<ID extends StableID> {
  getSnapshot(): RevisionSnapshot<MenuState<ID>>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>>;
  handleEvent(event: MenuEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createMenuControl<ID extends StableID>(
  options: MenuControlOptions<ID>,
): Result<MenuControl<ID>> {
  const model = tryCreateMenuModel(options.items);
  if (!model.ok) return model;

  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) {
    if (!model.value.tree.has(id)) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'disabled-item-outside-domain',
          message: 'Every disabled menu item must exist in the menu tree.',
          details: { id },
        },
      };
    }
  }

  const suppliedDisabled = options.policies?.disabled;
  const policies: MenuPolicies<ID> = {
    ...options.policies,
    disabled: (id) => disabled.has(id) || (suppliedDisabled?.(id) ?? false),
  };
  const openControlled = options.kind === 'menu-button' && options.open !== undefined;
  const initialOpen = options.kind === 'menu-button'
    ? options.open ?? options.defaultOpen ?? false
    : true;
  const runtime = createSemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, MenuCommand<ID>>({
    interaction: options,
    initial: tryCreateMenuState(
      model.value.tree,
      initialOpen,
      initialOpen ? options.defaultHighlightedValue ?? null : null,
      [],
    ),
    reducer: (state, event) => applyMenuEvent(model.value.tree, state, event, policies),
    reconcile: (previous, proposed) => {
      const open = options.kind === 'menu-button'
        ? openControlled ? previous.open : proposed.open
        : true;
      return tryCreateMenuState(
        model.value.tree,
        open,
        open ? proposed.cursor.current : null,
        open ? proposed.openPath : [],
      );
    },
    notify: (previous, proposed) => {
      if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open);
    },
    toEffect: (command) => command,
  });

  return runtime.ok
    ? {
      ok: true,
      value: new TerminalMenuControl(options, model.value.tree, runtime.value, openControlled),
    }
    : runtime;
}

class TerminalMenuControl<ID extends StableID> implements MenuControl<ID> {
  readonly #options: MenuControlOptions<ID>;
  readonly #tree: Tree<ID>;
  readonly #runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>;
  readonly #openControlled: boolean;
  #typeaheadBuffer = '';
  #lastTypeaheadAt = Number.NEGATIVE_INFINITY;

  public constructor(
    options: MenuControlOptions<ID>,
    tree: Tree<ID>,
    runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>,
    openControlled: boolean,
  ) {
    this.#options = options;
    this.#tree = tree;
    this.#runtime = runtime;
    this.#openControlled = openControlled;
  }

  public getSnapshot(): RevisionSnapshot<MenuState<ID>> {
    return this.#runtime.getSnapshot();
  }

  public syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>> {
    if (!this.#openControlled) {
      return {
        ok: false,
        error: {
          class: 'construction',
          code: 'uncontrolled-controller-sync',
          message: 'Only a controlled menu button can synchronize open state.',
        },
      };
    }
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateMenuState(
      this.#tree,
      open,
      open ? state.cursor.current : null,
      open ? state.openPath : [],
    ));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public handleEvent(event: MenuEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (result.ok) {
      for (const effect of result.commands) {
        if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id);
      }
      this.#options.onUpdate?.();
    }
    return result.ok;
  }

  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    if (this.#handleTypeahead(input)) return true;
    const current = this.getSnapshot().state.cursor.current;
    const event = toMenuEvent(input, this.#options.kind, {
      branch: current !== null && !this.#tree.isLeaf(current),
      nested: current !== null && this.#tree.parentOf(current) !== null,
    });
    return event === null ? false : this.handleEvent(event);
  }

  #handleTypeahead(input: TerminalKeyboardInput): boolean {
    const config = this.#options.typeahead;
    if (
      config === undefined
      || input.altKey
      || input.ctrlKey
      || input.key.length !== 1
    ) return false;

    const now = config.now?.() ?? Date.now();
    const timeout = config.timeout ?? 500;
    this.#typeaheadBuffer = now - this.#lastTypeaheadAt > timeout
      ? input.key
      : `${this.#typeaheadBuffer}${input.key}`;
    this.#lastTypeaheadAt = now;
    const normalize = config.normalize
      ?? ((text: string) => text.normalize('NFKC').toLocaleLowerCase());
    const current = this.getSnapshot().state.cursor.current;
    const siblings = current === null || this.#tree.parentOf(current) === null
      ? this.#tree.roots.ids
      : this.#tree.childrenOf(this.#tree.parentOf(current) as ID)?.ids ?? [];
    if (siblings.length === 0) return true;

    const start = current === null ? 0 : (siblings.indexOf(current) + 1) % siblings.length;
    const query = normalize(this.#typeaheadBuffer);
    for (let offset = 0; offset < siblings.length; offset += 1) {
      const id = siblings[(start + offset) % siblings.length] as ID;
      if (normalize(config.textValue(id)).startsWith(query)) {
        this.handleEvent({ type: 'focus', id });
        break;
      }
    }
    return true;
  }
}

interface MenuKeyboardContext {
  readonly branch: boolean;
  readonly nested: boolean;
}

function toMenuEvent(
  input: TerminalKeyboardInput,
  kind: MenuKind,
  context: MenuKeyboardContext,
): Extract<MenuEvent, string> | null {
  if (input.altKey || input.ctrlKey) return null;
  if (input.key === 'escape') return 'escape';
  if (input.key === 'home') return 'first';
  if (input.key === 'end') return 'last';
  if (input.key === 'enter' || input.key === 'space') {
    return context.branch ? 'open-submenu' : 'invoke';
  }

  if (kind === 'navigation-menu' && !context.nested) {
    if (input.key === 'left') return 'previous';
    if (input.key === 'right') return 'next';
    if (input.key === 'down' || input.key === 'up') return 'open-submenu';
    return null;
  }

  if (input.key === 'down') return 'next';
  if (input.key === 'up') return 'previous';
  if (input.key === 'right') return 'open-submenu';
  if (input.key === 'left') return 'close-submenu';
  return null;
}
