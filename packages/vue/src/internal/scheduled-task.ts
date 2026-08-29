import { nextTick, onScopeDispose } from 'vue';

export interface ScheduledTask {
  schedule(): void;
  cancel(): void;
}

export function useNextTickTask(task: () => void): ScheduledTask {
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
      task();
    });
  };
  onScopeDispose(() => {
    active = false;
    cancel();
  });
  return Object.freeze({ schedule, cancel });
}
