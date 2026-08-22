import { createEditable, type EditableConnection } from '@sectile/dom/editable';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const editableDemo: DemoDefinition = {
  id: 'editable',
  label: 'Editable',
  title: 'Editable',
  description: 'Inline text editing with separate draft, commit, cancel, validation, and controlled ownership.',
  shortcuts: [{ keys: ['Enter'], label: 'edit or save' }, { keys: ['Escape'], label: 'cancel' }],
  cases: [
    { id: 'basic', title: 'Release title', mount: (context) => mountEditable(context, 'Sectile 0.1', false, false) },
    { id: 'validated', title: 'Validated slug', mount: (context) => mountEditable(context, 'sectile-core', false, true) },
    { id: 'controlled', title: 'Controlled label', mount: (context) => mountEditable(context, 'Production', true, false) },
  ],
};

function mountEditable(context: DemoContext, initial: string, controlled: boolean, validated: boolean): DemoSession {
  const root = document.createElement('div'); root.className = 'editable-demo'; root.dataset['editable'] = '';
  const preview = document.createElement('span'); preview.className = 'editable-preview'; preview.dataset['editablePreview'] = '';
  const input = document.createElement('input'); input.className = 'editable-input'; input.dataset['editableInput'] = '';
  const actions = document.createElement('div'); actions.className = 'editable-actions';
  const edit = button('Edit'); edit.dataset['editableEdit'] = '';
  const save = button('Save'); save.dataset['editableSubmit'] = '';
  const cancel = button('Cancel'); cancel.dataset['editableCancel'] = '';
  const hint = document.createElement('p'); hint.className = 'input-status';
  actions.append(edit, save, cancel); root.append(preview, input, actions, hint); context.surface.append(root);

  let value = initial;
  let connection!: EditableConnection;
  connection = createEditable({
    root, preview, input, editTrigger: edit, submitTrigger: save, cancelTrigger: cancel,
    ...context.interaction,
    ...(controlled
      ? { value, onValueChange: (next) => { value = next; queueMicrotask(() => connection.syncControlledValue(value)); } }
      : { defaultValue: initial }),
    ...(validated ? { policies: { allowEmpty: false, normalize: (draft: string) => draft.trim().toLowerCase(), validate: (draft: string) => /^[a-z0-9-]+$/.test(draft) } } : {}),
    label: validated ? 'Package slug' : 'Release title',
    name: validated ? 'slug' : 'title',
    onUpdate: render,
  });

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    preview.textContent = state.value;
    hint.textContent = state.editing ? 'Enter saves · Escape cancels' : validated ? 'Lowercase letters, numbers, and hyphens' : 'Click the value or Edit';
    context.showState(revision, { value: state.value, draft: state.draft, editing: state.editing, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => (connection.getSnapshot().state.editing ? input : preview).focus(), disconnect: () => connection.disconnect() };
}

function button(label: string): HTMLButtonElement {
  const element = document.createElement('button'); element.type = 'button'; element.textContent = label; return element;
}
