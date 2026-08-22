import { createTreeView, type TreeViewConnection } from '@sectile/dom/tree-view';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, eventLabel, type DemoContext, type DemoDefinition, type DemoSession } from '../playground.js';

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
type NodeID = typeof nodes[number]['id'];

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
  cases: [
    { id: 'expanded', title: 'Expanded source explorer', mount: (context) => mountTreeView(context, { expanded: ['src', 'components'], selected: [], disabled: [], controlled: false }) },
    { id: 'collapsed', title: 'Collapsed workspace roots', mount: (context) => mountTreeView(context, { expanded: [], selected: ['readme'], disabled: [], controlled: false }) },
    { id: 'multiple', title: 'Multiple file selection', mount: (context) => mountTreeView(context, { expanded: ['src', 'components', 'utils'], selected: ['button', 'format'], disabled: [], controlled: false }) },
    { id: 'unavailable', title: 'Unavailable subtree', mount: (context) => mountTreeView(context, { expanded: ['src'], selected: [], disabled: ['utils'], controlled: false }) },
    { id: 'controlled', title: 'Controlled source explorer', mount: (context) => mountTreeView(context, { expanded: ['src'], selected: ['readme'], disabled: [], controlled: true }) },
  ],
};

function mountTreeView(context: DemoContext, scenario: { readonly expanded: readonly NodeID[]; readonly selected: readonly NodeID[]; readonly disabled: readonly NodeID[]; readonly controlled: boolean }): DemoSession {
    const root = document.createElement('div');
    root.className = 'tree-view';
    context.surface.append(root);
    let externalExpanded = [...scenario.expanded]; let externalSelected = [...scenario.selected]; let externalHighlight: NodeID | null = 'src';
    let connection!: TreeViewConnection<NodeID>;
    connection = unwrap(createTreeView({
      nodes,
      root,
      ...context.interaction,
      disabledItems: scenario.disabled,
      ...(scenario.controlled ? {
        expandedValue: externalExpanded, value: externalSelected, highlightedValue: externalHighlight,
        onExpandedValueChange: ({ value }) => { externalExpanded = [...value]; queueMicrotask(syncControlled); },
        onValueChange: ({ value }) => { externalSelected = [...value]; queueMicrotask(syncControlled); },
        onHighlightedValueChange: ({ value }) => { externalHighlight = value; queueMicrotask(syncControlled); },
      } : { defaultExpandedValue: scenario.expanded, defaultValue: scenario.selected, defaultHighlightedValue: externalHighlight }),
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
        if (scenario.disabled.includes(id)) item.classList.add('disabled');
        item.style.paddingLeft = `${0.75 + depth * 1.35}rem`;
        connection.setItemAttributes(item, { id });
        const disclosure = document.createElement('span');
        disclosure.className = 'disclosure';
        disclosure.textContent = leaf ? '·' : state.expansion.has(id) ? '▾' : '▸';
        if (!leaf) connection.setDisclosureAttributes(disclosure, id);
        else disclosure.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = labels.get(id) ?? id;
        item.append(disclosure, label);
        root.append(item);
      }
      context.showState(revision, {
        current: state.cursor.current,
        selected: state.selection.selected,
        expanded: state.expansion.ids,
        ownership: scenario.controlled ? 'controlled' : 'uncontrolled',
        disabled: scenario.disabled,
      });
    }

    function syncControlled(): void { connection.syncControlledValues({ expandedValue: externalExpanded, value: externalSelected, highlightedValue: externalHighlight }); }

    render();
    return { focus: () => connection.focusCurrent(), disconnect: () => connection.disconnect() };
}
