import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { createSequence, type Sequence } from '@sectile/core/sequence';
import type { RevisionResult, RevisionSnapshot } from '@sectile/core/revision';
import {
  applyAccordionEvent,
  createAccordionState,
  type AccordionCommand,
  type AccordionEvent,
  type AccordionPolicies,
  type AccordionState,
} from '@sectile/core/accordion';
import { findDelegatedID } from './internal/delegated-event.js';
import { createDisabledItems } from './internal/disabled-items.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';
import type { KeyboardInput } from './tabs.js';

export type AccordionEffect<ID extends StableID = StableID> = AccordionCommand<ID>;

export interface AccordionValueChangeDetails<ID extends StableID = StableID> {
  readonly value: readonly ID[];
  readonly previousValue: readonly ID[];
}

export interface AccordionHighlightChangeDetails<ID extends StableID = StableID> {
  readonly value: ID | null;
  readonly previousValue: ID | null;
}

export interface AccordionControllerOptions<ID extends StableID = StableID> {
  readonly items: readonly ID[];
  /** @deprecated Prefer the top-level expansion and collapsible options. */
  readonly policies?: AccordionPolicies<ID>;
  readonly expansion?: 'single' | 'multiple';
  readonly collapsible?: boolean;
  readonly disabledItems?: readonly ID[];
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly value?: readonly ID[];
  readonly defaultValue?: readonly ID[];
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  readonly onValueChange?: (change: AccordionValueChangeDetails<ID>) => void;
  readonly onHighlightedValueChange?: (change: AccordionHighlightChangeDetails<ID>) => void;
}

export interface AccordionControlledValues<ID extends StableID = StableID> {
  readonly value?: readonly ID[];
  readonly openIDs?: readonly ID[];
  readonly highlightedValue?: ID | null;
}

export interface AccordionController<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<AccordionState<ID>>;
  syncControlledValues(values: AccordionControlledValues<ID>): Result<RevisionSnapshot<AccordionState<ID>>>;
  handleEvent(event: AccordionEvent<ID>, expectedRevision?: number): RevisionResult<AccordionState<ID>, AccordionEffect<ID>>;
}

export interface AccordionOptions<ID extends StableID = StableID>
  extends AccordionControllerOptions<ID> {
  readonly root: HTMLElement;
  readonly openIDs?: readonly ID[];
  readonly defaultOpenIDs?: readonly ID[];
  readonly label?: string;
  readonly onOpenChange?: (openIDs: readonly ID[]) => void;
  readonly onUpdate?: () => void;
}

export interface AccordionRootAttributesOptions {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
}

export interface AccordionTriggerAttributes<ID extends StableID = StableID> {
  readonly id: ID;
  readonly triggerID?: string;
  readonly panelID?: string;
  readonly disabled?: boolean;
}

export interface AccordionTriggerAttributesOptions {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly native?: boolean;
}

export interface AccordionPanelAttributesOptions {
  readonly panelID?: string;
  readonly triggerID?: string;
}

export interface AccordionConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<AccordionState<ID>>;
  syncControlledValues(values: AccordionControlledValues<ID>): Result<RevisionSnapshot<AccordionState<ID>>>;
  setRootAttributes(label?: string): void;
  setTriggerAttributes(element: HTMLElement, attributes: AccordionTriggerAttributes<ID>): void;
  setHeaderAttributes(element: HTMLElement, id: ID, panelID?: string, disabled?: boolean): void;
  setPanelAttributes(
    element: HTMLElement,
    id: ID,
    attributes?: AccordionPanelAttributesOptions | string,
  ): void;
  handleEvent(event: AccordionEvent<ID>): boolean;
  disconnect(): void;
}

