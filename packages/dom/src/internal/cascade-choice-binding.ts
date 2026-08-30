import type { StableID } from '@sectile/core';
import type { Tree } from '@sectile/core/tree';
import { findDelegatedStableID } from './delegated-event.js';
import { stableIDToken } from './stable-id-token.js';
import { setInteractionAttributes } from './interaction.js';

export type DOMCascadeChoiceEvent<ID extends StableID = StableID> =
  | 'next' | 'previous' | 'first' | 'last'
  | 'right' | 'left' | 'select'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select'; readonly id: ID };

export interface DOMCascadeChoiceState<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly highlighted: ID | null;
  readonly path: readonly ID[];
}

export interface DOMCascadeChoiceBindingOptions<
  ID extends StableID,
  Event,
> {
  readonly root: HTMLElement;
  readonly surface: HTMLElement;
  readonly tree: Tree<ID>;
  readonly disabledItems: ReadonlySet<ID>;
  readonly disabled: boolean | undefined;
  readonly readOnly: boolean | undefined;
  readonly label: string | undefined;
  readonly scope: 'cascade-list' | 'cascade-select';
  readonly readState: () => DOMCascadeChoiceState<ID>;
  readonly handleEvent: (event: Event) => boolean;
  readonly toEvent: (event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>) => Event | null;
}

export interface DOMCascadeChoiceBinding<ID extends StableID = StableID> {
  setColumnAttributes(element: HTMLElement, parentID?: ID | null, label?: string): void;
  setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void;
  focusItem(id: ID): void;
  disconnect(): void;
}

export function createDOMCascadeChoiceBinding<
  ID extends StableID,
  Event,
>(options: DOMCascadeChoiceBindingOptions<ID, Event>): DOMCascadeChoiceBinding<ID> {
  return new DOMCascadeChoiceBindingImplementation(options);
}

class DOMCascadeChoiceBindingImplementation<
  ID extends StableID,
  Event,
> implements DOMCascadeChoiceBinding<ID> {
  readonly #options: DOMCascadeChoiceBindingOptions<ID, Event>;
  readonly #idDataKey: 'cascadeListId' | 'cascadeSelectId';
  readonly #parentDataKey: 'cascadeListParent' | 'cascadeSelectParent';
  readonly #itemSelector: '[data-cascade-list-id]' | '[data-cascade-select-id]';
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;
  #active = true;

  public constructor(options: DOMCascadeChoiceBindingOptions<ID, Event>) {
    this.#options = options;
    const list = options.scope === 'cascade-list';
    this.#idDataKey = list ? 'cascadeListId' : 'cascadeSelectId';
    this.#parentDataKey = list ? 'cascadeListParent' : 'cascadeSelectParent';
    this.#itemSelector = list ? '[data-cascade-list-id]' : '[data-cascade-select-id]';
    setInteractionAttributes(options.root, {
      disabled: options.disabled ?? false,
      readOnly: options.readOnly ?? false,
    }, { readOnly: true });
    options.surface.setAttribute('role', 'group');
    options.surface.dataset['scope'] = options.scope;
    options.surface.dataset['part'] = list ? 'root' : 'content';
    if (options.label !== undefined) options.surface.setAttribute('aria-label', options.label);
    this.#keydown = (event): void => {
      const semantic = options.toEvent(event);
      if (semantic !== null) {
        event.preventDefault();
        options.handleEvent(semantic);
      }
    };
    this.#click = (event): void => {
      const id = findDelegatedStableID(event.target, options.surface, this.#idDataKey) as ID | null;
      if (id !== null && !options.disabledItems.has(id)) options.handleEvent({ type: 'select', id } as Event);
    };
    options.root.addEventListener('keydown', this.#keydown);
    options.surface.addEventListener('click', this.#click);
  }

  public setColumnAttributes(element: HTMLElement, parentID: ID | null = null, label?: string): void {
    element.setAttribute('role', 'listbox');
    element.setAttribute('aria-orientation', 'vertical');
    element.dataset['scope'] = this.#options.scope;
    element.dataset['part'] = 'column';
    element.dataset[this.#parentDataKey] = parentID === null ? '' : stableIDToken(parentID);
    const accessibleName = label ?? this.#options.label;
    if (accessibleName !== undefined) element.setAttribute('aria-label', accessibleName);
    else element.removeAttribute('aria-label');
  }

  public setItemAttributes(element: HTMLElement, id: ID, disabled = false): void {
    const state = this.#options.readState();
    const selected = state.value === id;
    const highlighted = state.highlighted === id;
    const expanded = state.path.includes(id);
    const branch = this.#options.tree.isLeaf(id) === false;
    const unavailable = disabled || this.#options.disabledItems.has(id) || this.#options.disabled === true;
    element.dataset[this.#idDataKey] = stableIDToken(id);
    element.dataset['scope'] = this.#options.scope;
    element.dataset['part'] = 'item';
    element.dataset['state'] = selected ? 'checked' : 'unchecked';
    element.setAttribute('role', 'option');
    element.setAttribute('aria-selected', String(selected));
    element.setAttribute('aria-haspopup', branch ? 'listbox' : 'false');
    if (branch) element.setAttribute('aria-expanded', String(expanded));
    else element.removeAttribute('aria-expanded');
    element.tabIndex = unavailable ? -1 : highlighted ? 0 : -1;
    if (unavailable) {
      element.setAttribute('aria-disabled', 'true');
      element.dataset['disabled'] = '';
    } else {
      element.removeAttribute('aria-disabled');
      delete element.dataset['disabled'];
    }
    if (selected) element.dataset['selected'] = '';
    else delete element.dataset['selected'];
    if (highlighted) element.dataset['highlighted'] = '';
    else delete element.dataset['highlighted'];
    if (expanded) element.dataset['expanded'] = '';
    else delete element.dataset['expanded'];
  }

  public focusItem(id: ID): void {
    queueMicrotask(() => {
      if (!this.#active) return;
      for (const element of this.#options.surface.querySelectorAll<HTMLElement>(this.#itemSelector)) {
        if (element.dataset[this.#idDataKey] === stableIDToken(id)) element.focus();
      }
    });
  }

  public disconnect(): void {
    this.#active = false;
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.surface.removeEventListener('click', this.#click);
  }
}
