import assert from 'node:assert/strict';
import test from 'node:test';
import { tryMeasureJSON, tryParseJSON, trySnapshotJSON, tryStringifyJSON } from '@sectile/core/json';

const limits = { maxInputBytes: 4096, maxInputValues: 128, maxInputDepth: 8, maxStringCodeUnits: 1024 };
const options = { limits };

test('bounded emission shares exact work and standard JSON bytes without a copied data tree', () => {
  const leaf = { text: '한글💚"\\\n\ud800', zero: -0 };
  for (const input of [null, false, true, -0, 1.25e-20, '', [], {}, { first: leaf, second: leaf, list: [0, null] }]) {
    const result = tryStringifyJSON(input, options);
    assert.equal(result.ok, true);
    assert.equal(result.value.source, JSON.stringify(input));
    assert.deepEqual(result.value.work, tryMeasureJSON(input, options).value);
    assert.equal(Buffer.byteLength(result.value.source), result.value.work.encodedBytes);
    assert.equal(Object.isFrozen(result.value.work), true);
  }
  const inert = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.equal(tryStringifyJSON(inert, options).error.code, 'unsupported-json-data-key');
  assert.equal(tryStringifyJSON(inert, { ...options, prototypeKeys: 'allow' }).value.source, JSON.stringify(inert));
  assert.equal({}.polluted, undefined);
});

test('emission preserves all inclusive limits and rejects hooks, cycles and malformed data without output', () => {
  for (const [input, key, maximum] of [['💚', 'maxInputBytes', 6], [{ value: 0 }, 'maxInputValues', 2], [[[0]], 'maxInputDepth', 2], ['ab', 'maxStringCodeUnits', 2]]) {
    assert.equal(tryStringifyJSON(input, { limits: { ...limits, [key]: maximum } }).ok, true);
    const result = tryStringifyJSON(input, { limits: { ...limits, [key]: maximum - 1 } });
    assert.equal(result.error.code, 'json-data-limit-exceeded');
    assert.equal(Object.hasOwn(result, 'value'), false);
  }
  let calls = 0;
  const hook = () => { calls++; throw new Error('must not execute'); };
  const cycle = {}; cycle.self = cycle;
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const input of [{ toJSON: hook }, Object.defineProperty({}, 'value', { enumerable: true, get: hook }), cycle, revoked.proxy, [,,], { value: Infinity }]) {
    const result = tryStringifyJSON(input, options);
    assert.equal(result.ok, false);
    assert.equal(Object.hasOwn(result, 'value'), false);
  }
  assert.equal(calls, 0);
  const deep = JSON.parse('['.repeat(4096) + '0' + ']'.repeat(4096));
  const result = tryStringifyJSON(deep, { limits: { ...limits, maxInputBytes: 16384, maxInputValues: 4097, maxInputDepth: 4096 } });
  assert.equal(result.value.source, '['.repeat(4096) + '0' + ']'.repeat(4096));
  assert.equal(result.value.work.values, 4097);
  assert.equal(result.value.work.maximumDepth, 4096);
});

test('raw JSON preserves parsed values and original-text work independently of compact encoding', () => {
  const source = ' \n {"items":[null,false,-0,"\\u0061💚"]} \t';
  const result = tryParseJSON(source, options);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.data, JSON.parse(source));
  assert.deepEqual(result.value.work, { sourceCodeUnits: source.length, sourceBytes: Buffer.byteLength(source), values: 6, maximumDepth: 2 });
  assert.equal(Object.isFrozen(result.value.work), true);
  assert.notEqual(tryMeasureJSON(result.value.data, options).value.encodedBytes, result.value.work.sourceBytes);
  for (const source of ['null', 'false', '-0', '1.25e-3', '"hello"', '{}', '[]', ' \n [ {"a": []}, {} ] \t']) {
    assert.deepEqual(tryParseJSON(source, options).value.data, JSON.parse(source));
  }
});

test('raw JSON grammar, decoded duplicate keys and finite values reject without partial data', () => {
  for (const source of ['', '{', '[1,]', '{"a":1,}', '{a:1}', '{"a" 1}', '01', '+1', '1.', '1e', 'truex', '{}{}', '"\\x20"', '"\\u123"', '"\n"', '[}', '{"a":}', 'undefined', 'NaN', '{"id":1,"i\\u0064":2}', '{"a":{"x":1,"x":2}}']) {
    const result = tryParseJSON(source, options);
    assert.equal(result.error.code, 'invalid-json-text', source);
    assert.equal(Object.hasOwn(result, 'value'), false);
  }
  assert.equal(tryParseJSON('1e999', options).error.code, 'invalid-json-data');
  assert.equal(tryParseJSON(null, options).error.code, 'invalid-json-text');
  assert.equal(tryParseJSON('{"left":{"id":1},"right":{"id":2}}', options).ok, true);
  assert.equal(tryParseJSON('{"__proto__":0}', options).error.code, 'unsupported-json-data-key');
  const inert = tryParseJSON('{"__proto__":{"polluted":true}}', { ...options, prototypeKeys: 'allow' });
  assert.equal(Object.hasOwn(inert.value.data, '__proto__'), true);
  assert.equal({}.polluted, undefined);
});