export function createAccordionController<ID extends StableID>(
  options: AccordionControllerOptions<ID>,
): Result<AccordionController<ID>> {
  const domain = createSequence(options.items);
  if (!domain.ok) return domain;
  const disabled = createDisabledItems(domain.value, options.disabledItems);
  if (!disabled.ok) return disabled;
  const policies = accordionPolicies(options, disabled.value);
  const valueControlled = options.value !== undefined;
  const highlightControlled = options.highlightedValue !== undefined;
  const initialValue = options.value ?? options.defaultValue
    ?? (policies.collapsible === false && options.items[0] !== undefined ? [options.items[0]] : []);
  const runtime = createSemanticController<
    AccordionState<ID>, AccordionEvent<ID>, AccordionCommand<ID>, AccordionEffect<ID>
  >({
    interaction: options,
    interactionIntent: accordionIntent,
    initial: createAccordionState(domain.value, {
      openIDs: initialValue,
      current: options.highlightedValue !== undefined
        ? options.highlightedValue
        : options.defaultHighlightedValue ?? null,
    }, policies),
    reducer: (state, event) => applyAccordionEvent(domain.value, state, event, policies),
    reconcile: (previous, proposed) => createAccordionState(domain.value, {
      openIDs: valueControlled || options.readOnly === true ? previous.openIDs : proposed.openIDs,
      current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
    }, policies),
    notify: (previous, proposed) => {
      if (!sameIDs(previous.openIDs, proposed.openIDs)) {
        options.onValueChange?.({ value: proposed.openIDs, previousValue: previous.openIDs });
      }
      if (previous.cursor.current !== proposed.cursor.current) {
        options.onHighlightedValueChange?.({
          value: proposed.cursor.current,
          previousValue: previous.cursor.current,
        });
      }
    },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  return {
    ok: true,
    value: new DOMAccordionController(
      domain.value,
      policies,
      runtime.value,
      valueControlled,
      highlightControlled,
    ),
  };
}

export function createAccordion<ID extends StableID>(
  options: AccordionOptions<ID>,
): FacadeConnection<AccordionConnection<ID>> {
  return unwrap(tryCreateAccordion(options));
}

export function tryCreateAccordion<ID extends StableID>(
  options: AccordionOptions<ID>,
): Result<FacadeConnection<AccordionConnection<ID>>> {
  return createFacadeConnection(options, (resolved) => {
    const controller = createAccordionController({
      ...resolved,
      ...((resolved.value ?? resolved.openIDs) === undefined
        ? {}
        : { value: resolved.value ?? resolved.openIDs }),
      ...((resolved.defaultValue ?? resolved.defaultOpenIDs) === undefined
        ? {}
        : { defaultValue: resolved.defaultValue ?? resolved.defaultOpenIDs }),
      onValueChange: (change) => {
        resolved.onValueChange?.(change);
        resolved.onOpenChange?.(change.value);
      },
    });
    if (!controller.ok) return controller;
    return { ok: true, value: connectAccordion({ ...resolved, controller: controller.value }) };
  });
}

export function connectAccordion<ID extends StableID>(
  options: AccordionOptions<ID> & { readonly controller: AccordionController<ID> },
): AccordionConnection<ID> {
  return new DOMAccordionConnection(options);
}

export function getAccordionRootAttributes(
  options: AccordionRootAttributesOptions = {},
): Readonly<Record<string, string | undefined>> {
  return Object.freeze({
    'data-scope': 'accordion',
    'data-part': 'root',
    'data-disabled': options.disabled === true ? '' : undefined,
    'data-readonly': options.readOnly === true ? '' : undefined,
    'aria-label': options.label,
  });
}

export function getAccordionTriggerAttributes<ID extends StableID>(
  state: Pick<AccordionState<ID>, 'has'>,
  attributes: AccordionTriggerAttributes<ID>,
  options: AccordionTriggerAttributesOptions = {},
): Readonly<Record<string, string | number | boolean | undefined>> {
  const unavailable = options.disabled === true || attributes.disabled === true;
  const open = state.has(attributes.id);
  return Object.freeze({
    id: attributes.triggerID,
    type: options.native === true ? 'button' : undefined,
    disabled: options.native === true && unavailable ? true : undefined,
    tabindex: unavailable ? -1 : 0,
    'aria-expanded': String(open),
    'aria-controls': attributes.panelID,
    'aria-disabled': unavailable ? 'true' : undefined,
    'data-scope': 'accordion',
    'data-part': 'trigger',
    'data-accordion-id': String(attributes.id),
    'data-state': open ? 'open' : 'closed',
    'data-disabled': unavailable ? '' : undefined,
    'data-readonly': options.readOnly === true ? '' : undefined,
  });
}

export function getAccordionPanelAttributes<ID extends StableID>(
  state: Pick<AccordionState<ID>, 'has'>,
  id: ID,
  options: AccordionPanelAttributesOptions = {},
): Readonly<Record<string, string | boolean | undefined>> {
  const open = state.has(id);
  return Object.freeze({
    id: options.panelID,
    role: 'region',
    hidden: !open,
    'aria-labelledby': options.triggerID,
    'data-scope': 'accordion',
    'data-part': 'content',
    'data-state': open ? 'open' : 'closed',
  });
}

export function toAccordionEvent<ID extends StableID = StableID>(
  input: KeyboardInput,
): AccordionEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'ArrowDown') return 'next';
  if (input.key === 'ArrowUp') return 'previous';
  if (input.key === 'Home') return 'first';
  if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'toggle';
  return null;
}

