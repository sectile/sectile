import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completeNpmWebAuth,
  parseNpmWebAuthChallenge,
  validateNpmWebAuthChallenge,
} from './lib/npm-publish-auth.mjs';

const challenge = () => ({
  authUrl: 'https://www.npmjs.com/auth/cli/auth-request',
  doneUrl: 'https://registry.npmjs.org/-/v1/done?authId=auth-request',
});

test('parses npm JSON EOTP challenges without exposing unrelated failures', () => {
  assert.deepEqual(parseNpmWebAuthChallenge(JSON.stringify({ error: { code: 'EOTP', ...challenge() } })), challenge());
  assert.equal(parseNpmWebAuthChallenge(JSON.stringify({ error: { code: 'E401' } })), null);
  assert.equal(parseNpmWebAuthChallenge('not json'), null);
});

test('accepts only the fixed npm WebAuth and registry completion endpoints', () => {
  assert.deepEqual(validateNpmWebAuthChallenge(challenge()), challenge());
  assert.throws(() => validateNpmWebAuthChallenge({
    ...challenge(),
    authUrl: 'https://attacker.example/auth/cli/auth-request',
  }), /unexpected npm WebAuth origin/u);
  assert.throws(() => validateNpmWebAuthChallenge({
    ...challenge(),
    doneUrl: 'https://registry.npmjs.org/-/v1/done?authId=***',
  }), /redacted/u);
});

test('waits through pending WebAuth responses and returns the approved one-time token', async () => {
  const responses = [
    new Response(null, { status: 202, headers: { 'retry-after': '0.001' } }),
    Response.json({ token: 'approved-token' }),
  ];
  const waits = [];
  const announced = [];
  const timers = new Set();
  const token = await completeNpmWebAuth(challenge(), {
    announce: (url) => announced.push(url),
    clearTimeout: (timer) => timers.delete(timer),
    fetchImpl: async () => responses.shift(),
    setTimeout: () => {
      const timer = {};
      timers.add(timer);
      return timer;
    },
    wait: async (milliseconds) => waits.push(milliseconds),
  });
  assert.equal(token, 'approved-token');
  assert.deepEqual(waits, [250]);
  assert.deepEqual(announced, [challenge().authUrl]);
  assert.equal(timers.size, 0);
});

test('rejects failed, invalid-token, and expired WebAuth responses', async () => {
  await assert.rejects(() => completeNpmWebAuth(challenge(), {
    announce: () => {},
    fetchImpl: async () => new Response(null, { status: 403 }),
  }), /HTTP 403/u);
  await assert.rejects(() => completeNpmWebAuth(challenge(), {
    announce: () => {},
    fetchImpl: async () => Response.json({ token: '' }),
  }), /invalid one-time token/u);
  await assert.rejects(() => completeNpmWebAuth(challenge(), {
    announce: () => {},
    fetchImpl: async () => new Response(null, { status: 202 }),
    maxPollMilliseconds: 0,
  }), /timed out/u);
});
