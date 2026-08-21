import { createCombobox } from '@sectile/dom/combobox';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, eventLabel, type DemoDefinition } from '../playground.js';

const items = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'alpine', label: 'Alpine' },
  { id: 'beta', label: 'Beta' },
  { id: 'gamma', label: 'Gamma' },
  { id: 'hangul', label: '한글' },
] as const;
const matches = (label: string, query: string): boolean =>
  label.toLocaleLowerCase().startsWith(query.toLocaleLowerCase());

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
  mount(context) {
    const wrap = document.createElement('div');
    wrap.className = 'combobox-demo';
    const input = document.createElement('input');
    input.className = 'text-input';
    input.placeholder = 'Try “al” or “한”…';
    input.autocomplete = 'off';
    const popup = document.createElement('div');
    popup.id = 'command-search-popup';
    popup.className = 'combobox-popup';
    wrap.append(input, popup);
    context.surface.append(wrap);
    let accepted: string | null = null;
    const connection = unwrap(createCombobox({
      items,
      input,
      popup,
      policies: { matches },
      onAccept: (id) => { accepted = id; },
      onTransition: ({ event, result }) => context.record({
        revision: result.snapshot.revision,
        event: eventLabel(event),
        accepted: result.ok,
        effects: effectLabels(result.commands),
      }),
      onUpdate: render,
    }));

    function render(): void {
      const { revision, state } = connection.getSnapshot();
      const query = state.text.snapshot.text;
      popup.replaceChildren();
      for (const item of items.filter((candidate) => matches(candidate.label, query))) {
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
      });
    }

    render();
    return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
  },
};
