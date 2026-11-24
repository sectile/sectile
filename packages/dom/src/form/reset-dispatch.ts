/** Settle native reset effects after dispatch, including trusted event checkpoints. */
export function createResetDispatchTask(settle: () => void) {
  let pending: Event | undefined;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const complete = (): void => {
    pending = undefined;
    timer = undefined;
    settle();
  };
  return {
    schedule(event: Event): void {
      const scheduled = pending !== undefined;
      pending = event;
      if (scheduled) return;
      const scheduledGeneration = generation;
      queueMicrotask(() => {
        if (scheduledGeneration !== generation || pending === undefined) return;
        if (pending.eventPhase === 0) complete();
        else timer = setTimeout(complete, 0);
      });
    },
    clear(): void {
      generation += 1;
      pending = undefined;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
