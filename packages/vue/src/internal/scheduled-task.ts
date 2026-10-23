import { getCurrentScope, nextTick, onBeforeUnmount, onScopeDispose } from 'vue';

export interface ScheduledTask {
  schedule(): void;
  cancel(): void;
}

export function useNextTickTask(task: () => void): ScheduledTask {
  let callback: (() => void) | undefined = task;
  let active = true;
  let scheduled = false;
  let generation = 0;

  const cancel = (): void => {
    generation += 1;
    scheduled = false;
  };
  const schedule = (): void => {
    if (!active || scheduled) return;
    scheduled = true;
    const expectedGeneration = generation;
    void nextTick(() => {
      if (!active || generation !== expectedGeneration) return;
      scheduled = false;
      callback?.();
    });
  };
  const dispose = (): void => {
    active = false;
    callback = undefined;
    cancel();
  };
  if (getCurrentScope()) onScopeDispose(dispose);
  else onBeforeUnmount(dispose);
  return Object.freeze({ schedule, cancel });
}
