import { validateStableID } from '@sectile/core/identity';
import type { StableID } from '@sectile/core';

export { stableIDElementToken, stableIDToken } from '../identity.js';

const MAX_TOKEN_CODE_UNITS = Number.MAX_SAFE_INTEGER;

export function stableIDFromToken(token: string): StableID | null {
  const kind = token.slice(0, 2);
  const payload = token.slice(2);
  if (kind === 's:') {
    return validateStableID(payload, MAX_TOKEN_CODE_UNITS) === null ? payload : null;
  }
  if (kind !== 'n:' || !/^(?:0|[1-9]\d*|-[1-9]\d*)$/u.test(payload)) return null;
  const value = Number(payload);
  return validateStableID(value) === null ? value : null;
}
