import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';

const npmWebOrigin = 'https://www.npmjs.com';
const npmRegistryOrigin = 'https://registry.npmjs.org';

export function parseNpmWebAuthChallenge(...outputs) {
  for (const output of outputs) {
    const document = parseJSONDocument(output);
    const error = document?.error;
    if (error?.code !== 'EOTP' || typeof error.authUrl !== 'string' || typeof error.doneUrl !== 'string') continue;
    return validateNpmWebAuthChallenge({ authUrl: error.authUrl, doneUrl: error.doneUrl });
  }
  return null;
}

export async function completeNpmWebAuth(challenge, options = {}) {
  const validated = validateNpmWebAuthChallenge(challenge);
  const fetchImpl = options.fetchImpl ?? fetch;
  const pause = options.wait ?? wait;
  const scheduleTimeout = options.setTimeout ?? globalThis.setTimeout;
  const cancelTimeout = options.clearTimeout ?? globalThis.clearTimeout;
  const maxPollMilliseconds = options.maxPollMilliseconds ?? 10 * 60 * 1_000;
  const fetchTimeoutMilliseconds = options.fetchTimeoutMilliseconds ?? 30_000;
  let scheduledMilliseconds = 0;
  (options.announce ?? announce)(validated.authUrl);

  while (scheduledMilliseconds <= maxPollMilliseconds) {
    const { response, body } = await pollOnce(fetchImpl, validated.doneUrl, fetchTimeoutMilliseconds, {
      cancelTimeout,
      scheduleTimeout,
    });
    if (response.status === 200) {
      assert.equal(isValidOtp(body?.token), true, 'npm WebAuth returned an invalid one-time token');
      return body.token;
    }
    assert.equal(response.status, 202, `npm WebAuth polling failed with HTTP ${response.status}`);
    const retryMilliseconds = retryDelay(response.headers.get('retry-after'));
    scheduledMilliseconds += retryMilliseconds;
    if (scheduledMilliseconds > maxPollMilliseconds) break;
    await pause(retryMilliseconds);
  }
  throw new Error('npm WebAuth approval timed out');
}

export function validateNpmWebAuthChallenge(challenge) {
  const authUrl = validateUrl(challenge.authUrl, npmWebOrigin, '/auth/cli/');
  const doneUrl = validateUrl(challenge.doneUrl, npmRegistryOrigin, '/-/v1/');
  assert.equal(doneUrl.pathname, '/-/v1/done', `unexpected npm WebAuth path: ${doneUrl.pathname}`);
  assert.ok(doneUrl.searchParams.get('authId'), 'npm WebAuth completion URL is missing authId');
  return Object.freeze({ authUrl: authUrl.href, doneUrl: doneUrl.href });
}

function validateUrl(value, origin, pathPrefix) {
  const url = new URL(value);
  assert.equal(url.origin, origin, `unexpected npm WebAuth origin: ${url.origin}`);
  assert.equal(url.username, '', 'npm WebAuth URL must not contain credentials');
  assert.equal(url.password, '', 'npm WebAuth URL must not contain credentials');
  assert.ok(url.pathname.startsWith(pathPrefix), `unexpected npm WebAuth path: ${url.pathname}`);
  assert.ok(url.pathname.length > pathPrefix.length, `npm WebAuth identifier missing: ${url.pathname}`);
  assert.equal(url.href.includes('*'), false, 'npm WebAuth URL was redacted; rerun from an interactive terminal');
  return url;
}

async function pollOnce(fetchImpl, doneUrl, timeoutMilliseconds, timers) {
  const controller = new AbortController();
  const timeout = timers.scheduleTimeout(() => controller.abort(new Error('npm WebAuth polling request timed out')),
    timeoutMilliseconds);
  try {
    const response = await fetchImpl(doneUrl, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: controller.signal,
    });
    const body = response.status === 200 ? await response.json() : undefined;
    if (response.status !== 200) await response.body?.cancel();
    return { body, response };
  } finally {
    timers.cancelTimeout(timeout);
  }
}

function parseJSONDocument(output) {
  const source = String(output ?? '').trim();
  if (source === '') return null;
  try {
    return JSON.parse(source);
  } catch {
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function retryDelay(header) {
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0) return 1_000;
  return Math.min(Math.max(seconds * 1_000, 250), 10_000);
}

function isValidOtp(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 2_048 && !/\s/u.test(value);
}

function announce(authUrl) {
  process.stderr.write(`npm publish requires browser authentication.\nOpen this URL and approve the request:\n${authUrl}\nWaiting for approval…\n`);
}
