import {
  applyLayerPresentationEvent,
  createLayerPresentationState,
  createLayerStackState,
  applyLayerStackEvent,
  getTopLayer,
  getInteractiveLayerIDs,
  type LayerDismissReason,
  type LayerInput,
  type LayerPolicy,
  type LayerPresentationState,
} from '@sectile/core/layer-stack';
import { failResult, okResult, SectileResultError, type Result } from '@sectile/core/result';
import type { CoreErrorCode } from '@sectile/core';
import { isEventInside } from '../../interact-outside.js';

export type DOMLayerReparentErrorCode = CoreErrorCode | 'dom.layer-parent-ambiguous' | 'dom.layer-parent-inactive';
export type DOMLayerPresentationErrorCode = 'dom.layer-reentrant' | 'dom.layer-inactive' | 'dom.layer-subscribed';
export type LayerHostErrorCode = 'dom.layer-host-policy' | 'dom.layer-host-conflict' | 'dom.layer-host-unavailable' | 'dom.layer-host-participants' | 'dom.layer-host-capacity' | 'dom.layer-host-stale';
export type LayerHostTransferErrorCode = CoreErrorCode | 'dom.layer-host-unavailable' | 'dom.layer-host-capacity';
export type LayerReservationErrorCode = 'dom.layer-host-unavailable' | 'dom.layer-host-capacity' | 'item-ceiling-exceeded';
declare const layerReservationBrand: unique symbol;
/** One document-owned admission slot. Release is idempotent after consumption. */
export interface LayerReservation {
  readonly [layerReservationBrand]: true;
  release(): void;
}
export interface LayerHostPolicy {
  /** Identity of the complete admitted paint profile. The caller owns CSS admission. */
  readonly key: string;
  /** Number of backdrop/panel pairs, including retained exits. */
  readonly capacity: number;
}
export interface LayerHostConnection {
  readonly active: boolean;
  /** Validate without publication; commit once only while document ownership is unchanged. */
  preparePolicy(policy: LayerHostPolicy, participants: readonly LayerHostConnection[]): Result<() => Result<void, LayerHostErrorCode>, LayerHostErrorCode>;
  /** Atomically update the shared policy with every connected participant's consent. */
  reconfigure(policy: LayerHostPolicy, participants: readonly LayerHostConnection[]): Result<void, LayerHostErrorCode>;
  /** Revoke admission; occupied generations retain their reservation until release. */
  disconnect(): void;
}
interface LayerHostRecord {
  connection: LayerHostConnection | undefined;
  readonly pending: Set<LayerReservation>;
}
interface PendingLayerReservation {
  readonly host: LayerHostRecord | undefined;
  readonly clear: () => void;
}
export interface DOMLayerPresentationSnapshot {
  /** Revision at which this generation's phase or rank last changed. */
  readonly revision: number;
  readonly generation: number;
  readonly phase: 'active' | 'exiting' | 'closed';
  readonly order: number | null;
  /** Filtered document-wide hosted paint rank; absent for headless generations. */
  readonly hostOrder?: number;
}
export type DOMLayerPresentationListener = (snapshot: DOMLayerPresentationSnapshot) => void;
export type DOMLayerPresentationSubscription = Result<() => void, DOMLayerPresentationErrorCode>;
function hostFailure<Code extends LayerHostErrorCode>(code: Code): Result<never, Code> {
  return failResult('transition-rejection', code, 'Document layer host operation rejected.');
}
interface PresentationSubscriber {
  listener: DOMLayerPresentationListener | undefined;
  snapshot: DOMLayerPresentationSnapshot;
}

function presentationFailure(code: DOMLayerPresentationErrorCode): Result<never, DOMLayerPresentationErrorCode> {
  return failResult('transition-rejection', code, 'Layer presentation operation rejected.');
}

