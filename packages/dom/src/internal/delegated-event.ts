export function findDelegatedID(
  target: EventTarget | null,
  root: HTMLElement,
  key: string,
): string | null {
  let element = target as HTMLElement | null;
  while (element != null && element !== root) {
    const id = element.dataset?.[key];
    if (id !== undefined) return id;
    element = element.parentElement ?? null;
  }
  return root.dataset[key] ?? null;
}
