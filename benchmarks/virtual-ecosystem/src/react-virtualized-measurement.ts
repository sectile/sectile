export function shouldCommitMeasuredHeight(
  hasMeasurement: boolean,
  cachedHeight: number,
  measuredHeight: number,
): boolean {
  return !hasMeasurement || cachedHeight !== measuredHeight;
}
