import type { InteractionStateInput } from '@sectile/primitives/interaction';

export function setInteractionAttributes(
  element: HTMLElement,
  interaction: InteractionStateInput,
  options: { readonly readOnly?: boolean | undefined; readonly native?: boolean | undefined } = {},
): void {
  const disabled = interaction.disabled ?? false;
  if (disabled) element.setAttribute('aria-disabled', 'true');
  else (element as Partial<HTMLElement>).removeAttribute?.('aria-disabled');

  if (options.native && 'disabled' in element) {
    (element as HTMLButtonElement).disabled = disabled;
  }

  if (options.readOnly) {
    const readOnly = interaction.readOnly ?? false;
    if (readOnly) element.setAttribute('aria-readonly', 'true');
    else (element as Partial<HTMLElement>).removeAttribute?.('aria-readonly');
    if ('readOnly' in element) (element as HTMLInputElement).readOnly = readOnly;
  }
}