class DOMAccordionController<ID extends StableID> implements AccordionController<ID> {
  readonly #domain: Sequence<ID>;
  readonly #policies: AccordionPolicies<ID>;
  readonly #runtime: SemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionEffect<ID>>;
  readonly #valueControlled: boolean;
  readonly #highlightControlled: boolean;

  public constructor(
    domain: Sequence<ID>,
    policies: AccordionPolicies<ID>,
    runtime: SemanticController<AccordionState<ID>, AccordionEvent<ID>, AccordionEffect<ID>>,
    valueControlled: boolean,
    highlightControlled: boolean,
  ) {
    this.#domain = domain;
    this.#policies = policies;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#highlightControlled = highlightControlled;
  }

  public getSnapshot(): RevisionSnapshot<AccordionState<ID>> { return this.#runtime.getSnapshot(); }

  public syncControlledValues(
    values: AccordionControlledValues<ID>,
  ): Result<RevisionSnapshot<AccordionState<ID>>> {
    const value = values.value ?? values.openIDs;
    if (this.#valueControlled !== (value !== undefined)
      || this.#highlightControlled !== (values.highlightedValue !== undefined)) {
      return { ok: false, error: {
        class: 'construction',
        code: 'controlled-shape-mismatch',
        message: 'Controlled accordion values must preserve their construction-time shape.',
      } };
    }
    const state = this.#runtime.getSnapshot().state;
    return this.#runtime.replace(createAccordionState(this.#domain, {
      openIDs: this.#valueControlled ? value as readonly ID[] : state.openIDs,
      current: this.#highlightControlled ? values.highlightedValue as ID | null : state.cursor.current,
    }, this.#policies));
  }

  public handleEvent(
    event: AccordionEvent<ID>,
    expectedRevision?: number,
  ): RevisionResult<AccordionState<ID>, AccordionEffect<ID>> {
    return this.#runtime.handle(event, expectedRevision);
  }
}

class DOMAccordionConnection<ID extends StableID> implements AccordionConnection<ID> {
  readonly #options: AccordionOptions<ID> & { readonly controller: AccordionController<ID> };
  readonly #disabledItems: ReadonlySet<ID>;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #click: (event: MouseEvent) => void;

