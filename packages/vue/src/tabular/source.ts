import { getCurrentInstance, onBeforeUnmount, onMounted, readonly, shallowRef, type ShallowRef } from 'vue';
import type { TabularRequest, TabularViewResponse } from '@sectile/tabular';
import type { VueProfileController } from './controller.js';

export type SourceStatus = 'idle' | 'loading' | 'success' | 'error';

export type SourceResolver = (request: TabularRequest, context: { readonly signal: AbortSignal }) => TabularViewResponse | Promise<TabularViewResponse>;

export interface SourceOptions {
  readonly onError?: (error: unknown) => void;
  readonly onStatusChange?: (status: SourceStatus) => void;
}

export interface SourceReturn<Resolver extends SourceResolver = SourceResolver> {
  readonly status: Readonly<ShallowRef<SourceStatus>>;
  readonly error: Readonly<ShallowRef<unknown | null>>;
  reload(): void;
  cancel(): void;
  replaceResolver(resolver: Resolver): void;
  dispose(): void;
}

export function useProfileSource<State, Event, Command>(
  controller: VueProfileController<State, Event, Command>,
  initialResolver: SourceResolver,
  options: SourceOptions = {},
): SourceReturn {
  const status = shallowRef<SourceStatus>('idle');
  const error = shallowRef<unknown | null>(null);
  let resolver = initialResolver;
  let active: { readonly requestID: number; readonly abort: AbortController } | null = null;
  let mounted = false;
  let disposed = false;
  let queued: TabularRequest | null = null;
  let sequence = 0;

  const setStatus = (next: SourceStatus): void => {
    status.value = next;
    options.onStatusChange?.(next);
  };
  const abandon = (requestID: number): void => { controller.abandonRequest(requestID); };
  const cancel = (): void => {
    const cancellation = ++sequence;
    const current = active;
    const pending = queued;
    active = null;
    queued = null;
    if (current !== null) {
      current.abort.abort();
      abandon(current.requestID);
    }
    if (pending !== null && pending.requestID !== current?.requestID) abandon(pending.requestID);
    if (!disposed && sequence === cancellation) setStatus('idle');
  };
  const execute = (request: TabularRequest): void => {
    if (disposed) return;
    if (!mounted) { queued = request; return; }
    const execution = ++sequence;
    const previous = active;
    active = null;
    if (previous !== null) {
      previous.abort.abort();
      abandon(previous.requestID);
    }
    if (disposed || execution !== sequence) return;
    const abort = new AbortController();
    const owner = { requestID: request.requestID, abort };
    const executeResolver = resolver;
    active = owner;
    error.value = null;
    setStatus('loading');
    Promise.resolve().then(() => {
      if (disposed || abort.signal.aborted || active !== owner) return undefined;
      return executeResolver(request, { signal: abort.signal });
    }).then((response) => {
      if (response === undefined || disposed || abort.signal.aborted || active !== owner) return;
      const synchronized = controller.synchronizeView(response);
      if (disposed || abort.signal.aborted || active !== owner) return;
      if (!synchronized.ok) {
        active = null;
        error.value = synchronized.error;
        setStatus('error');
        options.onError?.(synchronized.error);
        return;
      }
      active = null;
      setStatus('success');
    }, (reason: unknown) => {
      if (disposed || abort.signal.aborted || active !== owner) return;
      active = null;
      abandon(request.requestID);
      error.value = reason;
      setStatus('error');
      options.onError?.(reason);
    });
  };
  const attached = controller.attachRequestExecutor((command) => execute((command as unknown as { readonly request: TabularRequest }).request));
  if (!attached.ok) throw new TypeError(attached.error.message);
  const releaseExecutor = attached.value;
  const reload = (): void => {
    const requested = controller.requestView();
    if (!requested.ok) throw new TypeError(requested.error.message);
  };
  const replaceResolver = (next: SourceResolver): void => {
    resolver = next;
    const replacement = sequence + 1;
    cancel();
    if (disposed || replacement !== sequence) return;
    const replaced = controller.dispatch({ type: 'replace-source' } as Event);
    if (!replaced.ok) throw new TypeError(replaced.error.message);
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    cancel();
    releaseExecutor();
  };

  if (getCurrentInstance() !== null) {
    onMounted(() => {
      mounted = true;
      const pending = queued ?? controller.requestState.value.pendingRequest;
      queued = null;
      if (pending !== null) execute(pending);
    });
    onBeforeUnmount(dispose);
  }
  return Object.freeze({ status: readonly(status), error: readonly(error), reload, cancel, replaceResolver, dispose });
}
