interface FormPreparation {
  readonly callbacks: Set<() => boolean>;
  readonly listener: (event: Event) => void;
}

const preparations = new WeakMap<HTMLFormElement, FormPreparation>();

/** One native submission listener per associated form, shared by mounted editors. */
export function bindTemporalSubmit(prepare: () => boolean): (form?: HTMLFormElement | null) => void {
  let active: HTMLFormElement | null = null;
  return (form = null) => {
    if (form === active) return;
    if (active !== null) {
      const old = preparations.get(active)!;
      old.callbacks.delete(prepare);
      if (old.callbacks.size === 0) {
        active.removeEventListener('submit', old.listener, true);
        preparations.delete(active);
      }
    }
    active = form;
    if (form === null) return;
    let entry = preparations.get(form);
    if (entry === undefined) {
      const callbacks = new Set<() => boolean>();
      let running = false;
      const listener = (event: Event): void => {
        if (event.defaultPrevented) return;
        if (running) { event.preventDefault(); return; }
        running = true;
        try {
          for (const resolve of callbacks) if (!resolve()) { event.preventDefault(); break; }
        } catch (error) {
          event.preventDefault();
          throw error;
        } finally { running = false; }
      };
      entry = { callbacks, listener };
      preparations.set(form, entry);
      form.addEventListener('submit', listener, true);
    }
    entry.callbacks.add(prepare);
  };
}
