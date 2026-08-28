export function median(values) {
  requireSamples(values);
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function percentile(values, quantile) {
  requireSamples(values);
  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
    throw new TypeError('quantile must be finite and between zero and one.');
  }
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * quantile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const fraction = position - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

export function relativeMAD(values) {
  const center = median(values);
  const deviation = median(values.map((value) => Math.abs(value - center)));
  return center === 0 ? (deviation === 0 ? 0 : Number.POSITIVE_INFINITY) : deviation / Math.abs(center);
}

export function summarize(values) {
  return Object.freeze({
    count: values.length,
    median: round(median(values)),
    p95: round(percentile(values, 0.95)),
    relativeMAD: round(relativeMAD(values)),
    minimum: round(Math.min(...values)),
    maximum: round(Math.max(...values)),
  });
}

function requireSamples(values) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError('statistics require one or more finite samples.');
  }
}

function round(value) {
  return Number(value.toPrecision(12));
}
