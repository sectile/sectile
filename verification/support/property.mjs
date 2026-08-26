import assert from 'node:assert/strict';

const DEFAULT_SHRINK_LIMIT = 1_000;

export function checkProperty({
  name,
  seed,
  runs,
  generate,
  verify,
  shrink = () => [],
  shrinkLimit = DEFAULT_SHRINK_LIMIT,
}) {
  assert.equal(typeof name, 'string');
  assert.equal(Number.isSafeInteger(seed), true);
  assert.equal(Number.isSafeInteger(runs) && runs > 0, true);
  assert.equal(typeof generate, 'function');
  assert.equal(typeof verify, 'function');
  assert.equal(typeof shrink, 'function');
  assert.equal(Number.isSafeInteger(shrinkLimit) && shrinkLimit > 0, true);

  const random = createPropertyRandom(seed);
  for (let run = 0; run < runs; run += 1) {
    const input = generate(random, run);
    try {
      verify(input);
    } catch (cause) {
      const failure = shrinkFailure(input, verify, shrink, shrinkLimit, cause);
      const error = new Error(
        `${name} failed (seed=${seed}, run=${run}, shrinks=${failure.shrinks}, counterexample=${formatCounterexample(failure.input)})`,
        { cause: failure.cause },
      );
      Object.defineProperties(error, {
        seed: { value: seed, enumerable: true },
        run: { value: run, enumerable: true },
        counterexample: { value: failure.input, enumerable: true },
      });
      throw error;
    }
  }
  return Object.freeze({ seed, runs });
}

export function createPropertyRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
  return Object.freeze({
    bool: () => next() < 0.5,
    int: (minimum, maximumExclusive) => {
      assert.equal(Number.isSafeInteger(minimum), true);
      assert.equal(Number.isSafeInteger(maximumExclusive) && maximumExclusive > minimum, true);
      return minimum + Math.floor(next() * (maximumExclusive - minimum));
    },
    pick: (values) => {
      assert.equal(Array.isArray(values) && values.length > 0, true);
      return values[Math.floor(next() * values.length)];
    },
  });
}

function shrinkFailure(initial, verify, shrink, limit, initialCause) {
  let input = initial;
  let cause = initialCause;
  let shrinks = 0;
  while (shrinks < limit) {
    let reduced = false;
    for (const candidate of shrink(input)) {
      if (Object.is(candidate, input)) continue;
      try {
        verify(candidate);
      } catch (candidateCause) {
        input = candidate;
        cause = candidateCause;
        shrinks += 1;
        reduced = true;
        break;
      }
    }
    if (!reduced) break;
  }
  return { input, cause, shrinks };
}

function formatCounterexample(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
