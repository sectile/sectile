import {
  applyLayerStackEvent,
  createLayerStackState,
  getTopLayer,
  type LayerDismissReason,
  type LayerInput,
  type LayerStackState,
} from '@sectile/core/layer-stack';

type CloseLayer = () => void;

export interface DOMLayerRegistration {
  readonly id: string;
  readonly layer: LayerInput<string>;
  readonly surface: HTMLElement;
  readonly owner: HTMLElement;
  readonly close: CloseLayer;
}

export interface DOMLayerManager {
  register(registration: DOMLayerRegistration): boolean;
  close(id: string): boolean;
  dismiss(id: string, reason: LayerDismissReason): boolean;
  isTop(id: string): boolean;
}

const managers = new WeakMap<object, DOMLayerManager>();
let nextLayerID = 0;

export function createDOMLayerID(): string {
  nextLayerID += 1;
  return `sectile-layer-${nextLayerID}`;
}

export function getDOMLayerManager(root: HTMLElement): DOMLayerManager {
  const key = root.ownerDocument ?? root;
  const existing = managers.get(key);
  if (existing !== undefined) return existing;
  const manager = new ManagedDOMLayers();
  managers.set(key, manager);
  return manager;
}

class ManagedDOMLayers implements DOMLayerManager {
  #state: LayerStackState<string> = createLayerStackState<string>();
  readonly #close = new Map<string, CloseLayer>();
  readonly #surfaces = new Map<string, HTMLElement>();
  readonly #closing = new Set<string>();

  public register(registration: DOMLayerRegistration): boolean {
    if (this.#state.layers.some((layer) => layer.id === registration.id)) return true;
    const parentID = registration.layer.parentID === undefined
      ? this.#implicitParentID(registration.owner)
      : registration.layer.parentID;
    const result = applyLayerStackEvent(this.#state, {
      type: 'open-layer',
      layer: { ...registration.layer, parentID },
    });
    if (!result.ok) return false;
    this.#state = result.value.state;
    this.#close.set(registration.id, registration.close);
    this.#surfaces.set(registration.id, registration.surface);
    return true;
  }

  public close(id: string): boolean {
    if (this.#closing.has(id)) return true;
    const result = applyLayerStackEvent(this.#state, { type: 'close-layer', id });
    if (!result.ok) return false;
    this.#state = result.value.state;
    this.#executeClosures(result.value.commands.map((command) => command.id), id);
    return true;
  }

  public dismiss(id: string, reason: LayerDismissReason): boolean {
    if (!this.isTop(id)) return false;
    const result = applyLayerStackEvent(this.#state, { type: 'dismiss-top', reason });
    if (!result.ok || result.value.commands.length === 0) return false;
    this.#state = result.value.state;
    this.#executeClosures(result.value.commands.map((command) => command.id));
    return true;
  }

  public isTop(id: string): boolean {
    return getTopLayer(this.#state)?.id === id;
  }

  #implicitParentID(owner: HTMLElement): string | null {
    for (let index = this.#state.layers.length - 1; index >= 0; index -= 1) {
      const layer = this.#state.layers[index]!;
      if (this.#surfaces.get(layer.id)?.contains?.(owner) === true) return layer.id;
    }
    return null;
  }

  #executeClosures(ids: readonly string[], initiatingID?: string): void {
    // Every callback completes an already-committed closure; drain before rethrowing.
    let failed = false;
    let firstError: unknown;
    for (const id of ids) {
      const close = this.#close.get(id);
      this.#close.delete(id);
      this.#surfaces.delete(id);
      if (id === initiatingID || close === undefined) continue;
      this.#closing.add(id);
      try {
        close();
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
        }
      } finally {
        this.#closing.delete(id);
      }
    }
    if (failed) throw firstError;
  }
}
