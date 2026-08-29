export const TRANSIENT_GC_PASSES = 1;
export const RETAINED_GC_PASSES = 4;

export function collectTransientGarbage(collect = globalThis.gc) {
  collectGarbage(TRANSIENT_GC_PASSES, collect);
}

export function collectRetainedGarbage(collect = globalThis.gc) {
  collectGarbage(RETAINED_GC_PASSES, collect);
}

function collectGarbage(passes, collect) {
  if (typeof collect !== 'function') return;
  for (let pass = 0; pass < passes; pass += 1) collect();
}
