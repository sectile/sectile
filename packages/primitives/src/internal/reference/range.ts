import type { ExactRatio, QuantizedRange } from '../../range.js';
import type { TiePolicy } from '../../shared.js';

interface Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

/** Fraction-based executable specification independent of the scaled-decimal implementation. */
export class ReferenceRange implements QuantizedRange {
  public readonly origin: string;
  public readonly step: string;
  public readonly count: number;
  readonly #origin: Fraction;
  readonly #step: Fraction;

  public constructor(origin: string, step: string, count: number) {
    const parsedOrigin = parse(origin);
    const parsedStep = parse(step);
    if (parsedOrigin === null || parsedStep === null || parsedStep.numerator <= 0n) {
      throw new TypeError('invalid reference range');
    }
    this.#origin = parsedOrigin;
    this.#step = parsedStep;
    this.origin = render(parsedOrigin);
    this.step = render(parsedStep);
    this.count = count;
    Object.freeze(this);
  }

  public get cardinality(): number {
    return this.count + 1;
  }

  public get lower(): string {
    return this.origin;
  }

  public get upper(): string {
    return render(this.value(this.count));
  }

  public valueAt(tick: number): string | null {
    return validTick(tick, this.count) ? render(this.value(tick)) : null;
  }

  public tickOf(value: string): number | null {
    const parsed = parse(value);
    if (parsed === null) return null;
    const quotient = divide(subtract(parsed, this.#origin), this.#step);
    if (quotient.denominator !== 1n) return null;
    const tick = quotient.numerator;
    return tick >= 0n && tick <= BigInt(this.count) ? Number(tick) : null;
  }

  public clamp(value: string): string | null {
    const parsed = parse(value);
    if (parsed === null) return null;
    if (compare(parsed, this.#origin) < 0) return this.lower;
    const upper = this.value(this.count);
    if (compare(parsed, upper) > 0) return this.upper;
    return render(parsed);
  }

  public snap(value: string, tie: TiePolicy = 'lower'): string | null {
    const parsed = parse(value);
    if (parsed === null) return null;
    const clamped =
      compare(parsed, this.#origin) < 0
        ? this.#origin
        : compare(parsed, this.value(this.count)) > 0
          ? this.value(this.count)
          : parsed;
    let bestTick = 0;
    let bestDistance: Fraction | null = null;
    const tied: number[] = [];
    for (let tick = 0; tick <= this.count; tick += 1) {
      const distance = absolute(subtract(this.value(tick), clamped));
      if (bestDistance === null || compare(distance, bestDistance) < 0) {
        bestDistance = distance;
        bestTick = tick;
        tied.length = 0;
        tied.push(tick);
      } else if (compare(distance, bestDistance) === 0) {
        tied.push(tick);
      }
    }
    if (tied.length > 1) {
      if (tie === 'upper') bestTick = tied[tied.length - 1] ?? bestTick;
      else if (tie === 'even-tick') bestTick = tied.find((tick) => tick % 2 === 0) ?? tied[0] ?? bestTick;
      else bestTick = tied[0] ?? bestTick;
    }
    return render(this.value(bestTick));
  }

  public ratioOfTick(tick: number): ExactRatio | null {
    if (!validTick(tick, this.count)) return null;
    if (this.count === 0) return Object.freeze({ numerator: 0n, denominator: 1n });
    const ratio = reduce({ numerator: BigInt(tick), denominator: BigInt(this.count) });
    return Object.freeze(ratio);
  }

  public tickFromRatio(ratio: ExactRatio, tie: TiePolicy = 'lower'): number | null {
    if (ratio.denominator === 0n) return null;
    let normalized = reduce(ratio);
    if (normalized.numerator < 0n) normalized = { numerator: 0n, denominator: 1n };
    if (compare(normalized, { numerator: 1n, denominator: 1n }) > 0) {
      normalized = { numerator: 1n, denominator: 1n };
    }
    let bestTick = 0;
    let bestDistance: Fraction | null = null;
    const tied: number[] = [];
    for (let tick = 0; tick <= this.count; tick += 1) {
      const tickRatio = this.count === 0
        ? { numerator: 0n, denominator: 1n }
        : reduce({ numerator: BigInt(tick), denominator: BigInt(this.count) });
      const distance = absolute(subtract(tickRatio, normalized));
      if (bestDistance === null || compare(distance, bestDistance) < 0) {
        bestDistance = distance;
        bestTick = tick;
        tied.length = 0;
        tied.push(tick);
      } else if (compare(distance, bestDistance) === 0) tied.push(tick);
    }
    if (tied.length > 1) {
      if (tie === 'upper') bestTick = tied[tied.length - 1] ?? bestTick;
      else if (tie === 'even-tick') bestTick = tied.find((tick) => tick % 2 === 0) ?? tied[0] ?? bestTick;
      else bestTick = tied[0] ?? bestTick;
    }
    return bestTick;
  }

  private value(tick: number): Fraction {
    return add(this.#origin, multiply(this.#step, BigInt(tick)));
  }
}

function parse(value: string): Fraction | null {
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/u.exec(value);
  if (match === null) return null;
  const sign = match[1] === '-' ? -1n : 1n;
  const integer = match[2] ?? '0';
  const fraction = match[3] ?? match[4] ?? '';
  return reduce({ numerator: sign * BigInt(`${integer}${fraction}`), denominator: 10n ** BigInt(fraction.length) });
}

function render(value: Fraction): string {
  const reduced = reduce(value);
  let denominator = reduced.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % 2n === 0n) { denominator /= 2n; twos += 1; }
  while (denominator % 5n === 0n) { denominator /= 5n; fives += 1; }
  if (denominator !== 1n) throw new RangeError('reference range produced a non-decimal fraction');
  const scale = Math.max(twos, fives);
  const scaled = reduced.numerator * 2n ** BigInt(scale - twos) * 5n ** BigInt(scale - fives);
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled).toString().padStart(scale + 1, '0');
  if (scale === 0) return `${negative ? '-' : ''}${digits}`;
  const split = digits.length - scale;
  const raw = `${negative ? '-' : ''}${digits.slice(0, split)}.${digits.slice(split)}`;
  return raw.replace(/\.0+$/u, '').replace(/(\.\d*?)0+$/u, '$1');
}

function add(left: Fraction, right: Fraction): Fraction {
  return reduce({
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
}
function subtract(left: Fraction, right: Fraction): Fraction {
  return add(left, { numerator: -right.numerator, denominator: right.denominator });
}
function multiply(value: Fraction, factor: bigint): Fraction {
  return reduce({ numerator: value.numerator * factor, denominator: value.denominator });
}
function divide(left: Fraction, right: Fraction): Fraction {
  return reduce({
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  });
}
function absolute(value: Fraction): Fraction {
  return { numerator: value.numerator < 0n ? -value.numerator : value.numerator, denominator: value.denominator };
}
function compare(left: Fraction, right: Fraction): -1 | 0 | 1 {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference === 0n ? 0 : difference < 0n ? -1 : 1;
}
function reduce(value: Fraction): Fraction {
  if (value.denominator === 0n) throw new RangeError('zero denominator');
  let numerator = value.numerator;
  let denominator = value.denominator;
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const divisor = gcd(numerator, denominator);
  return divisor === 0n
    ? { numerator: 0n, denominator: 1n }
    : { numerator: numerator / divisor, denominator: denominator / divisor };
}
function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function validTick(tick: number, count: number): boolean {
  return Number.isSafeInteger(tick) && tick >= 0 && tick <= count;
}
