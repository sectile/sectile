import assert from 'node:assert/strict';
import test from 'node:test';
import { createFilePolicy, tryCreateFilePolicy } from '../../.verification-dist/files.js';
import { FormResultError } from '../../.verification-dist/error.js';
const file = (name, size = 1, type = '') => ({ name, size, type });

test('file policy atomically admits metadata and preserves opaque file identities without mutating callers', () => {
  const first = file('invoice.PDF', 4), second = file('photo', 3, 'image/png'), input = [first, second];
  const options = { multiple: true, accept: ' .pdf, IMAGE/* ', maxFiles: 2, maxTotalSize: 7 };
  const policy = createFilePolicy(options); options.accept = '.exe';
  const accepted = policy.validate(input);
  assert.equal(policy.accept, '.pdf,image/*'); assert.equal(accepted.ok, true);
  assert.equal(accepted.value.totalSize, 7); assert.ok(accepted.value.files[0] === first); assert.ok(accepted.value.files[1] === second);
  assert.ok(accepted.value.files !== input); assert.ok(Object.isFrozen(accepted.value)); assert.ok(Object.isFrozen(accepted.value.files));
  assert.equal(Object.isFrozen(first), false); input.length = 0; assert.equal(accepted.value.files.length, 2);
  const rejected = policy.validate([first, file('payload.exe')]);
  assert.equal(rejected.ok, false); assert.equal(rejected.error.code, 'form-file-type-rejected'); assert.equal(rejected.error.details.index, 1);
  assert.equal('value' in rejected, false); assert.equal(policy.validate([]).value.totalSize, 0);
});
test('file policy admits indexed native-list shapes directly with one bounded snapshot', () => {
  const item = file('invoice.pdf', 2); let lengths = 0, indexes = 0;
  const source = { get length() { lengths++; return 1; }, get 0() { indexes++; return item; },
    [Symbol.iterator]() { throw Error('native lists do not require iteration'); } };
  const result = createFilePolicy({ accept: '.pdf' }).validate(source);
  assert.equal(result.ok, true); assert.equal(lengths, 1); assert.equal(indexes, 1); assert.ok(result.value.files[0] === item);
  const oversized = { length: 2, get 0() { throw Error('count must reject before indexing'); } };
  assert.equal(createFilePolicy().validate(oversized).error.code, 'form-file-count-exceeded');
});

