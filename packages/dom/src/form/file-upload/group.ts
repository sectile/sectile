import { createFacadeConnection, synchronizeControllerState, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { sameStableIDOrder, tryNormalizeStableIDs, type StableID } from '@sectile/core/identity';
import { failResult, okResult, unwrap, type Result } from '@sectile/core/result';
import { tryCreateFilePolicy, type FileMetadata, type FilePolicy } from '@sectile/form/files';
import { applyFileUploadEvent, tryCreateFileUploadState, type FileUploadState } from '@sectile/form/uploads';
import { tryCreateFileUpload, type FileUploadAdapter, type FileUploadConnection, type FileUploadHostErrorCode } from './connection.js';

export interface FileUploadItem<ID extends StableID = StableID, T extends FileMetadata = FileMetadata> { readonly id: ID; readonly file: T }
export type FileUploadItemSnapshot<T extends FileMetadata = FileMetadata, Receipt = unknown> = RevisionSnapshot<FileUploadState<T, Receipt>>;
export type FileUploadGroupCounts = Readonly<Record<FileUploadState['status'], number>>;
export interface FileUploadGroupState<ID extends StableID = StableID> {
  readonly connected: boolean;
  readonly ids: readonly ID[];
  readonly concurrency: number;
  readonly pending: number;
  /** Occupied slots, including synchronous adapter setup. */
  readonly active: number;
  readonly counts: FileUploadGroupCounts;
}
export type FileUploadGroupSnapshot<ID extends StableID = StableID> = RevisionSnapshot<FileUploadGroupState<ID>>;
export type FileUploadGroupErrorCode = FileUploadHostErrorCode | 'dom.file-upload-group-invalid'
  | 'dom.file-upload-group-inactive' | 'dom.file-upload-group-busy' | 'dom.file-upload-item-missing' | 'dom.file-upload-concurrency-active';
export interface FileUploadGroupOptions<ID extends StableID, T extends FileMetadata, Receipt = unknown> {
  readonly items: readonly FileUploadItem<ID, T>[];
  readonly adapter: FileUploadAdapter<NoInfer<T>, Receipt>;
  readonly concurrency?: number;
  readonly maxFiles?: number;
  readonly onItemUpdate?: (id: NoInfer<ID>, snapshot: FileUploadItemSnapshot<NoInfer<T>, NoInfer<Receipt>> | undefined) => void;
  readonly onUpdate?: () => void;
  readonly onCleanupError?: (error: unknown) => void;
}
export interface FileUploadGroupConnection<ID extends StableID, T extends FileMetadata, Receipt = unknown> {
  getSnapshot(): FileUploadGroupSnapshot<ID>;
  getItemSnapshot(id: ID): FileUploadItemSnapshot<T, Receipt> | undefined;
  start(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
  cancel(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
  reset(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
  syncItems(items: readonly FileUploadItem<ID, T>[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
  setConcurrency(concurrency: number): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode>;
}
interface Entry<ID extends StableID, T extends FileMetadata, Receipt> {
  readonly id: ID;
  snapshot: FileUploadItemSnapshot<T, Receipt>;
  pending: boolean;
  previous: Entry<ID, T, Receipt> | undefined;
  next: Entry<ID, T, Receipt> | undefined;
}
interface Slot<ID extends StableID, T extends FileMetadata, Receipt> {
  entry: Entry<ID, T, Receipt> | undefined;
  native: FacadeConnection<FileUploadConnection<T, Receipt>> | undefined;
  notify: (() => void) | undefined;
  live: boolean;
}
interface Plan<ID extends StableID, T extends FileMetadata, Receipt> {
  readonly ids: readonly ID[];
  readonly entries: Map<ID, Entry<ID, T, Receipt>>;
  readonly counts: Record<FileUploadState['status'], number>;
}
const emptyIDs: readonly never[] = /* @__PURE__ */ Object.freeze([]);
function counts(): Record<FileUploadState['status'], number> { return { queued: 0, uploading: 0, succeeded: 0, failed: 0, canceled: 0 }; }
function rejected(code: FileUploadGroupErrorCode): Result<never, FileUploadGroupErrorCode> {
  return failResult('transition-rejection', code, 'The upload group cannot accept this operation.');
}
function limit(value: number): boolean { return Number.isSafeInteger(value) && value > 0; }
function notifySlot<ID extends StableID, T extends FileMetadata, Receipt>(slot: Slot<ID, T, Receipt>): () => void { return () => slot.notify?.(); }
function prepare<ID extends StableID, T extends FileMetadata, Receipt>(
  input: readonly FileUploadItem<ID, T>[], policy: FilePolicy,
  previous?: ReadonlyMap<ID, Entry<ID, T, Receipt>>, previousIDs?: readonly ID[],
): Result<Plan<ID, T, Receipt>, FileUploadGroupErrorCode> {
  const ids: ID[] = [], files: T[] = [];
  try {
    if (!Array.isArray(input)) return rejected('dom.file-upload-group-invalid');
    const length = input.length;
    if (!Number.isSafeInteger(length) || length < 0) return rejected('dom.file-upload-group-invalid');
    if (length > policy.maxFiles) { const admitted = policy.validate({ length }); if (!admitted.ok) return admitted; }
    for (let index = 0; index < length; index++) { const item = input[index]!; ids.push(item.id); files.push(item.file); }
  } catch { return rejected('dom.file-upload-group-invalid'); }
  const admitted = policy.validate(files); if (!admitted.ok) return admitted;
  const normalized = tryNormalizeStableIDs(ids); if (!normalized.ok) return normalized;
  const entries = new Map<ID, Entry<ID, T, Receipt>>(), totals = counts();
  for (let index = 0; index < normalized.value.length; index++) {
    const id = normalized.value[index]!, file = admitted.value.files[index]!, old = previous?.get(id);
    let entry = old;
    if (!entry || entry.snapshot.state.file !== file) {
      const initial = tryCreateFileUploadState<T, Receipt>(file); if (!initial.ok) return initial;
      entry = { id, snapshot: createRevisionSnapshot(initial.value), pending: false, previous: undefined, next: undefined };
    }
    entries.set(id, entry); totals[entry.snapshot.state.status]++;
  }
  return okResult({ ids: previousIDs && sameStableIDOrder(previousIDs, normalized.value) ? previousIDs : normalized.value, entries, counts: totals });
}
export function createFileUploadGroup<const ID extends StableID, T extends FileMetadata, Receipt = unknown>(options: FileUploadGroupOptions<ID, T, Receipt>): FacadeConnection<FileUploadGroupConnection<ID, T, Receipt>> {
  return unwrap(tryCreateFileUploadGroup(options));
}
export function tryCreateFileUploadGroup<const ID extends StableID, T extends FileMetadata, Receipt = unknown>(options: FileUploadGroupOptions<ID, T, Receipt>): Result<FacadeConnection<FileUploadGroupConnection<ID, T, Receipt>>, FileUploadGroupErrorCode> {
  return createFacadeConnection(options, construct<ID, T, Receipt>);
}
function construct<ID extends StableID, T extends FileMetadata, Receipt>(options: FileUploadGroupOptions<ID, T, Receipt>): Result<FileUploadGroupConnection<ID, T, Receipt>, FileUploadGroupErrorCode> {
  const concurrency = options.concurrency ?? 3;
  if (!limit(concurrency) || typeof options.adapter !== 'function' || options.onItemUpdate !== undefined && typeof options.onItemUpdate !== 'function'
    || options.onCleanupError !== undefined && typeof options.onCleanupError !== 'function') return rejected('dom.file-upload-group-invalid');
  const policy = tryCreateFilePolicy({ multiple: true, ...(options.maxFiles === undefined ? {} : { maxFiles: options.maxFiles }) });
  if (!policy.ok) return policy;
  const plan = prepare<ID, T, Receipt>(options.items, policy.value); if (!plan.ok) return plan;
  return okResult(new UploadGroup(options, concurrency, policy.value, plan.value));
}
class UploadGroup<ID extends StableID, T extends FileMetadata, Receipt> implements FileUploadGroupConnection<ID, T, Receipt> {
  #entries: Map<ID, Entry<ID, T, Receipt>>;
  #ids: readonly ID[];
  #counts: Record<FileUploadState['status'], number>;
  #policy: FilePolicy | undefined;
  #concurrency: number;
  #adapter: FileUploadAdapter<T, Receipt> | undefined;
  #itemUpdate: FileUploadGroupOptions<ID, T, Receipt>['onItemUpdate'];
  #notify: FileUploadGroupOptions<ID, T, Receipt>['onUpdate'];
  #cleanupError: FileUploadGroupOptions<ID, T, Receipt>['onCleanupError'];
  #head: Entry<ID, T, Receipt> | undefined;
  #tail: Entry<ID, T, Receipt> | undefined;
  #pending = 0;
  #active = new Map<ID, Slot<ID, T, Receipt>>();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #connected = true;
  #busy = false;
  #dirty = false;
  #callbackFailed = false;
  #callbackError: unknown;
  #snapshot: FileUploadGroupSnapshot<ID>;
  #published: FileUploadGroupSnapshot<ID>;
  constructor(options: FileUploadGroupOptions<ID, T, Receipt>, concurrency: number, policy: FilePolicy, plan: Plan<ID, T, Receipt>) {
    this.#entries = plan.entries; this.#ids = plan.ids; this.#counts = plan.counts; this.#policy = policy; this.#concurrency = concurrency;
    this.#adapter = options.adapter; this.#itemUpdate = options.onItemUpdate; this.#notify = options.onUpdate; this.#cleanupError = options.onCleanupError;
    this.#snapshot = createRevisionSnapshot(this.#summary()); this.#published = this.#snapshot;
  }
  #summary(): FileUploadGroupState<ID> { return Object.freeze({ connected: this.#connected, ids: this.#ids, concurrency: this.#concurrency,
    pending: this.#pending, active: this.#active.size, counts: Object.freeze({ ...this.#counts }) }); }
  getSnapshot(): FileUploadGroupSnapshot<ID> {
    if (this.#dirty) { this.#snapshot = unwrap(synchronizeControllerState<FileUploadGroupState<ID>, FileUploadGroupErrorCode>(this.#snapshot, okResult(this.#summary()))); this.#dirty = false; }
    return this.#snapshot;
  }
  getItemSnapshot(id: ID): FileUploadItemSnapshot<T, Receipt> | undefined { return this.#entries.get(id)?.snapshot; }
  #enqueue(entry: Entry<ID, T, Receipt>): void {
    if (entry.pending) return;
    entry.pending = true; entry.previous = this.#tail;
    if (this.#tail) this.#tail.next = entry; else this.#head = entry;
    this.#tail = entry; this.#pending++; this.#dirty = true;
  }
  #dequeue(entry: Entry<ID, T, Receipt>): void {
    if (!entry.pending) return;
    if (entry.previous) entry.previous.next = entry.next; else this.#head = entry.next;
    if (entry.next) entry.next.previous = entry.previous; else this.#tail = entry.previous;
    entry.pending = false; entry.previous = undefined; entry.next = undefined; this.#pending--; this.#dirty = true;
  }
  #emit(id: ID, snapshot: FileUploadItemSnapshot<T, Receipt> | undefined): void {
    if (!this.#connected) return;
    try { this.#itemUpdate?.(id, snapshot); }
    catch (error) { this.#callbackFailed = true; this.#callbackError = error; this.#quietStop(); throw error; }
  }
  #store(entry: Entry<ID, T, Receipt>, state: FileUploadState<T, Receipt>, notify = true): void {
    if (!this.#connected || this.#entries.get(entry.id) !== entry || entry.snapshot.state === state) return;
    const old = entry.snapshot.state;
    entry.snapshot = unwrap(synchronizeControllerState<FileUploadState<T, Receipt>, FileUploadGroupErrorCode>(entry.snapshot, okResult(state)));
    if (old.status !== state.status) { this.#counts[old.status]--; this.#counts[state.status]++; this.#dirty = true; }
    if (notify) this.#emit(entry.id, entry.snapshot);
  }
  #retire(slot: Slot<ID, T, Receipt>): void {
    if (!slot.live) return;
    slot.live = false; const entry = slot.entry, native = slot.native;
    slot.entry = undefined; slot.native = undefined; slot.notify = undefined;
    if (entry && this.#active.get(entry.id) === slot) { this.#active.delete(entry.id); this.#dirty = true; }
    native?.destroy();
  }
  #receive(slot: Slot<ID, T, Receipt>): void {
    const update = (): Result<void, FileUploadGroupErrorCode> => {
      const entry = slot.entry, state = slot.native?.getSnapshot().state;
      if (!this.#connected || !slot.live || !entry || !state || this.#active.get(entry.id) !== slot) return okResult(undefined);
      if (state.status !== 'uploading') this.#retire(slot);
      this.#store(entry, state); return okResult(undefined);
    };
    if (this.#busy) update(); else this.#run(update);
  }
  #fail(entry: Entry<ID, T, Receipt>, error: unknown): void {
    const start = applyFileUploadEvent(entry.snapshot.state, { type: 'start' });
    if (!start.ok || start.value.status !== 'uploading') return;
    const failed = applyFileUploadEvent(start.value, { type: 'fail', attempt: start.value.attempt, error });
    if (failed.ok) this.#store(entry, failed.value);
  }
  #pump(): void {
    const quota = Math.min(this.#concurrency - this.#active.size, this.#pending);
    for (let index = 0; index < quota && this.#connected && this.#head && this.#adapter; index++) {
      const entry = this.#head; this.#dequeue(entry);
      const slot: Slot<ID, T, Receipt> = { entry, native: undefined, notify: undefined, live: true };
      slot.notify = () => this.#receive(slot); this.#active.set(entry.id, slot); this.#dirty = true;
      const result = tryCreateFileUpload<T, Receipt>({ file: entry.snapshot.state.file, adapter: this.#adapter,
        ...(this.#cleanupError === undefined ? {} : { onCleanupError: this.#cleanupError }), onUpdate: notifySlot(slot) });
      if (!this.#connected || !slot.live) { if (result.ok) result.value.destroy(); continue; }
      if (!result.ok) { this.#retire(slot); this.#fail(entry, result.error); continue; }
      slot.native = result.value;
      const started = result.value.start();
      if (started && !started.ok) { this.#retire(slot); this.#fail(entry, started.error); }
      if (this.#callbackFailed) break;
    }
  }
  #cancelTimer(): void { if (this.#timer !== undefined) clearTimeout(this.#timer); this.#timer = undefined; }
  #schedule(): void {
    if (!this.#connected || !this.#pending || this.#active.size >= this.#concurrency) { this.#cancelTimer(); return; }
    if (this.#timer !== undefined) return;
    this.#timer = setTimeout(() => { this.#timer = undefined; this.#run(() => { this.#pump(); return okResult(undefined); }); }, 0);
  }
  #quietStop(): void {
    this.#cancelTimer();
    const active = [...this.#active.values()];
    const entries = active.map(slot => slot.entry);
    for (const slot of active) this.#retire(slot);
    while (this.#head) {
      const entry = this.#head; this.#dequeue(entry);
      const next = applyFileUploadEvent(entry.snapshot.state, { type: 'cancel' }); if (next.ok) this.#store(entry, next.value, false);
    }
    for (const entry of entries) if (entry?.snapshot.state.status === 'uploading') {
      const next = applyFileUploadEvent(entry.snapshot.state, { type: 'cancel' }); if (next.ok) this.#store(entry, next.value, false);
    }
  }
  #run(work: () => Result<void, FileUploadGroupErrorCode>): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> {
    if (!this.#connected) return rejected('dom.file-upload-group-inactive');
    if (this.#busy) return rejected('dom.file-upload-group-busy');
    this.#busy = true;
    try {
      const result = work();
      if (this.#callbackFailed) throw this.#callbackError;
      if (!result.ok) return result;
      if (!this.#connected) return rejected('dom.file-upload-group-inactive');
      const snapshot = this.getSnapshot();
      if (snapshot !== this.#published) { this.#published = snapshot; this.#notify?.(); }
      this.#schedule(); return okResult(this.getSnapshot());
    } catch (error) {
      this.#callbackFailed = false; this.#callbackError = undefined;
      try { this.#quietStop(); } catch { this.disconnect(); }
      throw error;
    } finally { this.#busy = false; }
  }
  #targets(ids: readonly ID[] | undefined): Result<readonly ID[], FileUploadGroupErrorCode> {
    if (ids === undefined) return okResult(this.#ids);
    try { if (!Array.isArray(ids) || ids.length > this.#entries.size) return rejected('dom.file-upload-group-invalid'); }
    catch { return rejected('dom.file-upload-group-invalid'); }
    const targets = tryNormalizeStableIDs(ids); if (!targets.ok) return targets;
    for (const id of targets.value) if (!this.#entries.has(id)) return rejected('dom.file-upload-item-missing');
    return targets;
  }
  start(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> {
    return this.#run(() => {
      const targets = this.#targets(ids); if (!targets.ok) return targets;
      for (const id of targets.value) {
        const entry = this.#entries.get(id)!;
        if (entry.snapshot.state.status === 'succeeded' || this.#active.has(id) || entry.pending) continue;
        const queued = applyFileUploadEvent(entry.snapshot.state, { type: 'reset' }); if (!queued.ok) return queued;
        this.#store(entry, queued.value); this.#enqueue(entry);
      }
      this.#pump(); return okResult(undefined);
    });
  }
  #stop(type: 'cancel' | 'reset', ids: readonly ID[] | undefined): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> {
    return this.#run(() => {
      const targets = this.#targets(ids); if (!targets.ok) return targets;
      for (const id of targets.value) {
        const entry = this.#entries.get(id)!; this.#dequeue(entry);
        const slot = this.#active.get(id);
        if (slot?.native) { const result = type === 'cancel' ? slot.native.cancel() : slot.native.reset(); if (result && !result.ok) return result; }
        else if (type === 'reset' || entry.snapshot.state.status === 'queued') {
          const next = applyFileUploadEvent(entry.snapshot.state, { type }); if (!next.ok) return next; this.#store(entry, next.value);
        }
      }
      return okResult(undefined);
    });
  }
  cancel(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> { return this.#stop('cancel', ids); }
  reset(ids?: readonly ID[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> { return this.#stop('reset', ids); }
  syncItems(items: readonly FileUploadItem<ID, T>[]): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> {
    return this.#run(() => {
      const plan = prepare(items, this.#policy!, this.#entries, this.#ids); if (!plan.ok) return plan;
      if (!this.#connected) return rejected('dom.file-upload-group-inactive');
      const old = this.#entries;
      let unchanged = plan.value.ids === this.#ids && plan.value.entries.size === old.size;
      if (unchanged) for (const [id, entry] of plan.value.entries) if (old.get(id) !== entry) { unchanged = false; break; }
      if (unchanged) return okResult(undefined);
      this.#entries = plan.value.entries; this.#ids = plan.value.ids; this.#counts = plan.value.counts; this.#dirty = true;
      for (const [id, entry] of old) if (this.#entries.get(id) !== entry) {
        this.#dequeue(entry); const slot = this.#active.get(id); if (slot) this.#retire(slot);
        if (!this.#entries.has(id)) this.#emit(id, undefined);
      }
      for (const [id, entry] of this.#entries) if (old.get(id) !== entry) this.#emit(id, entry.snapshot);
      return okResult(undefined);
    });
  }
  setConcurrency(concurrency: number): Result<FileUploadGroupSnapshot<ID>, FileUploadGroupErrorCode> {
    return this.#run(() => {
      if (!limit(concurrency)) return rejected('dom.file-upload-group-invalid');
      if (concurrency < this.#active.size) return rejected('dom.file-upload-concurrency-active');
      if (concurrency === this.#concurrency) return okResult(undefined);
      this.#concurrency = concurrency; this.#dirty = true;
      this.#pump(); return okResult(undefined);
    });
  }
  disconnect(): void {
    if (!this.#connected) return;
    this.#connected = false; this.#cancelTimer(); this.#adapter = undefined; this.#itemUpdate = undefined; this.#notify = undefined; this.#policy = undefined;
    this.#head = undefined; this.#tail = undefined; this.#pending = 0;
    const active = [...this.#active.values()]; this.#active.clear(); this.#entries.clear(); this.#ids = emptyIDs; this.#counts = counts();
    this.#callbackFailed = false; this.#callbackError = undefined;
    try { for (const slot of active) this.#retire(slot); }
    finally { this.#cleanupError = undefined; this.#dirty = false; this.#snapshot = createRevisionSnapshot(this.#summary(), this.#snapshot.revision); this.#published = this.#snapshot; }
  }
}
