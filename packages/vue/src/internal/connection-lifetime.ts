import { onMounted, onScopeDispose, watch, type WatchStopHandle } from 'vue';

interface ConnectionLifetime<Input extends readonly unknown[]> {
  read(): Input;
  equal(next: Input, previous: Input): boolean;
  connect(input: Input): void;
  disconnect(): void;
  dispose(): void;
}

/** One paired-watch lifetime; native state/publication remains with each bridge. */
export function useConnectionLifetime<Input extends readonly unknown[]>(options: ConnectionLifetime<Input>): void {
  let hooks: ConnectionLifetime<Input> | undefined = options;
  let alive = true, mounted = false, needsAttach = true;
  let before: WatchStopHandle | undefined, after: WatchStopHandle | undefined;
  const release = (): void => { needsAttach = true; hooks?.disconnect(); };
  const read = (): Input | undefined => {
    try { return hooks?.read(); }
    catch (failure) { try { release(); } catch { /* Preserve the input failure after retirement. */ } throw failure; }
  };
  const attach = (input: Input | undefined): void => {
    if (!alive || !mounted || !needsAttach || !input) return;
    needsAttach = false;
    try { hooks?.connect(input); }
    catch (failure) { try { release(); } catch { /* Preserve the connection failure after retirement. */ } throw failure; }
  };
  // A caller's first ref/source read may synchronously stop the current scope.
  onScopeDispose(() => {
    alive = false; mounted = false;
    const held = hooks, stopBefore = before, stopAfter = after;
    hooks = undefined; before = undefined; after = undefined;
    try { stopBefore?.(); }
    finally { try { stopAfter?.(); } finally { try { held?.dispose(); } finally { held?.disconnect(); } } }
  });
  before = watch(read, (next, previous) => {
    if (!next || !previous || !hooks?.equal(next, previous)) release();
  }, { flush: 'sync' });
  if (!alive) { before(); before = undefined; return; }
  after = watch(read, attach, { flush: 'post' });
  if (!alive) { after(); after = undefined; return; }
  onMounted(() => { mounted = true; attach(read()); });
}
