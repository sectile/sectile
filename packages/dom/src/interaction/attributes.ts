import type { InteractionStateInput } from '@sectile/core/interaction';

interface ValidationResult {
  readonly ok: boolean;
  readonly error?: { readonly message: string };
}

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

export function setFieldValidity(
  input: HTMLInputElement,
  result: ValidationResult,
): void {
  const message = !result.ok ? result.error?.message ?? 'The value is invalid.' : '';
  input.setAttribute('aria-invalid', String(message.length > 0));
  (input as Partial<HTMLInputElement>).setCustomValidity?.(message);
}