test('file policies enforce single mode, file and total byte constraints including overflow and zero', () => {
  assert.equal(createFilePolicy().validate([file('a'), file('b')]).error.code, 'form-file-count-exceeded');
  assert.equal(createFilePolicy({ maxFileSize: 0 }).validate([file('empty', 0)]).ok, true);
  assert.equal(createFilePolicy({ maxFileSize: 0 }).validate([file('a')]).error.code, 'form-file-size-exceeded');
  assert.equal(createFilePolicy({ multiple: true, maxTotalSize: 3 }).validate([file('a', 2), file('b', 2)]).error.code, 'form-file-total-size-exceeded');
  const overflow = createFilePolicy({ multiple: true }).validate([file('a', Number.MAX_SAFE_INTEGER), file('b')]);
  assert.equal(overflow.error.code, 'form-file-total-size-exceeded');
});
test('file policy accept matching supports compound suffixes and ASCII-only case folding', () => {
  for (const [accept, name, type, expected] of [
    ['.gz,.tar.gz,.zip', 'backup.TAR.GZ', '', true], ['.tar.gz', 'backup.tar', '', false],
    ['.pdf', 'pdf', '', false], ['.pdf', 'invoice.pdf.exe', '', false], ['.k', 'a.\u212a', '', false],
    ['application/pdf', 'no-extension', 'APPLICATION/PDF', true], ['image/*', 'photo', 'image/png', true],
    ['image/*', 'photo', '', false], ['.pdf,image/*', 'invoice.pdf', 'application/octet-stream', true],
  ]) assert.equal(createFilePolicy({ accept }).validate([file(name, 1, type)]).ok, expected, `${accept}: ${name}`);
});
test('compiled file suffix lookup matches an independent linear oracle across overlapping policy sets', () => {
  const candidates = ['.a', '.b.a', '.c.a', '.a.b', '.b', '.zip'];
  const names = ['', 'x', 'x.a', 'x.b.a', 'x.c.a', 'x.a.b', 'x.zip', 'x.c.a.zip', 'x.a.exe', 'x.a.b.a'];
  for (let mask = 1; mask < 64; mask++) {
    const extensions = candidates.filter((_candidate, index) => mask & (1 << index));
    const policy = createFilePolicy({ accept: extensions.join(',') });
    for (const name of names) assert.equal(policy.validate([file(name)]).ok, Boolean(name) && extensions.some(extension => name.endsWith(extension)));
  }
});
test('file policy construction rejects malformed settings and captures only fixed data properties', () => {
  for (const options of [null, [], { multiple: null }, { multiple: 1 }, { maxFiles: 0 }, { maxFiles: 2 }, { maxFileSize: -1 }, { maxTotalSize: NaN },
    { maxMetadataCodeUnits: 0 }, { maxAcceptCodeUnits: 1, accept: '.pdf' }, { accept: 'image/*,IMAGE/*' }, { accept: '.pdf,' },
    { accept: 'text/*' }, { accept: 'image/png;charset=utf8' }, { accept: '.a/b' }, { accept: '.' }, { accept: ', ' }]) {
    const result = tryCreateFilePolicy(options); assert.equal(result.ok, false, JSON.stringify(options)); assert.equal(result.error.code, 'form-file-policy-invalid');
    assert.throws(() => createFilePolicy(options), error => error instanceof FormResultError && error.code === result.error.code);
  }
  let reads = 0;
  assert.equal(tryCreateFilePolicy({ get accept() { reads++; return '.pdf'; } }).ok, false); assert.equal(reads, 0);
  const options = new Proxy({}, { getOwnPropertyDescriptor() { throw Error('unreadable'); } });
  assert.equal(tryCreateFilePolicy(options).error.code, 'form-file-policy-invalid');
  const { proxy, revoke } = Proxy.revocable({}, {}); revoke();
  assert.equal(tryCreateFilePolicy(proxy).error.code, 'form-file-policy-invalid');
});
test('file policy bounds external metadata reads and never calls caller iterators or reads file bodies', () => {
  let reads = 0, bodies = 0;
  const files = Array.from({ length: 1024 }, () => ({ get name() { reads++; return 'x.pdf'; }, get size() { reads++; return 1; },
    get type() { reads++; return ''; }, arrayBuffer() { bodies++; throw Error('no body reads'); } }));
  files[Symbol.iterator] = () => { throw Error('no caller iterator'); };
  assert.equal(createFilePolicy({ multiple: true, maxFiles: 1023 }).validate(files).error.code, 'form-file-count-exceeded'); assert.equal(reads, 0);
  assert.equal(createFilePolicy({ multiple: true, accept: '.pdf', maxFiles: 1024 }).validate(files).value.totalSize, 1024);
  assert.equal(reads, 3 * files.length); assert.equal(bodies, 0);
  assert.equal(createFilePolicy({ maxMetadataCodeUnits: 4 }).validate([file('x.pdf')]).error.code, 'form-file-metadata-ceiling-exceeded');
  for (const values of [null, {}, [null], [file('', 0)], [file('x', -1)], [file('x', Infinity)], [{ get name() { throw Error('unreadable'); } }]]) {
    assert.equal(createFilePolicy().validate(values).error.code, 'form-file-selection-invalid');
  }
  const { proxy, revoke } = Proxy.revocable([], {}); revoke();
  assert.equal(createFilePolicy().validate(proxy).error.code, 'form-file-selection-invalid');
});