type CloseLayer = () => void;
interface LayerEffects { readonly close: CloseLayer; readonly suspend?: () => void }
export type DOMLayerSuspensionErrorCode = CoreErrorCode | 'dom.layer-suspension-unavailable';

export interface DOMLayerRegistration {
  readonly id: string;
  readonly layer: LayerInput<string>;
  readonly surface: HTMLElement;
  readonly owner: HTMLElement;
  readonly close: CloseLayer;
  readonly suspend?: () => void;
  /** Controlled hosts request dismissal before publishing their accepted close. */
  readonly requestDismiss?: (reason: LayerDismissReason) => boolean;
  readonly retainExit?: boolean;
  readonly layerHost?: LayerHostConnection | undefined;
  readonly reservation?: LayerReservation | undefined;
}

export interface DOMLayerManager {
  /** Prepare without publication; the single-use commit rejects a changed source. */
  prepare(registration: DOMLayerRegistration): Result<() => Result<void>>;
  register(registration: DOMLayerRegistration): boolean;
  close(id: string): boolean;
  suspend(id: string): Result<void, DOMLayerSuspensionErrorCode>;
  dismiss(id: string, reason: LayerDismissReason): boolean;
  isTop(id: string): boolean;
  /** The highest modal guards default focus outside all admitted input surfaces. */
  isOutsideInteractiveLayer(id: string, event: Event): boolean;
  getOrder(id: string): number | null;
  assertWritable(): void;
  subscribePresentation(id: string, listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  getGeneration(id: string): number | undefined;
  completeExit(id: string, generation: number): Result<void>;
  reparent(id: string, parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  connectHost(policy: LayerHostPolicy): Result<LayerHostConnection, LayerHostErrorCode>;
  reserve(host: LayerHostConnection | undefined): Result<LayerReservation, LayerReservationErrorCode>;
  releaseReservation(reservation: LayerReservation): void;
  transferHost(id: string, host: LayerHostConnection | undefined, accept: () => void): Result<void, LayerHostTransferErrorCode>;
  configure(id: string, policy: LayerPolicy, accept: () => void): Result<void>;
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
  #state: LayerPresentationState<string> = createLayerPresentationState<string>();
  #interactiveLayers: readonly string[] | undefined;
  readonly #close = new Map<string, LayerEffects>();
  readonly #surfaces = new Map<string, HTMLElement>();
  readonly #dismissRequests = new Map<string, (reason: LayerDismissReason) => boolean>();
  readonly #closing = new Set<string>();
  #orders = new Map<string, number>();
  #generations = new Map<string, number>();
  #presentations = new Map<number, DOMLayerPresentationSnapshot>();
  readonly #subscribers = new Map<number, PresentationSubscriber>();
  readonly #hosts = new Map<LayerHostConnection, LayerHostRecord>();
  readonly #hosted = new Map<number, LayerHostRecord>();
  readonly #reservations = new Map<LayerReservation, PendingLayerReservation>();
  #hostedPending = 0;
  #hostPolicy: LayerHostPolicy | undefined;
  #hostRevision = 0;
  #projectionRevision = 0;
  #notifying = false;

  public connectHost(policy: LayerHostPolicy): Result<LayerHostConnection, LayerHostErrorCode> {
    this.assertWritable();
    if (!this.#validHostPolicy(policy)) return this.#hostFailure('dom.layer-host-policy');
    if (this.#hostPolicy !== undefined && (this.#hostPolicy.key !== policy.key || this.#hostPolicy.capacity !== policy.capacity)) return this.#hostFailure('dom.layer-host-conflict');
    const record: LayerHostRecord = { connection: undefined, pending: new Set() };
    let manager: ManagedDOMLayers | undefined = this;
    const connection: LayerHostConnection = Object.freeze({
      get active() { return record.connection !== undefined; },
      preparePolicy: (next: LayerHostPolicy, participants: readonly LayerHostConnection[]) => manager === undefined ? hostFailure('dom.layer-host-unavailable') : manager.#prepareHostPolicy(connection, next, participants),
      reconfigure: (next: LayerHostPolicy, participants: readonly LayerHostConnection[]) => manager === undefined ? hostFailure('dom.layer-host-unavailable') : manager.#reconfigureHosts(connection, next, participants),
      disconnect: () => {
        const current = manager;
        if (current === undefined) return;
        current.assertWritable();
        for (const reservation of record.pending) current.#releaseReservation(reservation);
        manager = undefined;
        record.connection = undefined;
        current.#hosts.delete(connection);
        current.#hostRevision++;
        current.#retireHostPolicy();
      },
    });
    record.connection = connection;
    this.#hosts.set(connection, record);
    this.#hostPolicy ??= Object.freeze({ key: policy.key, capacity: policy.capacity });
    this.#hostRevision++;
    return okResult<LayerHostConnection, LayerHostErrorCode>(connection);
  }

  #validHostPolicy(policy: LayerHostPolicy): boolean {
    return policy !== null && typeof policy === 'object' && typeof policy.key === 'string' && policy.key.length > 0 && Number.isSafeInteger(policy.capacity) && policy.capacity >= 0;
  }

  public reserve(host: LayerHostConnection | undefined): Result<LayerReservation, LayerReservationErrorCode> {
    this.assertWritable();
    const record = host === undefined ? undefined : this.#hosts.get(host);
    if (host !== undefined && record === undefined) return hostFailure('dom.layer-host-unavailable');
    if (this.#state.presentations.length + this.#reservations.size >= this.#state.maxItems) {
      return failResult('resource-rejection', 'item-ceiling-exceeded', 'Document layer capacity is exhausted.');
    }
    if (record !== undefined && this.#hosted.size + this.#hostedPending >= this.#hostPolicy!.capacity) return hostFailure('dom.layer-host-capacity');
    let manager: ManagedDOMLayers | undefined = this;
    const reservation = Object.freeze({ release: () => {
      if (manager === undefined) return;
      manager.assertWritable();
      manager.#releaseReservation(reservation);
    } }) as LayerReservation;
    this.#reservations.set(reservation, { host: record, clear: () => { manager = undefined; } });
    if (record !== undefined) { record.pending.add(reservation); this.#hostedPending++; }
    this.#hostRevision++;
    return okResult<LayerReservation, LayerReservationErrorCode>(reservation);
  }

  #releaseReservation(reservation: LayerReservation): void {
    const pending = this.#reservations.get(reservation);
    if (pending === undefined) return;
    this.#reservations.delete(reservation);
    if (pending.host !== undefined) { pending.host.pending.delete(reservation); this.#hostedPending--; }
    pending.clear();
    this.#hostRevision++;
    this.#retireHostPolicy();
  }

  public releaseReservation(reservation: LayerReservation): void {
    this.assertWritable();
    this.#releaseReservation(reservation);
  }

  #hostFailure<Code extends LayerHostErrorCode>(code: Code): Result<never, Code> {
    return hostFailure(code);
  }

  #reconfigureHosts(connection: LayerHostConnection, policy: LayerHostPolicy, participants: readonly LayerHostConnection[]): Result<void, LayerHostErrorCode> {
    const prepared = this.#prepareHostPolicy(connection, policy, participants);
    return prepared.ok ? prepared.value() : prepared;
  }

  #prepareHostPolicy(connection: LayerHostConnection, policy: LayerHostPolicy, participants: readonly LayerHostConnection[]): Result<() => Result<void, LayerHostErrorCode>, LayerHostErrorCode> {
    this.assertWritable();
    if (!this.#hosts.has(connection)) return this.#hostFailure('dom.layer-host-unavailable');
    if (!this.#validHostPolicy(policy)) return this.#hostFailure('dom.layer-host-policy');
    if (participants.length !== this.#hosts.size) return this.#hostFailure('dom.layer-host-participants');
    const seen = new Set<LayerHostConnection>();
    for (const participant of participants) {
      if (!this.#hosts.has(participant) || seen.has(participant)) return this.#hostFailure('dom.layer-host-participants');
      seen.add(participant);
    }
    if (policy.capacity < this.#hosted.size + this.#hostedPending) return this.#hostFailure('dom.layer-host-capacity');
    // A retired owner cannot consent to changing CSS while its exit is painted.
    for (const record of this.#hosted.values()) if (record.connection === undefined) return this.#hostFailure('dom.layer-host-unavailable');
    const candidate = Object.freeze({ key: policy.key, capacity: policy.capacity });
    const revision = this.#hostRevision;
    let source: LayerPresentationState<string> | undefined = this.#state;
    let manager: ManagedDOMLayers | undefined = this;
    return okResult<() => Result<void, LayerHostErrorCode>, LayerHostErrorCode>(() => {
      const current = manager;
      if (current === undefined) return hostFailure('dom.layer-host-stale');
      current.assertWritable();
      const expected = source;
      manager = undefined; source = undefined;
      if (expected !== current.#state || revision !== current.#hostRevision) {
        return hostFailure('dom.layer-host-stale');
      }
      if (candidate.key !== current.#hostPolicy?.key || candidate.capacity !== current.#hostPolicy.capacity) {
        current.#hostPolicy = candidate;
        current.#hostRevision++;
      }
      return okResult<void, LayerHostErrorCode>(undefined);
    });
  }

  #retireHostPolicy(): void {
    if (this.#hosts.size === 0 && this.#hosted.size === 0 && this.#hostedPending === 0) this.#hostPolicy = undefined;
  }

  public transferHost(id: string, host: LayerHostConnection | undefined, accept: () => void): Result<void, LayerHostTransferErrorCode> {
    this.assertWritable();
    const target = host === undefined ? undefined : this.#hosts.get(host);
    if (host !== undefined && target === undefined) return this.#hostFailure('dom.layer-host-unavailable');
    const generation = this.#generations.get(id);
    if (generation === undefined) {
      // A closed owner can change its next opening without reserving paint.
      accept();
      return okResult<void, LayerHostTransferErrorCode>(undefined);
    }
    const source = this.#hosted.get(generation);
    if (source === target) { accept(); return okResult<void, LayerHostTransferErrorCode>(undefined); }
    if (source === undefined && target !== undefined && this.#hosted.size + this.#hostedPending >= this.#hostPolicy!.capacity) return this.#hostFailure('dom.layer-host-capacity');
    if (target === undefined) this.#hosted.delete(generation);
    else this.#hosted.set(generation, target);
    this.#hostRevision++;
    // Install the future-open owner before observers see the committed transfer.
    accept();
    try { if (source === undefined || target === undefined) this.#commit(this.#state, [], undefined, true); }
    finally { this.#retireHostPolicy(); }
    return okResult<void, LayerHostTransferErrorCode>(undefined);
  }

  public configure(id: string, policy: LayerPolicy, accept: () => void): Result<void> {
    this.assertWritable();
    if (!this.#orders.has(id)) {
      const checked = applyLayerStackEvent(createLayerStackState([{ id }]), { type: 'configure-layer', id, policy });
      if (!checked.ok) return checked;
      this.#hostRevision++;
      accept(); return okResult(undefined);
    }
    const changed = applyLayerPresentationEvent(this.#state, { type: 'configure-layer', id, policy });
    if (!changed.ok) return changed;
    // Policy changes preserve every paint snapshot and rank; no projection publication is needed.
    this.#state = changed.value.state;
    this.#interactiveLayers = undefined;
    this.#hostRevision++;
    accept(); return okResult(undefined);
  }

  public assertWritable(): void {
    if (this.#notifying) {
      const result = presentationFailure('dom.layer-reentrant');
      if (!result.ok) throw new SectileResultError(result.error);
    }
  }

  public subscribePresentation(id: string, listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription {
    if (this.#notifying) return presentationFailure('dom.layer-reentrant');
    const generation = this.#generations.get(id);
    if (generation === undefined || this.#presentations.get(generation)?.phase !== 'active') return presentationFailure('dom.layer-inactive');
    if (this.#subscribers.has(generation)) return presentationFailure('dom.layer-subscribed');
    const subscriber: PresentationSubscriber = { listener, snapshot: this.#presentations.get(generation)! };
    this.#subscribers.set(generation, subscriber);
    const disconnect = (): void => {
      subscriber.listener = undefined;
      // A stale disposer must not remove a replacement subscriber.
      if (this.#subscribers.get(generation) === subscriber) this.#subscribers.delete(generation);
    };
    this.#notifying = true;
    try { listener(subscriber.snapshot); }
    catch (error) { disconnect(); throw error; }
    finally { this.#notifying = false; }
    return okResult(disconnect);
  }

  public prepare(registration: DOMLayerRegistration): Result<() => Result<void>> {
    this.assertWritable();
    const source = this.#state;
    if (this.#orders.has(registration.id)) return this.#admission(registration, source, source);
    let candidate = this.#state;
    const previousGeneration = this.#generations.get(registration.id);
    const reservation = registration.reservation === undefined ? undefined : this.#reservations.get(registration.reservation);
    if (registration.reservation !== undefined && (reservation === undefined || reservation.host !== (registration.layerHost === undefined ? undefined : this.#hosts.get(registration.layerHost)))) {
      return failResult('transition-rejection', 'layer-presentation-state-invalid', 'The admission reservation is unavailable or belongs to another document or host.');
    }
    const occupied = source.presentations.length + this.#reservations.size - (reservation === undefined ? 0 : 1) - (previousGeneration === undefined ? 0 : 1);
    if (occupied >= source.maxItems) return failResult('resource-rejection', 'item-ceiling-exceeded', 'Document layer capacity is exhausted.');
    if (registration.layerHost !== undefined) {
      if (!this.#hosts.has(registration.layerHost)) return failResult('transition-rejection', 'layer-presentation-state-invalid', 'The layer host is disconnected or belongs to another document.');
      const occupied = this.#hosted.size + this.#hostedPending - (reservation === undefined ? 0 : 1) - (previousGeneration !== undefined && this.#hosted.has(previousGeneration) ? 1 : 0);
      if (occupied >= this.#hostPolicy!.capacity) return failResult('transition-rejection', 'item-ceiling-exceeded', 'The shared document layer host capacity is exhausted.');
    }
    if (previousGeneration !== undefined) {
      const released = applyLayerPresentationEvent(candidate, { type: 'release-layer', id: registration.id, generation: previousGeneration });
      if (!released.ok) return released;
      candidate = released.value.state;
    }
    const parentID = registration.layer.parentID === undefined
      ? this.#implicitParentID(registration.owner)
      : registration.layer.parentID;
    const result = applyLayerPresentationEvent(candidate, {
      type: 'open-layer',
      layer: { ...registration.layer, parentID },
    });
    if (!result.ok) return result;
    candidate = result.value.state;
    if (registration.retainExit === true) {
      const retained = applyLayerPresentationEvent(candidate, {
        type: 'retain-layer', id: registration.id, generation: candidate.presentations.at(-1)!.generation,
      });
      if (!retained.ok) return retained;
      candidate = retained.value.state;
    }
    return this.#admission(registration, source, candidate);
  }

  #admission(registration: DOMLayerRegistration, source: LayerPresentationState<string>, candidate: LayerPresentationState<string>): Result<() => Result<void>> {
    const hostRevision = this.#hostRevision;
    const reservation = registration.reservation;
    const hostRecord = registration.layerHost === undefined ? undefined : this.#hosts.get(registration.layerHost);
    let pending: LayerPresentationState<string> | undefined = candidate;
    return okResult(() => {
      this.assertWritable();
      const prepared = pending;
      pending = undefined;
      if (prepared === undefined || source !== this.#state || hostRevision !== this.#hostRevision) return failResult('transition-rejection', 'stale-revision', 'Layer admission no longer matches its canonical source.');
      if (prepared === source) return okResult(undefined);
      if (reservation !== undefined) this.#releaseReservation(reservation);
      this.#close.set(registration.id, { close: registration.close, ...(registration.suspend === undefined ? {} : { suspend: registration.suspend }) });
      this.#surfaces.set(registration.id, registration.surface);
      if (registration.requestDismiss !== undefined) this.#dismissRequests.set(registration.id, registration.requestDismiss);
      if (hostRecord !== undefined) this.#hosted.set(prepared.presentations.at(-1)!.generation, hostRecord);
      this.#commit(prepared, []);
      return okResult(undefined);
    });
  }

  public register(registration: DOMLayerRegistration): boolean {
    const prepared = this.prepare(registration);
    return prepared.ok && prepared.value().ok;
  }

  public close(id: string): boolean {
    this.assertWritable();
    if (this.#closing.has(id)) return true;
    const result = applyLayerPresentationEvent(this.#state, { type: 'close-layer', id });
    if (!result.ok) return false;
    this.#commit(result.value.state, result.value.commands.map((command) => command.id), id);
    return true;
  }

  public dismiss(id: string, reason: LayerDismissReason): boolean {
    this.assertWritable();
    if (!this.isTop(id)) return false;
    const result = applyLayerPresentationEvent(this.#state, { type: 'dismiss-top', reason });
    if (!result.ok || result.value.commands.length === 0) return false;
    // Admission is canonical, but a controlled close request is not acceptance.
    // The host's ordinary controller refresh commits only its actual open value.
    const request = this.#dismissRequests.get(id);
    if (request !== undefined) return request(reason);
    this.#commit(result.value.state, result.value.commands.map((command) => command.id));
    return true;
  }

  public suspend(id: string): Result<void, DOMLayerSuspensionErrorCode> {
    this.assertWritable();
    if (!this.#orders.has(id)) {
      const generation = this.#generations.get(id);
      return generation === undefined ? okResult(undefined) : this.completeExit(id, generation);
    }
    const result = applyLayerPresentationEvent(this.#state, { type: 'retire-layer', id });
    if (!result.ok) return result;
    const ids = result.value.commands.map(command => command.id);
    for (const closing of ids) {
      if (closing !== id && this.#close.get(closing)?.suspend === undefined) {
        return failResult('resource-rejection', 'dom.layer-suspension-unavailable', 'A descendant has no native suspension capability.');
      }
    }
    this.#commit(result.value.state, ids, id, false, 'suspend');
    return okResult(undefined);
  }

  public isTop(id: string): boolean {
    return getTopLayer(this.#state.stack)?.id === id;
  }

  public isOutsideInteractiveLayer(id: string, event: Event): boolean {
    const ids = this.#interactiveLayers ??= getInteractiveLayerIDs(this.#state.stack);
    if (ids[0] !== id) return false;
    for (const candidate of ids) {
      const surface = this.#surfaces.get(candidate);
      if (surface !== undefined && isEventInside(event, surface)) return false;
    }
    return true;
  }

  public getOrder(id: string): number | null {
    return this.#orders.get(id) ?? null;
  }

  public getGeneration(id: string): number | undefined { return this.#generations.get(id); }

  public completeExit(id: string, generation: number): Result<void> {
    this.assertWritable();
    if (this.#presentations.get(generation)?.phase === 'active') return okResult(undefined);
    const result = applyLayerPresentationEvent(this.#state, { type: 'release-layer', id, generation });
    if (!result.ok) return result;
    this.#commit(result.value.state, []);
    return okResult(undefined);
  }

  public reparent(id: string, parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> {
    this.assertWritable();
    let parentID: string | null = null;
    if (parent !== null) {
      for (const [candidate, surface] of this.#surfaces) {
        if (surface !== parent || !this.#orders.has(candidate)) continue;
        if (parentID !== null) return failResult('transition-rejection', 'dom.layer-parent-ambiguous', 'The parent surface has multiple active registrations.');
        parentID = candidate;
      }
      if (parentID === null) return failResult('transition-rejection', 'dom.layer-parent-inactive', 'The parent surface must have one active registration in this document.');
    }
    const result = applyLayerPresentationEvent(this.#state, { type: 'reparent-layer', id, parentID });
    if (!result.ok) return result;
    this.#commit(result.value.state, []);
    return okResult(undefined);
  }

  #commit(state: LayerPresentationState<string>, closed: readonly string[], initiatingID?: string, hostChanged = false, effect: 'close' | 'suspend' = 'close'): void {
    if (state === this.#state && !hostChanged) return;
    const revision = Math.max(state.revision, this.#projectionRevision + 1);
    const presentations = new Map<number, DOMLayerPresentationSnapshot>();
    const generations = new Map<string, number>();
    const orders = new Map<string, number>();
    let hostOrder = 0;
    for (const entry of state.presentations) {
      const previous = this.#presentations.get(entry.generation);
      const rank = this.#hosted.has(entry.generation) ? hostOrder++ : undefined;
      const snapshot = previous?.phase === entry.phase && previous.order === entry.order && previous.hostOrder === rank
        ? previous : Object.freeze({ revision, generation: entry.generation, phase: entry.phase, order: entry.order, ...(rank === undefined ? {} : { hostOrder: rank }) });
      presentations.set(entry.generation, snapshot);
      generations.set(entry.id, entry.generation);
      if (entry.phase === 'active') {
        orders.set(entry.id, orders.size);
      }
    }
    for (const generation of this.#hosted.keys()) if (!presentations.has(generation)) this.#hosted.delete(generation);
    this.#retireHostPolicy();
    this.#state = state;
    this.#interactiveLayers = undefined;
    this.#projectionRevision = revision;
    this.#orders = orders;
    this.#generations = generations;
    this.#presentations = presentations;
    let failed = false;
    let firstError: unknown;
    this.#notifying = true;
    try {
      for (const [generation, subscriber] of this.#subscribers) {
        const next = presentations.get(generation) ?? Object.freeze({
          revision, generation, phase: 'closed' as const, order: null,
        });
        if (next === subscriber.snapshot) continue;
        subscriber.snapshot = next;
        try { subscriber.listener?.(next); }
        catch (error) { if (!failed) { failed = true; firstError = error; } }
        finally {
          if (next.phase === 'closed') {
            subscriber.listener = undefined;
            this.#subscribers.delete(generation);
          }
        }
      }
    } finally { this.#notifying = false; }
    try { this.#executeClosures(closed, initiatingID, effect); }
    catch (error) { if (!failed) { failed = true; firstError = error; } }
    if (failed) throw firstError;
  }

  #implicitParentID(owner: HTMLElement): string | null {
    for (let index = this.#state.stack.layers.length - 1; index >= 0; index -= 1) {
      const layer = this.#state.stack.layers[index]!;
      if (this.#surfaces.get(layer.id)?.contains?.(owner) === true) return layer.id;
    }
    return null;
  }

  #executeClosures(ids: readonly string[], initiatingID?: string, effect: 'close' | 'suspend' = 'close'): void {
    // Every callback completes an already-committed closure; drain before rethrowing.
    let failed = false;
    let firstError: unknown;
    for (const id of ids) {
      const effects = this.#close.get(id);
      const close = effect === 'close' ? effects?.close : effects?.suspend;
      this.#close.delete(id);
      this.#surfaces.delete(id);
      this.#dismissRequests.delete(id);
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
