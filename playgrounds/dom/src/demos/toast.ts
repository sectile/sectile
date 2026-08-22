import { createToast, type ToastConnection } from '@sectile/dom/toast';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const toastDemo: DemoDefinition = {
  id: 'toast', label: 'Toast', title: 'Toast',
  description: 'Queued live-region notifications with variants, persistent items, pause-on-interaction, and visible limits.',
  shortcuts: [{ keys: ['Click'], label: 'create or dismiss' }, { keys: ['Hover', 'Focus'], label: 'pause timeout' }],
  cases: [
    { id: 'automatic', title: 'Automatic notifications', mount: (context) => mountToast(context, { duration: 5_000, maxVisible: 3 }) },
    { id: 'persistent', title: 'Persistent notification', mount: (context) => mountToast(context, { duration: null, maxVisible: 3 }) },
    { id: 'limited', title: 'Limited queue', mount: (context) => mountToast(context, { duration: 8_000, maxVisible: 2 }) },
  ],
};

function mountToast(context: DemoContext, options: { readonly duration: number | null; readonly maxVisible: number }): DemoSession {
  const demo = document.createElement('div'); demo.className = 'toast-demo';
  const actions = document.createElement('div'); actions.className = 'toast-actions';
  const viewport = document.createElement('ol'); viewport.className = 'toast-viewport';
  demo.append(actions, viewport); context.surface.append(demo);
  let sequence = 0; let connection!: ToastConnection<string>;
  connection = createToast({ root: viewport, defaultDurationMs: options.duration, maxVisible: options.maxVisible, onItemsChange: render, onUpdate: showState });
  for (const [label, kind] of [['Save release', 'success'], ['Report warning', 'warning'], ['Report error', 'error']] as const) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.textContent = label;
    button.addEventListener('click', () => { sequence += 1; connection.push({ id: `${kind}-${sequence}`, title: label, description: `Notification ${sequence}`, kind }); render(connection.getSnapshot().state.items); });
    actions.append(button);
  }
  function render(items = connection.getSnapshot().state.items): void {
    viewport.replaceChildren(...items.map((item) => {
      const root = document.createElement('li'); root.className = 'toast-item';
      const copy = document.createElement('div'); const title = document.createElement('strong'); title.textContent = item.title; const description = document.createElement('span'); description.textContent = item.description ?? '';
      const close = document.createElement('button'); close.type = 'button'; close.className = 'icon-control secondary'; close.textContent = '×';
      copy.append(title, description); root.append(copy, close); connection.setToastAttributes(root, item.id); connection.setCloseButtonAttributes(close, item.id); return root;
    }));
    showState();
  }
  function showState(): void { const snapshot = connection.getSnapshot(); context.showState(snapshot.revision, { toasts: snapshot.state.items.map(({ id, kind, remainingMs }) => ({ id, kind, remainingMs })), paused: snapshot.state.paused, maxVisible: options.maxVisible }); }
  render();
  return { focus: () => actions.querySelector('button')?.focus(), disconnect: () => connection.disconnect() };
}
