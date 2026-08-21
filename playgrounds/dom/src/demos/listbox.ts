import { createListbox } from '@sectile/dom/listbox';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, type DemoDefinition } from '../playground.js';

const items = [
  { id: 'alpha', label: 'Alpha release', detail: 'Stable channel' },
  { id: 'beta', label: 'Beta release', detail: 'Preview channel' },
  { id: 'nightly', label: 'Nightly build', detail: 'Latest changes' },
  { id: 'legacy', label: 'Legacy build', detail: 'Maintenance only' },
] as const;

export const listboxDemo: DemoDefinition = {
  id: 'listbox',
  label: 'Listbox',
  title: 'Release channels',
  description: 'Move, select, and activate a multi-select listbox.',
  shortcuts: [
    { keys: ['↑', '↓'], label: 'move' },
    { keys: ['Space'], label: 'select' },
    { keys: ['Enter'], label: 'activate' },
    { keys: ['Esc'], label: 'clear' },
  ],
  mount(context) {
    const root = document.createElement('div');
    root.className = 'option-list';
    context.surface.append(root);
    let activated: string | null = null;
    const connection = unwrap(createListbox({
      items: items.map((item) => item.id),
      root,
      defaultHighlightedValue: 'alpha',
      onActivate: (id) => { activated = id; },
      onTransition: ({ event, result }) => context.record({
        revision: result.snapshot.revision,
        event,
        accepted: result.ok,
        effects: effectLabels(result.commands),
      }),
      onUpdate: render,
    }));

    function render(): void {
      const { revision, state } = connection.getSnapshot();
      root.replaceChildren();
      connection.setListboxAttributes('Release channels');
      for (const item of items) {
        const element = document.createElement('div');
        const current = state.cursor.current === item.id;
        const selected = state.selection.has(item.id);
        element.className = ['option-row', current ? 'current' : '', selected ? 'selected' : '']
          .filter(Boolean).join(' ');
        connection.setItemAttributes(element, { id: item.id });
        const copy = document.createElement('span');
        copy.innerHTML = `<strong>${item.label}</strong><small>${item.detail}</small>`;
        const marker = document.createElement('span');
        marker.className = 'option-marker';
        marker.textContent = selected ? 'Selected' : '';
        element.append(copy, marker);
        root.append(element);
      }
      context.showState(revision, {
        current: state.cursor.current,
        selected: state.selection.selected,
        activated,
      });
    }

    render();
    return { focus: () => connection.focusCurrent(), disconnect: () => connection.disconnect() };
  },
};