test('raw JSON applies inclusive pre-materialization ceilings and isolated execution policy', () => {
  for (const [source, key, maximum] of [['"💚"', 'maxInputBytes', 6], ['[1,2]', 'maxInputValues', 3], ['[[0]]', 'maxInputDepth', 2], ['"\\u0061\\u0062"', 'maxStringCodeUnits', 2]]) {
    assert.equal(tryParseJSON(source, { limits: { ...limits, [key]: maximum } }).ok, true);
    const result = tryParseJSON(source, { limits: { ...limits, [key]: maximum - 1 } });
    assert.equal(result.error.code, 'json-data-limit-exceeded');
    assert.deepEqual(result.error.details, { kind: 'limit', budget: key, maximum: maximum - 1, observedAtLeast: maximum });
  }
  let calls = 0;
  const getter = () => { calls++; throw new Error('must not read'); };
  const foreign = Object.defineProperty({ ...limits }, 'maxInputBytes', { enumerable: true, get: getter });
  assert.equal(tryParseJSON('{}', { limits: foreign }).error.code, 'invalid-json-data-options');
  assert.equal(calls, 0);
  assert.equal(tryParseJSON('{}', { limits: { ...limits, maxInputValues: 0 } }).error.code, 'invalid-json-data-options');
  const deep = '['.repeat(4096) + '0' + ']'.repeat(4096);
  const result = tryParseJSON(deep, { limits: { ...limits, maxInputBytes: 16384, maxInputValues: 4097, maxInputDepth: 4096 } });
  assert.equal(result.value.work.maximumDepth, 4096);
  assert.equal(result.value.work.values, 4097);
});

test('bounded JSON snapshot and measurement share exact per-occurrence encoding work', () => {
  const leaf = { text: '한글💚"\\\n\ud800', zero: -0 };
  const input = { first: leaf, second: leaf, values: [null, false, 0, 1.25e-20] };
  const copied = trySnapshotJSON(input, options);
  assert.equal(copied.ok, true);
  assert.deepEqual(copied.value.data, input);
  assert.notEqual(copied.value.data.first, leaf);
  assert.notEqual(copied.value.data.first, copied.value.data.second);
  assert.deepEqual(copied.value.work, { values: 12, maximumDepth: 2, encodedBytes: Buffer.byteLength(JSON.stringify(input)) });
  assert.deepEqual(tryMeasureJSON(input, options).value, copied.value.work);
  leaf.text = 'changed';
  assert.notEqual(copied.value.data.first.text, leaf.text);
  assert.equal(Object.isFrozen(copied.value.work), true);
  for (const value of [null, false, 0, -0, '', [], {}]) assert.equal(trySnapshotJSON(value, options).ok, true);
});

test('each positive finite ceiling reports the boundary before admitting a partial result', () => {
  for (const [input, key, maximum] of [
    ['💚', 'maxInputBytes', 6], [{ value: 0 }, 'maxInputValues', 2], [[[0]], 'maxInputDepth', 2], ['ab', 'maxStringCodeUnits', 2],
  ]) {
    const measured = tryMeasureJSON(input, options);
    assert.equal(measured.ok, true);
    const fitting = { limits: { ...limits, [key]: maximum } };
    assert.equal(trySnapshotJSON(input, fitting).ok, true);
    for (const read of [trySnapshotJSON, tryMeasureJSON]) {
      const result = read(input, { limits: { ...limits, [key]: maximum - 1 } });
      assert.equal(result.ok, false);
      assert.equal(result.error.code, maximum === 1 ? 'invalid-json-data-options' : 'json-data-limit-exceeded');
      assert.equal(Object.hasOwn(result, 'value'), false);
      if (maximum > 1) assert.equal(result.error.details.budget, key);
    }
  }
  for (const value of [0, -1, Infinity, NaN, 1.5]) assert.equal(trySnapshotJSON(null, { limits: { ...limits, maxInputBytes: value } }).error.code, 'invalid-json-data-options');
});

test('plain JSON rejects executable/foreign/ambiguous input and never inspects a foreign exception', () => {
  let calls = 0;
  const getter = () => { calls++; throw new Error('must not execute'); };
  const cycle = {}; cycle.self = cycle;
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const throwing = new Proxy({}, { ownKeys() { throw revoked.proxy; } });
  for (const input of [undefined, Infinity, NaN, 1n, () => 0, new Date(), new Map(), cycle, Array(1), Object.assign([], { extra: 0 }), revoked.proxy, throwing, Object.defineProperty({}, 'x', { enumerable: true, get: getter })]) {
    for (const read of [trySnapshotJSON, tryMeasureJSON]) assert.equal(read(input, options).ok, false);
  }
  assert.equal(calls, 0);
  const hooks = { toJSON() { calls++; return 0; } };
  assert.equal(trySnapshotJSON(hooks, options).error.code, 'invalid-json-data');
  assert.equal(calls, 0);
  assert.equal(trySnapshotJSON(null, revoked.proxy).error.code, 'invalid-json-data-options');
  assert.equal(trySnapshotJSON(null, { limits: Object.defineProperty({}, 'maxInputBytes', { enumerable: true, get: getter }) }).ok, false);
  assert.equal(calls, 0);
});

test('explicit prototype-key policy copies inert own properties without prototype mutation', () => {
  const input = JSON.parse('{"__proto__":{"polluted":true},"prototype":0,"constructor":false}');
  assert.equal(trySnapshotJSON(input, options).error.code, 'unsupported-json-data-key');
  const copied = trySnapshotJSON(input, { ...options, prototypeKeys: 'allow' });
  assert.equal(copied.ok, true);
  assert.deepEqual(copied.value.data, input);
  assert.equal(Object.getPrototypeOf(copied.value.data), Object.prototype);
  assert.equal(Object.hasOwn(copied.value.data, '__proto__'), true);
  assert.equal(Object.prototype.polluted, undefined);
  assert.deepEqual(tryMeasureJSON(input, { ...options, prototypeKeys: 'allow' }).value, copied.value.work);
});
