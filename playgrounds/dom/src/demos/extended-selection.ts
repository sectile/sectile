import { createCheckboxGroup, type CheckboxGroupConnection } from '@sectile/dom/checkbox-group';
import { createPagination, type PaginationConnection } from '@sectile/dom/pagination';
import { createRating, type RatingConnection } from '@sectile/dom/rating';
import { createSelect, type SelectConnection } from '@sectile/dom/select';
import { createStepper, type StepperConnection } from '@sectile/dom/stepper';
import { Check, ChevronDown, ChevronLeft, ChevronRight, createElement, Star } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const releaseOptions = [
  { id: 'stable', label: 'Stable', detail: 'Production-ready releases' },
  { id: 'preview', label: 'Preview', detail: 'Release candidates and betas' },
  { id: 'nightly', label: 'Nightly', detail: 'Latest unverified changes' },
] as const;

export const checkboxGroupDemo: DemoDefinition = {
  id: 'checkbox-group', label: 'Checkbox group', title: 'Checkbox group',
  description: 'Independent set membership with disabled choices and controlled ownership.',
  shortcuts: [{ keys: ['↑', '↓'], label: 'move' }, { keys: ['Space'], label: 'toggle choice' }],
  cases: [
    { id: 'release-channels', title: 'Release channels', mount: (context) => mountCheckboxGroup(context, ['stable'], [], false) },
    { id: 'disabled-choice', title: 'Unavailable channel', mount: (context) => mountCheckboxGroup(context, ['stable', 'preview'], ['nightly'], false) },
    { id: 'controlled', title: 'Controlled subscriptions', mount: (context) => mountCheckboxGroup(context, ['preview'], [], true) },
  ],
};

export const selectDemo: DemoDefinition = {
  id: 'select', label: 'Select', title: 'Select',
  description: 'A compact trigger that opens one navigable choice popup.',
  shortcuts: [{ keys: ['Enter', 'Space'], label: 'open / choose' }, { keys: ['↑', '↓'], label: 'move' }, { keys: ['Esc'], label: 'close' }],
  cases: [
    { id: 'environment', title: 'Deployment environment', mount: (context) => mountSelect(context, 'stable', [], false) },
    { id: 'disabled-option', title: 'Restricted environment', mount: (context) => mountSelect(context, 'preview', ['nightly'], false) },
    { id: 'controlled', title: 'Controlled environment', mount: (context) => mountSelect(context, 'nightly', [], true) },
  ],
};

export const paginationDemo: DemoDefinition = {
  id: 'pagination', label: 'Pagination', title: 'Pagination',
  description: 'Direct page selection plus bounded previous and next navigation.',
  shortcuts: [{ keys: ['←', '→'], label: 'move page' }, { keys: ['Home', 'End'], label: 'first / last' }],
  cases: [
    { id: 'compact', title: 'Compact results', mount: (context) => mountPagination(context, 5, '2', false) },
    { id: 'long-range', title: 'Long result set', mount: (context) => mountPagination(context, 9, '5', false) },
    { id: 'controlled', title: 'Controlled page', mount: (context) => mountPagination(context, 7, '3', true) },
  ],
};

export const stepperDemo: DemoDefinition = {
  id: 'stepper', label: 'Stepper', title: 'Stepper',
  description: 'Ordered progress where focus movement and step activation stay separate.',
  shortcuts: [{ keys: ['←', '→'], label: 'move focus' }, { keys: ['Enter', 'Space'], label: 'activate step' }],
  cases: [
    { id: 'checkout', title: 'Checkout progress', mount: (context) => mountStepper(context, 'details', [], false) },
    { id: 'gated-step', title: 'Gated verification', mount: (context) => mountStepper(context, 'details', ['verify'], false) },
    { id: 'controlled', title: 'Controlled onboarding', mount: (context) => mountStepper(context, 'review', [], true) },
  ],
};

export const ratingDemo: DemoDefinition = {
  id: 'rating', label: 'Rating', title: 'Rating',
  description: 'One value on an ordered scale, with optional clearing and controlled ownership.',
  shortcuts: [{ keys: ['←', '→'], label: 'decrease / increase' }, { keys: ['Space'], label: 'set rating' }],
  cases: [
    { id: 'five-star', title: 'Product rating', mount: (context) => mountRating(context, 5, '4', true, false) },
    { id: 'required', title: 'Required feedback', mount: (context) => mountRating(context, 5, '3', false, false) },
    { id: 'controlled', title: 'Controlled score', mount: (context) => mountRating(context, 10, '7', true, true) },
  ],
};

