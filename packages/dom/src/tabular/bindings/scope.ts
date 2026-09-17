
export class BindingScope {
  readonly #disposers = new Set<() => void>();
  #active = true;

  public get active(): boolean { return this.#active; }

  public retain(dispose: () => void): () => void {
    if (!this.#active) return () => {};
    let retained = true;
    const wrapped = (): void => {
      if (!retained) return;
      retained = false;
      this.#disposers.delete(wrapped);
      dispose();
    };
    this.#disposers.add(wrapped);
    return wrapped;
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    for (const dispose of [...this.#disposers]) dispose();
    this.#disposers.clear();
  }
}

export function bindEvent<K extends keyof HTMLElementEventMap>(
  scope: BindingScope,
  element: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): () => void {
  const typed = listener as EventListener;
  element.addEventListener(type, typed);
  return scope.retain(() => element.removeEventListener(type, typed));
}

export function clearAttributes(element: HTMLElement, names: readonly string[]): void {
  for (const name of names) element.removeAttribute(name);
}
