import { createCascadeSelect, type CascadeSelectConnection } from '@sectile/dom/cascade-select';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const nodes = [
  { id: 'asia', parentID: null }, { id: 'europe', parentID: null }, { id: 'america', parentID: null },
  { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' }, { id: 'fr', parentID: 'europe' }, { id: 'us', parentID: 'america' },
  { id: 'seoul', parentID: 'kr' }, { id: 'busan', parentID: 'kr' }, { id: 'tokyo', parentID: 'jp' }, { id: 'paris', parentID: 'fr' }, { id: 'nyc', parentID: 'us' },
] as const;
const labels: Readonly<Record<string, string>> = { asia: 'Asia', europe: 'Europe', america: 'Americas', kr: 'South Korea', jp: 'Japan', fr: 'France', us: 'United States', seoul: 'Seoul', busan: 'Busan', tokyo: 'Tokyo', paris: 'Paris', nyc: 'New York' };

export const cascadeSelectDemo: DemoDefinition = {
  id: 'cascade-select', label: 'Cascade Select', title: 'Cascade Select', description: 'Progressive tree selection exposes one sibling column per chosen branch and commits a terminal value.',
  shortcuts: [{ keys: ['↑', '↓'], label: 'move' }, { keys: ['←', '→'], label: 'change level' }, { keys: ['Enter'], label: 'choose' }],
  cases: [
    { id: 'location', title: 'Location hierarchy', mount: (context) => mountCascade(context, { defaultValue: 'seoul' }) },
    { id: 'disabled', title: 'Unavailable destination', mount: (context) => mountCascade(context, { disabledItems: ['jp', 'tokyo'] }) },
    { id: 'controlled', title: 'Controlled destination', mount: (context) => mountCascade(context, { controlled: true, defaultValue: 'paris' }) },
  ],
};

function mountCascade(context: DemoContext, options: { readonly defaultValue?: string; readonly disabledItems?: readonly string[]; readonly controlled?: boolean }): DemoSession {
  const root = document.createElement('div'); root.className = 'cascade-select-demo'; const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'secondary cascade-select-trigger'; const popup = document.createElement('div'); popup.className = 'cascade-select-content'; root.append(trigger, popup); context.surface.append(root);
  let controlledValue = options.defaultValue ?? null; let connection!: CascadeSelectConnection<string>;
  connection = createCascadeSelect({ root, trigger, popup, nodes, disabledItems: options.disabledItems ?? [], ...(options.controlled === true ? { value: controlledValue } : { defaultValue: controlledValue }), label: 'Destination', onValueChange: (value) => { controlledValue = value; if (options.controlled === true) connection.syncControlledValues({ value }); }, onUpdate: render });
  function render(): void { const snapshot = connection.getSnapshot(); const valuePath = connection.getValuePath(); trigger.textContent = valuePath.length === 0 ? 'Choose a destination' : valuePath.map((id) => labels[id] ?? id).join(' / '); popup.replaceChildren(); connection.getColumns().forEach((items, depth) => { const column = document.createElement('div'); column.className = 'cascade-select-column'; connection.setColumnAttributes(column, depth === 0 ? null : snapshot.state.path[depth - 1] ?? null); for (const id of items) { const item = document.createElement('button'); item.type = 'button'; item.className = 'cascade-select-item'; item.textContent = labels[id] ?? id; if (connection.tree.isLeaf(id) === false) item.textContent += ' ›'; connection.setItemAttributes(item, id, options.disabledItems?.includes(id)); column.append(item); } popup.append(column); }); context.showState(snapshot.revision, { value: snapshot.state.value, path: snapshot.state.path, highlighted: snapshot.state.highlighted, open: snapshot.state.open, ownership: options.controlled === true ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => trigger.focus(), disconnect: () => connection.disconnect() };
}