  public constructor(options: AccordionOptions<ID> & { readonly controller: AccordionController<ID> }) {
    this.#options = options;
    this.#disabledItems = new Set(options.disabledItems ?? []);
    this.setRootAttributes(options.label);
    this.#keydown = (event): void => {
      const semantic = toAccordionEvent<ID>(event);
      if (semantic === null) return;
      event.preventDefault();
      this.handleEvent(semantic);
    };
    this.#click = (event): void => {
      const id = findDelegatedID(event.target, options.root, 'accordionId');
      if (id !== null) this.handleEvent({ type: 'toggle', id: id as ID });
    };
    options.root.addEventListener('keydown', this.#keydown);
    options.root.addEventListener('click', this.#click);
  }

  public getSnapshot(): RevisionSnapshot<AccordionState<ID>> { return this.#options.controller.getSnapshot(); }

  public syncControlledValues(
    values: AccordionControlledValues<ID>,
  ): Result<RevisionSnapshot<AccordionState<ID>>> {
    const result = this.#options.controller.syncControlledValues({
      ...values,
      ...((values.value ?? values.openIDs) === undefined
        ? {}
        : { value: values.value ?? values.openIDs }),
    });
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }

  public setRootAttributes(label = this.#options.label): void {
    applyAttributes(this.#options.root, getAccordionRootAttributes({
      ...(this.#options.disabled === undefined ? {} : { disabled: this.#options.disabled }),
      ...(this.#options.readOnly === undefined ? {} : { readOnly: this.#options.readOnly }),
      ...(label === undefined ? {} : { label }),
    }));
    setInteractionAttributes(this.#options.root, this.#options);
  }

  public setTriggerAttributes(
    element: HTMLElement,
    attributes: AccordionTriggerAttributes<ID>,
  ): void {
    element.dataset['accordionId'] = String(attributes.id);
    applyAttributes(element, getAccordionTriggerAttributes(
      this.getSnapshot().state,
      attributes,
      {
        disabled: this.#options.disabled || this.#disabledItems.has(attributes.id),
        ...(this.#options.readOnly === undefined ? {} : { readOnly: this.#options.readOnly }),
        native: element.tagName === 'BUTTON' || 'disabled' in element,
      },
    ));
  }

  public setHeaderAttributes(
    element: HTMLElement,
    id: ID,
    panelID?: string,
    disabled = false,
  ): void {
    this.setTriggerAttributes(element, {
      id,
      ...(panelID === undefined ? {} : { panelID }),
      disabled,
    });
  }

  public setPanelAttributes(
    element: HTMLElement,
    id: ID,
    attributes: AccordionPanelAttributesOptions | string = {},
  ): void {
    applyAttributes(element, getAccordionPanelAttributes(
      this.getSnapshot().state,
      id,
      typeof attributes === 'string' ? { triggerID: attributes } : attributes,
    ));
  }

  public handleEvent(event: AccordionEvent<ID>): boolean {
    const result = this.#options.controller.handleEvent(event);
    if (result.ok) {
      queueMicrotask(() => focusCurrent(this.#options.root, result.snapshot.state.cursor.current));
      this.#options.onUpdate?.();
    }
    return result.ok;
  }

  public disconnect(): void {
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.root.removeEventListener('click', this.#click);
  }
}

function accordionPolicies<ID extends StableID>(
  options: AccordionControllerOptions<ID>,
  disabledItems: ReadonlySet<ID>,
): AccordionPolicies<ID> {
  const suppliedEligibility = options.policies?.eligible;
  return Object.freeze({
    ...options.policies,
    expansion: options.expansion ?? options.policies?.expansion ?? 'single',
    collapsible: options.collapsible ?? options.policies?.collapsible ?? true,
    eligible: (id: ID) => !disabledItems.has(id) && (suppliedEligibility?.(id) ?? true),
  });
}

function accordionIntent<ID extends StableID>(event: AccordionEvent<ID>): 'navigate' | 'mutate' {
  return (typeof event === 'string' && ['next', 'previous', 'first', 'last'].includes(event))
    || (typeof event === 'object' && event.type === 'focus')
    ? 'navigate'
    : 'mutate';
}

function focusCurrent(root: HTMLElement, id: StableID | null): void {
  if (id === null) return;
  for (const element of root.querySelectorAll<HTMLElement>('[data-accordion-id]')) {
    if (element.dataset['accordionId'] === String(id)) element.focus();
  }
}

function applyAttributes(
  element: HTMLElement,
  attributes: Readonly<Record<string, string | number | boolean | undefined>>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'disabled' && 'disabled' in element) {
      (element as HTMLButtonElement).disabled = value === true;
      continue;
    }
    if (name === 'hidden') {
      element.hidden = value === true;
      continue;
    }
    if (name === 'tabindex') {
      element.tabIndex = Number(value ?? 0);
      continue;
    }
    if (value === undefined || value === false) element.removeAttribute(name);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
}

function sameIDs<ID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
