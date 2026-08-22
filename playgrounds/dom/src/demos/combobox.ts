import { createCombobox } from '@sectile/dom/combobox';
import { unwrap } from '@sectile/core/result';
import { createTextEditingState, type TextEditingState } from '@sectile/core/text';
import { effectLabels, eventLabel, type DemoContext, type DemoDefinition, type DemoSession } from '../playground.js';

const items = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'alpine', label: 'Alpine' },
  { id: 'beta', label: 'Beta' },
  { id: 'gamma', label: 'Gamma' },
  { id: 'hangul', label: '한글' },
] as const;
type ItemID = typeof items[number]['id'];

export const comboboxDemo: DemoDefinition = {
  id: 'combobox',
  label: 'Combobox',
  title: 'Command search',
  description: 'Filter candidates, navigate the popup, and accept a value without breaking IME input.',
  shortcuts: [
    { keys: ['Type'], label: 'filter' },
    { keys: ['↑', '↓'], label: 'move' },
    { keys: ['Enter'], label: 'accept' },
    { keys: ['Esc'], label: 'close' },
  ],
  cases: [
    { id: 'prefix', title: 'Prefix command search', mount: (context) => mountCombobox(context, { mode: 'prefix', initial: '', controlled: false }) },
    { id: 'contains', title: 'Contains matching', mount: (context) => mountCombobox(context, { mode: 'contains', initial: 'a', controlled: false }) },
    { id: 'ime', title: 'Korean IME search', mount: (context) => mountCombobox(context, { mode: 'prefix', initial: '한', controlled: false }) },
    { id: 'controlled', title: 'Controlled command search', mount: (context) => mountCombobox(context, { mode: 'prefix', initial: '', controlled: true }) },
  ],
};

function mountCombobox(context: DemoContext, scenario: { readonly mode: 'prefix' | 'contains'; readonly initial: string; readonly controlled: boolean }): DemoSession {
    const wrap = document.createElement('div');
    wrap.className = 'combobox-demo';
    const input = document.createElement('input');
    input.className = 'text-input';
    input.placeholder = 'Try “al” or “한”…';
    input.autocomplete = 'off';
    const popup = document.createElement('div');
    popup.id = `command-search-popup-${context.instanceID}`;
    popup.className = 'combobox-popup';
    wrap.append(input, popup);
    context.surface.append(wrap);
    let accepted: ItemID | null = null;
    const initialInput = unwrap(createTextEditingState(scenario.initial, { anchorCodeUnitOffset: scenario.initial.length, focusCodeUnitOffset: scenario.initial.length }));
    let externalValue: ItemID | null = null; let externalInput: TextEditingState = initialInput; let externalOpen = scenario.initial.length > 0; let externalHighlight: ItemID | null = null;
    let connection = createCombobox<ItemID>({
      items,
      input,
      popup,
      ...context.interaction,
      policies: { matches: (label, query) => match(label, query, scenario.mode) },
      ...(scenario.controlled ? {
        value: externalValue, inputState: externalInput, open: externalOpen, highlightedValue: externalHighlight,
        onValueChange: ({ value }) => { externalValue = value; queueMicrotask(syncControlled); },
        onInputStateChange: ({ value }) => { externalInput = value; queueMicrotask(syncControlled); },
        onOpenChange: ({ value }) => { externalOpen = value; queueMicrotask(syncControlled); },
        onHighlightedValueChange: ({ value }) => { externalHighlight = value; queueMicrotask(syncControlled); },
      } : { defaultInputState: initialInput, defaultOpen: scenario.initial.length > 0 }),
      onAccept: (id) => { accepted = id; },
      onTransition: ({ event, result }) => context.record({
        revision: result.snapshot.revision,
        event: eventLabel(event),
        accepted: result.ok,
        effects: effectLabels(result.commands),
      }),
      onUpdate: render,
    });

    function render(): void {
      const { revision, state } = connection.getSnapshot();
      const query = state.text.snapshot.text;
      popup.replaceChildren();
      for (const item of items.filter((candidate) => match(candidate.label, query, scenario.mode))) {
        const element = document.createElement('div');
        element.className = [
          'combobox-option',
          state.cursor.current === item.id ? 'current' : '',
          state.selection.has(item.id) ? 'selected' : '',
        ].filter(Boolean).join(' ');
        element.textContent = item.label;
        connection.setItemAttributes(element, { id: item.id });
        popup.append(element);
      }
      connection.render();
      connection.setInputAttributes('Command search');
      connection.setPopupAttributes('Matching commands');
      context.showState(revision, {
        query,
        open: state.popupOpen,
        current: state.cursor.current,
        selected: state.selection.selected,
        accepted,
        composition: state.text.composition,
        matching: scenario.mode,
        ownership: scenario.controlled ? 'controlled' : 'uncontrolled',
      });
    }

    function syncControlled(): void {
      connection.syncControlledValues({ value: externalValue, inputState: externalInput, open: externalOpen, highlightedValue: externalHighlight });
    }

    render();
    return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}

function match(label: string, query: string, mode: 'prefix' | 'contains'): boolean {
  const normalizedLabel = label.toLocaleLowerCase(); const normalizedQuery = query.toLocaleLowerCase();
  return mode === 'prefix' ? normalizedLabel.startsWith(normalizedQuery) : normalizedLabel.includes(normalizedQuery);
}
