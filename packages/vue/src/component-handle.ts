/** A stable public view with caller-owned attachment and cleanup. */
export interface ComponentHandle<Control, View> {
  readonly view: View;
  set(value: Control | null): void;
  release(): void;
}

/** Project methods through `current`; do not capture a mounted control in the view. */
export function createComponentHandle<Control, View>(
  project: (current: () => Control | null) => View,
): ComponentHandle<Control, View> {
  let current: Control | null = null;
  return {
    view: project(() => current),
    set(value) { current = value; },
    release() { current = null; },
  };
}
