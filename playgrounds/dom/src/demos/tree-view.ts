import { createTreeView } from '@sectile/dom/tree-view';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, type DemoDefinition } from '../playground.js';

const nodes = [
  { id: 'src', parentID: null },
  { id: 'components', parentID: 'src' },
  { id: 'button', parentID: 'components' },
  { id: 'dialog', parentID: 'components' },
  { id: 'utils', parentID: 'src' },
  { id: 'format', parentID: 'utils' },
  { id: 'readme', parentID: null },
] as const;
const labels = new Map([
  ['src', 'src'], ['components', 'components'], ['button', 'button.ts'], ['dialog', 'dialog.ts'],
  ['utils', 'utils'], ['format', 'format.ts'], ['readme', 'README.md'],
]);

export const treeViewDemo: DemoDefinition = {
  id: 'tree-view',
  label: 'Tree view',
  title: 'Source explorer',
  description: 'Explore hierarchical data with expansion, selection, and visible projection.',
  shortcuts: [
    { keys: ['↑', '↓'], label: 'move' },
    { keys: ['←', '→'], label: 'collapse / expand' },
    { keys: ['Space'], label: 'select' },
  ],
  mount(context) {
    const root = document.createElement('div');
    root.className = 'tree-view';
    context.surface.append(root);
    const connection = unwrap(createTreeView({
      nodes,
      root,
      defaultExpandedValue: ['src', 'components'],
      defaultHighlightedValue: 'src',
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
      connection.setTreeAttributes('Source files');
      for (const id of connection.tree.visible(state.expansion).ids) {
        const item = document.createElement('div');
        const depth = connection.tree.depthOf(id) ?? 0;
        const leaf = connection.tree.isLeaf(id);
        item.className = [
          'tree-item',
          state.cursor.current === id ? 'current' : '',
          state.selection.has(id) ? 'selected' : '',
        ].filter(Boolean).join(' ');
        item.style.paddingLeft = `${0.75 + depth * 1.35}rem`;
        connection.setItemAttributes(item, { id });
        const disclosure = document.createElement('span');
        disclosure.className = 'disclosure';
        disclosure.textContent = leaf ? '·' : state.expansion.has(id) ? '▾' : '▸';
        const label = document.createElement('span');
        label.textContent = labels.get(id) ?? id;
        item.append(disclosure, label);
        root.append(item);
      }
      context.showState(revision, {
        current: state.cursor.current,
        selected: state.selection.selected,
        expanded: state.expansion.ids,
      });
    }

    render();
    return { focus: () => connection.focusCurrent(), disconnect: () => connection.disconnect() };
  },
};
