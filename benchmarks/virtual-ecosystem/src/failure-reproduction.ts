export interface FailureOutcomeLike {
  readonly elapsedMs: number | null;
  readonly failures: readonly { readonly code: string }[];
}

export interface FailureReproductionStreak {
  readonly signature: string;
  readonly rounds: number;
}

export function reproducibleFailureSignature(
  outcomes: readonly FailureOutcomeLike[],
  minimumSamples: number,
): string | null {
  if (outcomes.length < minimumSamples) return null;
  const signatures = outcomes.map(failureSignature);
  const signature = signatures[0];
  if (signature === null || signatures.some((candidate) => candidate !== signature)) return null;
  return signature;
}

export function advanceFailureReproduction(
  previous: FailureReproductionStreak | undefined,
  signature: string | null,
): FailureReproductionStreak | undefined {
  if (signature === null) return undefined;
  return Object.freeze({
    signature,
    rounds: previous?.signature === signature ? previous.rounds + 1 : 1,
  });
}

function failureSignature(outcome: FailureOutcomeLike): string | null {
  if (outcome.elapsedMs !== null || outcome.failures.length === 0) return null;
  const codes = [...new Set(outcome.failures.map((failure) => failure.code))].sort();
  return codes.length === 0 ? null : codes.join('\u0000');
}
