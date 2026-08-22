import { createListbox } from '@sectile/dom/listbox';
import { Check, createElement, LockKeyhole } from 'lucide';
import {
  effectLabels,
  eventLabel,
  type DemoCaseDefinition,
  type DemoContext,
  type DemoDefinition,
  type DemoSession,
} from '../playground.js';

const items = [
  { id: 'alpha', label: 'Alpha release', detail: 'Stable channel' },
  { id: 'beta', label: 'Beta release', detail: 'Preview channel' },
  { id: 'nightly', label: 'Nightly build', detail: 'Latest changes' },
  { id: 'legacy', label: 'Legacy build', detail: 'Maintenance only' },
] as const;

type ItemID = typeof items[number]['id'];

interface ListboxCaseOptions {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly selectionMode: 'single' | 'multiple';
  readonly defaultValue?: readonly ItemID[];
  readonly disabledItems?: readonly ItemID[];
  readonly selectionFollowsFocus?: boolean;
  readonly controlled?: boolean;
}

const cases: readonly ListboxCaseOptions[] = [
  {
    id: 'single',
    title: 'Single selection & typeahead',
    description: 'One release at a time. Type a label prefix; Legacy is unavailable.',
    selectionMode: 'single',
    defaultValue: ['alpha'],
    disabledItems: ['legacy'],
  },
  {
    id: 'multiple',
    title: 'Multiple selection',
    description: 'Space or click toggles independent choices without collapsing the set.',
    selectionMode: 'multiple',
    defaultValue: ['alpha', 'nightly'],
  },
  {
    id: 'follow-focus',
    title: 'Selection follows focus',
    description: 'Moving the cursor immediately replaces the single selected value.',
    selectionMode: 'single',
    defaultValue: ['beta'],
    selectionFollowsFocus: true,
  },
  {
    id: 'controlled',
    title: 'Controlled selection',
    description: 'The application accepts each proposed selection and can clear it externally.',
    selectionMode: 'multiple',
    defaultValue: ['beta'],
    controlled: true,
  },
];

export const listboxDemo: DemoDefinition = {
  id: 'listbox',
  label: 'Listbox',
  title: 'Listbox',
  description: 'Single and multiple selection, disabled options, typeahead, and controlled ownership.',
  shortcuts: [
    { keys: ['↑', '↓'], label: 'move' },
    { keys: ['Home', 'End'], label: 'edges' },
    { keys: ['Type'], label: 'find' },
    { keys: ['Space'], label: 'select' },
    { keys: ['Enter'], label: 'activate' },
    { keys: ['Esc'], label: 'clear' },
  ],
  cases: cases.map((options): DemoCaseDefinition => ({
    id: options.id,
    title: options.title,
    mount: (context) => mountListboxCase(context, options),
  })),
};

function mountListboxCase(
  context: DemoContext,
  options: ListboxCaseOptions,
): DemoSession {
  const layout = document.createElement('div');
  layout.className = 'listbox-example';
  layout.dataset['mode'] = options.selectionMode;
  const intro = document.createElement('div');
  intro.className = 'listbox-intro';
  const description = document.createElement('p');
  description.className = 'demo-copy';
  description.textContent = options.description;
  const mode = document.createElement('span');
  mode.className = 'listbox-mode';
  mode.textContent = options.selectionMode === 'single' ? 'Single select' : 'Multi select';
  intro.append(description, mode);
  const root = document.createElement('div');
  root.className = 'option-list listbox-options';
  layout.append(intro, root);
  context.surface.append(layout);

  let activated: ItemID | null = null;
  let externalValue = [...(options.defaultValue ?? [])];
  const connection = createListbox({
    items: items.map((item) => item.id),
    root,
    ...context.interaction,
    label: options.title,
    selectionMode: options.selectionMode,
    ...(options.disabledItems === undefined ? {} : { disabledItems: options.disabledItems }),
    typeahead: { textValue: (id) => items.find((item) => item.id === id)?.label ?? id },
    policies: { selectionFollowsFocus: options.selectionFollowsFocus ?? false },
    ...(options.controlled
      ? { value: externalValue }
      : options.defaultValue === undefined ? {} : { defaultValue: options.defaultValue }),
    defaultHighlightedValue: options.defaultValue?.[0] ?? 'alpha',
    ...(options.controlled ? { onValueChange: ({ value }: { readonly value: readonly ItemID[] }) => {
        externalValue = [...value];
        queueMicrotask(() => connection.syncControlledValues({ value: externalValue }));
      } } : {}),
    onActivate: (id) => { activated = id; },
    onTransition: ({ event, result }) => context.record({
      revision: result.snapshot.revision,
      event: eventLabel(event),
      accepted: result.ok,
      effects: effectLabels(result.commands),
    }),
    onUpdate: render,
  });

  if (options.controlled) {
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'secondary compact-control';
    clear.textContent = 'Clear externally';
    clear.addEventListener('click', () => {
      externalValue = [];
      connection.syncControlledValues({ value: externalValue });
    });
    layout.append(clear);
  }

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    root.replaceChildren();
    for (const item of items) {
      const element = document.createElement('div');
      const current = state.cursor.current === item.id;
      const selected = state.selection.has(item.id);
      const disabled = options.disabledItems?.includes(item.id) ?? false;
      element.className = [
        'option-row', current ? 'current' : '', selected ? 'selected' : '', disabled ? 'disabled' : '',
      ].filter(Boolean).join(' ');
      connection.setItemAttributes(element, { id: item.id });
      const copy = document.createElement('span');
      copy.className = 'option-copy';
      const label = document.createElement('strong');
      label.textContent = item.label;
      const detail = document.createElement('small');
      detail.textContent = item.detail;
      copy.append(label, detail);
      const marker = document.createElement('span');
      marker.className = 'option-marker';
      if (disabled) {
        marker.append(
          createElement(LockKeyhole, { 'aria-hidden': 'true', height: 14, width: 14 }),
          'Unavailable',
        );
      } else {
        const indicator = document.createElement('span');
        indicator.className = 'option-selection-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        if (selected) {
          if (options.selectionMode === 'multiple') {
            indicator.append(createElement(Check, { height: 14, width: 14 }));
          } else {
            const dot = document.createElement('span');
            dot.className = 'option-selection-dot';
            indicator.append(dot);
          }
        }
        marker.append(indicator);
      }
      element.append(copy, marker);
      root.append(element);
    }
    context.showState(revision, {
      mode: options.selectionMode,
      ownership: options.controlled ? 'controlled' : 'uncontrolled',
      current: state.cursor.current,
      selected: state.selection.selected,
      activated,
    });
  }

  render();
  return { focus: () => connection.focusCurrent(), disconnect: () => connection.disconnect() };
}
