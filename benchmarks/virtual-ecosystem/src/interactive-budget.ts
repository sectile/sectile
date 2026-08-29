export const EMBEDDED_LONG_TASK_BUDGET_MS = 250;

export function exceedsEmbeddedLongTaskBudget(
  embedded: boolean,
  elapsedMs: number | null,
): boolean {
  return embedded
    && elapsedMs !== null
    && Number.isFinite(elapsedMs)
    && elapsedMs >= EMBEDDED_LONG_TASK_BUDGET_MS;
}