function mountCheckboxGroup(context: DemoContext, initial: readonly string[], disabled: readonly string[], controlled: boolean): DemoSession {
  const root = document.createElement('div'); root.className = 'checkbox-group-demo';
  const intro = demoCopy('Choose every release channel that should notify this workspace.');
  const list = document.createElement('div'); list.className = 'choice-stack';
  const buttons = releaseOptions.map((item) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'choice-card secondary';
    button.append(choiceCopy(item.label, item.detail), marker(Check)); list.append(button); return [item.id, button] as const;
  });
  root.append(intro, list); context.surface.append(root);
  let external = [...initial]; let connection!: CheckboxGroupConnection<string>;
  connection = createCheckboxGroup({ root: list, items: releaseOptions.map(({ id }) => id), disabledItems: disabled, ...context.interaction,
    ...(controlled ? { value: external, highlightedValue: releaseOptions[0].id, onValueChange: ({ value }) => { external = [...value]; queueMicrotask(() => connection.syncControlledValues({ value: external, highlightedValue: connection.getSnapshot().state.cursor.current })); } } : { defaultValue: initial, defaultHighlightedValue: releaseOptions[0].id }),
    onUpdate: render,
  });
  function render(): void { const { revision, state } = connection.getSnapshot(); for (const [id, button] of buttons) { connection.setItemAttributes(button, { id, disabled: disabled.includes(id) }); button.classList.toggle('selected', state.selection.has(id)); button.classList.toggle('current', state.cursor.current === id); } context.showState(revision, { selected: state.selection.selected, current: state.cursor.current, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => buttons[0]?.[1].focus(), disconnect: () => connection.disconnect() };
}

function mountSelect(context: DemoContext, initial: string, disabled: readonly string[], controlled: boolean): DemoSession {
  const root = document.createElement('div'); root.className = 'select-demo';
  const label = document.createElement('span'); label.className = 'field-label'; label.textContent = 'Release channel';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'select-trigger secondary';
  const popup = document.createElement('div'); popup.className = 'select-popup';
  const optionElements = releaseOptions.map((item) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'select-option'; button.append(choiceCopy(item.label, item.detail), marker(Check)); popup.append(button); return [item.id, button] as const; });
  root.append(label, trigger, popup); context.surface.append(root);
  let value = initial; let highlightedValue: string | null = initial; let open = false; let connection!: SelectConnection<string>;
  connection = createSelect({ root, trigger, popup, items: releaseOptions.map(({ id }) => id), disabledItems: disabled, ...context.interaction, label: 'Release channel',
    ...(controlled ? { value, highlightedValue, open, onValueChange: (next) => { value = next ?? value; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); }, onOpenChange: (next) => { open = next; queueMicrotask(sync); } } : { defaultValue: initial, defaultHighlightedValue: initial }), onUpdate: render,
  });
  function sync(): void { connection.syncControlledValues({ value, highlightedValue, open }); }
  function render(): void { const { revision, state } = connection.getSnapshot(); const selected = state.choice.selection.selected[0] ?? null; const selectedItem = releaseOptions.find(({ id }) => id === selected); trigger.replaceChildren(document.createTextNode(selectedItem?.label ?? 'Choose a channel'), createElement(ChevronDown, { 'aria-hidden': 'true', height: 16, width: 16 })); for (const [id, button] of optionElements) { connection.setItemAttributes(button, id, disabled.includes(id)); button.classList.toggle('selected', state.choice.selection.has(id)); button.classList.toggle('current', state.choice.cursor.current === id); } context.showState(revision, { open: state.open, value: selected, current: state.choice.cursor.current, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => trigger.focus(), disconnect: () => connection.disconnect() };
}

function mountPagination(context: DemoContext, count: number, initial: string, controlled: boolean): DemoSession {
  const root = document.createElement('nav'); root.className = 'pagination-demo';
  const previous = iconButton(ChevronLeft, 'Previous page'); const next = iconButton(ChevronRight, 'Next page');
  const pages = Array.from({ length: count }, (_, index) => String(index + 1));
  const pageButtons = pages.map((page) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'page-button secondary'; button.textContent = page; return [page, button] as const; });
  root.append(previous, ...pageButtons.map(([, button]) => button), next); context.surface.append(root);
  let value: string | null = initial; let highlightedValue: string | null = initial; let connection!: PaginationConnection<string>;
  connection = createPagination({ root, items: pages, ...context.interaction, label: 'Result pages', ...(controlled ? { value, highlightedValue, onPageChange: (nextPage: string | null) => { value = nextPage; queueMicrotask(sync); }, onHighlightedValueChange: (nextPage: string | null) => { highlightedValue = nextPage; queueMicrotask(sync); } } : { defaultValue: initial, defaultHighlightedValue: initial }), onUpdate: render });
  previous.addEventListener('click', () => connection.handleEvent('previous-page')); next.addEventListener('click', () => connection.handleEvent('next-page'));
  function sync(): void { connection.syncControlledValues({ value, highlightedValue }); }
  function render(): void { const { revision, state } = connection.getSnapshot(); for (const [page, button] of pageButtons) connection.setPageAttributes(button, page); previous.disabled = context.interaction.disabled === true || state.selection.selected[0] === pages[0]; next.disabled = context.interaction.disabled === true || state.selection.selected[0] === pages.at(-1); context.showState(revision, { page: state.selection.selected[0] ?? null, current: state.cursor.current, pageCount: count, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => pageButtons.find(([page]) => page === initial)?.[1].focus(), disconnect: () => connection.disconnect() };
}

function mountStepper(context: DemoContext, initial: string, disabled: readonly string[], controlled: boolean): DemoSession {
  const steps = [{ id: 'details', label: 'Details', copy: 'Account and delivery information.' }, { id: 'verify', label: 'Verify', copy: 'Review identity and payment checks.' }, { id: 'review', label: 'Review', copy: 'Confirm everything before submission.' }];
  const root = document.createElement('div'); root.className = 'stepper-demo';
  const track = document.createElement('div'); track.className = 'stepper-track';
  const panels = steps.map((step) => { const section = document.createElement('section'); section.id = `${context.instanceID}-${step.id}-panel`; section.className = 'stepper-panel'; const strong = document.createElement('strong'); strong.textContent = step.label; const copy = document.createElement('p'); copy.textContent = step.copy; section.append(strong, copy); return [step.id, section] as const; });
  const buttons = steps.map((step, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'step-button secondary'; button.append(Object.assign(document.createElement('span'), { className: 'step-number', textContent: String(index + 1) }), Object.assign(document.createElement('span'), { textContent: step.label })); track.append(button); return [step.id, button] as const; });
  root.append(track, ...panels.map(([, panel]) => panel)); context.surface.append(root);
  let value: string | null = initial; let highlightedValue: string | null = initial; let connection!: StepperConnection<string>;
  connection = createStepper({ root: track, items: steps.map(({ id }) => id), disabledItems: disabled, ...context.interaction, ...(controlled ? { value, highlightedValue, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } } : { defaultValue: initial, defaultHighlightedValue: initial }), onUpdate: render });
  function sync(): void { connection.syncControlledValues({ value, highlightedValue }); }
  function render(): void { const { revision, state } = connection.getSnapshot(); for (const [id, button] of buttons) { connection.setStepAttributes(button, { id, panelID: `${context.instanceID}-${id}-panel`, disabled: disabled.includes(id) }); button.classList.toggle('complete', steps.findIndex((step) => step.id === id) < steps.findIndex((step) => step.id === state.selection.selected[0])); } for (const [id, panel] of panels) connection.setPanelAttributes(panel, id); context.showState(revision, { step: state.selection.selected[0] ?? null, current: state.cursor.current, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => buttons[0]?.[1].focus(), disconnect: () => connection.disconnect() };
}

function mountRating(context: DemoContext, count: number, initial: string, clearable: boolean, controlled: boolean): DemoSession {
  const values = Array.from({ length: count }, (_, index) => String(index + 1));
  const wrapper = document.createElement('div'); wrapper.className = 'rating-demo';
  const summary = document.createElement('strong'); summary.className = 'rating-summary';
  const root = document.createElement('div'); root.className = 'rating-stars';
  const buttons = values.map((value) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'rating-star'; button.append(createElement(Star, { 'aria-hidden': 'true', height: count > 5 ? 20 : 28, width: count > 5 ? 20 : 28 })); root.append(button); return [value, button] as const; });
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'compact-control secondary'; clear.textContent = 'Clear rating'; clear.hidden = !clearable;
  wrapper.append(summary, root, clear); context.surface.append(wrapper);
  let value: string | null = initial; let highlightedValue: string | null = initial; let connection!: RatingConnection<string>;
  connection = createRating({ root, items: values, ...context.interaction, clearable, ...(controlled ? { value, highlightedValue, onValueChange: (next) => { value = next; queueMicrotask(sync); }, onHighlightedValueChange: (next) => { highlightedValue = next; queueMicrotask(sync); } } : { defaultValue: initial, defaultHighlightedValue: initial }), onUpdate: render });
  clear.addEventListener('click', () => connection.handleEvent('clear'));
  function sync(): void { connection.syncControlledValues({ value, highlightedValue }); }
  function render(): void { const { revision, state } = connection.getSnapshot(); const selected = state.selection.selected[0] ?? null; const numeric = Number(selected ?? 0); for (const [rating, button] of buttons) { connection.setItemAttributes(button, rating); button.classList.toggle('filled', Number(rating) <= numeric); } summary.textContent = selected === null ? 'Not rated' : `${selected} out of ${count}`; clear.disabled = context.interaction.disabled === true || context.interaction.readOnly === true || selected === null; context.showState(revision, { rating: selected, current: state.cursor.current, clearable, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => buttons.find(([rating]) => rating === initial)?.[1].focus(), disconnect: () => connection.disconnect() };
}

function choiceCopy(title: string, detail: string): HTMLElement { const copy = document.createElement('span'); copy.className = 'choice-copy'; const strong = document.createElement('strong'); strong.textContent = title; const small = document.createElement('small'); small.textContent = detail; copy.append(strong, small); return copy; }
function marker(icon: typeof Check): HTMLElement { const value = document.createElement('span'); value.className = 'choice-marker'; value.append(createElement(icon, { 'aria-hidden': 'true', height: 15, width: 15 })); return value; }
function demoCopy(text: string): HTMLParagraphElement { const copy = document.createElement('p'); copy.className = 'demo-copy'; copy.textContent = text; return copy; }
function iconButton(icon: typeof ChevronLeft, label: string): HTMLButtonElement { const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-control secondary'; button.setAttribute('aria-label', label); button.append(createElement(icon, { 'aria-hidden': 'true', height: 17, width: 17 })); return button; }
