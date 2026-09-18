export function normalizeDecimalInput(value: number | string): string {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) throw new TypeError('Decimal number input must be finite.');
  return expandExponent(String(value));
}

function expandExponent(value: string): string {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/u.exec(value);
  if (match === null) return value;
  const sign = match[1] === '-' ? '-' : '';
  const integer = match[2] ?? '0';
  const fraction = match[3] ?? '';
  const exponent = Number(match[4]);
  const digits = `${integer}${fraction}`;
  const decimalIndex = integer.length + exponent;
  if (decimalIndex <= 0) return `${sign}0.${'0'.repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length) return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}
