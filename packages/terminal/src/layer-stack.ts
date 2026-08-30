import {
  applyLayerStackEvent,
  createLayerStackState,
  getTopLayer,
  type LayerDismissReason,
  type LayerInput,
  type LayerStackState,
} from '@sectile/core/layer-stack';
import type { Result } from '@sectile/core/result';

export interface TerminalLayerRegistration {
  readonly layer: LayerInput<string>;
  readonly close: (reason: LayerDismissReason | 'ancestor-closed') => void;
}

export interface TerminalLayerScope {
  readonly state: LayerStackState<string>;
  open(registration: TerminalLayerRegistration): boolean;
  close(id: string): boolean;
  dismissTop(reason: LayerDismissReason): boolean;
  isTop(id: string): boolean;
}

export function createLayerStack(): TerminalLayerScope {
  return new ManagedTerminalLayerScope();
}

export function tryCreateLayerStack(): Result<TerminalLayerScope> {
  return { ok: true, value: createLayerStack() };
}

class ManagedTerminalLayerScope implements TerminalLayerScope {
  #state = createLayerStackState<string>();
  readonly #close = new Map<string, TerminalLayerRegistration['close']>();
  public get state(): LayerStackState<string> { return this.#state; }

  public open(registration: TerminalLayerRegistration): boolean {
    const result = applyLayerStackEvent(this.#state, {
      type: 'open-layer',
      layer: registration.layer,
    });
    if (!result.ok) return false;
    this.#state = result.value.state;
    this.#close.set(registration.layer.id, registration.close);
    return true;
  }

  public close(id: string): boolean {
    const result = applyLayerStackEvent(this.#state, { type: 'close-layer', id });
    if (!result.ok) return false;
    this.#state = result.value.state;
    this.#execute(result.value.commands.map((command) => command.id), id, 'ancestor-closed');
    return true;
  }

  public dismissTop(reason: LayerDismissReason): boolean {
    const result = applyLayerStackEvent(this.#state, { type: 'dismiss-top', reason });
    if (!result.ok || result.value.commands.length === 0) return false;
    this.#state = result.value.state;
    this.#execute(result.value.commands.map((command) => command.id), undefined, reason);
    return true;
  }

  public isTop(id: string): boolean { return getTopLayer(this.#state)?.id === id; }

  #execute(
    ids: readonly string[],
    initiatingID: string | undefined,
    reason: LayerDismissReason | 'ancestor-closed',
  ): void {
    for (const id of ids) {
      const close = this.#close.get(id);
      this.#close.delete(id);
      if (id !== initiatingID) close?.(reason);
    }
  }
}
