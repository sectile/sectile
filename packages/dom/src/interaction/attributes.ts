import type { InteractionStateInput } from '@sectile/core/interaction';

interface ValidationResult {
  readonly ok: boolean;
  readonly error?: { readonly message: string };
}

export interface DOMAttributeBinding {
  apply(values: Readonly<Record<string, string | number | undefined>>): void;
  disconnect(): void;
}
/** Internal bounded part projection; restore only values still owned by this binding. */
export function createDOMAttributeBinding(input: HTMLElement): DOMAttributeBinding {
  let element: HTMLElement | undefined = input;
  const entries = new Map<string, { original: string | null; accepted: string | null }>();
  return {
    apply: values => {
      const target = element; if (!target) return;
      for (const [name, value] of Object.entries(values)) {
        if (element !== target) return;
        const accepted = value === undefined ? null : String(value), actual = target.getAttribute(name);
        if (element !== target) return;
        let entry = entries.get(name);
        if (!entry) { entry = { original: actual, accepted }; entries.set(name, entry); }
        else entry.accepted = accepted;
        if (actual === accepted) continue;
        if (accepted === null) target.removeAttribute(name); else target.setAttribute(name, accepted);
      }
    },
    disconnect: () => {
      const target = element; if (!target) return;
      element = undefined;
      let failed = false, first: unknown;
      try {
        for (const [name, entry] of entries) {
          try {
            if (target.getAttribute(name) !== entry.accepted) continue;
            if (entry.original === null) target.removeAttribute(name); else target.setAttribute(name, entry.original);
          } catch (error) { if (!failed) { failed = true; first = error; } }
        }
      } finally { entries.clear(); }
      if (failed) throw first;
    },
  };
}

/** Decorative markers stay silent; native disclosure buttons expose the owner's state. */
export function setDisclosureAccessibility(element: HTMLElement, expanded: boolean, disabled: boolean): void {
  if (element.tagName !== 'BUTTON') { element.setAttribute('aria-hidden', 'true'); return; }
  element.removeAttribute('aria-hidden');
  element.setAttribute('aria-expanded', String(expanded));
  setInteractionAttributes(element, { disabled }, true);
}

export function setInteractionAttributes(
  element: HTMLElement,
  interaction: InteractionStateInput,
  native = false,
  projectReadOnly = false,
): void {
  const disabled = interaction.disabled ?? false;
  if (disabled) element.setAttribute('aria-disabled', 'true');
  else (element as Partial<HTMLElement>).removeAttribute?.('aria-disabled');

  if (native && 'disabled' in element) {
    (element as HTMLButtonElement).disabled = disabled;
  }

  if (projectReadOnly) {
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
