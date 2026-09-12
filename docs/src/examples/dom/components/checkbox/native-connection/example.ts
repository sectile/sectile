import { createCheckbox } from '@sectile/dom/checkbox';

export function mountExample(root: HTMLElement): () => void {
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  const text = document.createTextNode(' Deployment notifications');
  const status = document.createElement('p');
  const output = document.createElement('output');

  checkbox.type = 'checkbox';
  output.value = 'false';
  label.append(checkbox, text);
  status.append('Connection value: ', output);
  root.replaceChildren(label, status);

  const connection = createCheckbox({
    element: checkbox,
    defaultValue: false,
    onValueChange(value) {
      output.value = String(value);
    },
  });

  return () => {
    connection.destroy();
    root.replaceChildren();
  };
}
