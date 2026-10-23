import assert from 'node:assert/strict';
import test from 'node:test';
import { createFileUploadState, tryCreateFileUploadState, applyFileUploadEvent } from '../../.verification-dist/uploads.js';
const file = { name: 'report.txt', type: 'text/plain', size: 2 };
const step = (state, event) => { const result = applyFileUploadEvent(state, event); assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.error)); return result.value; };
const started = () => step(createFileUploadState(file), { type: 'start' });

test('upload construction uses canonical portable metadata admission without native file or body access', () => {
  const portable = { ...file, get bytes() { throw Error('No file body reads'); } };
  const state = createFileUploadState(portable);
  assert.equal(state.file, portable); assert.equal(state.status, 'queued'); assert.equal(state.loaded, 0); assert.equal(state.total, null); assert.ok(Object.isFrozen(state));
  assert.equal(tryCreateFileUploadState({ ...file, name: '' }).error.code, 'form-file-selection-invalid');
  assert.equal(tryCreateFileUploadState({ ...file, size: Infinity }).error.code, 'form-file-selection-invalid');
});
test('an attempt identity rejects another file and retired retry/reset callbacks', () => {
  const first = started(), second = started(); assert.notEqual(first.attempt, second.attempt);
  assert.equal(applyFileUploadEvent(second, { type: 'succeed', attempt: first.attempt, receipt: 'wrong file' }).error.code, 'form-upload-attempt-stale');
  const reset = step(first, { type: 'reset' }), next = step(reset, { type: 'start' });
  assert.notEqual(next.attempt, first.attempt);
  for (const event of [{ type: 'progress', loaded: 1 }, { type: 'succeed', receipt: 'late' }, { type: 'fail', error: 'late' }])
    assert.equal(applyFileUploadEvent(next, { ...event, attempt: first.attempt }).error.code, 'form-upload-attempt-stale');
  assert.equal(next.status, 'uploading'); assert.equal(next.loaded, 0);
});
test('byte progress never fabricates successful completion, including an empty transfer', () => {
  const first = started(), progress = step(first, { type: 'progress', attempt: first.attempt, loaded: 5, total: 5 });
  assert.equal(progress.status, 'uploading'); assert.equal(progress.file.size, 2); assert.equal(progress.loaded, 5);
  const receipt = { remoteID: 'saved-17' }, complete = step(progress, { type: 'succeed', attempt: first.attempt, receipt });
  assert.equal(complete.status, 'succeeded'); assert.equal(complete.receipt, receipt); assert.equal(complete.loaded, 5);
  const zero = started(), empty = step(zero, { type: 'progress', attempt: zero.attempt, loaded: 0, total: 0 });
  assert.equal(empty.status, 'uploading'); assert.equal(empty.total, 0);
  assert.equal(applyFileUploadEvent(complete, { type: 'start' }).error.code, 'form-upload-transition-rejected');
});
test('progress admits safe monotonic bytes and stable known totals with identity-preserving no-ops', () => {
  const first = started();
  assert.equal(step(first, { type: 'progress', attempt: first.attempt, loaded: 0 }), first);
  const known = step(first, { type: 'progress', attempt: first.attempt, loaded: 3, total: 8 });
  assert.equal(step(known, { type: 'progress', attempt: known.attempt, loaded: 3 }), known);
  for (const loaded of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1, 1.5, 2, 9])
    assert.equal(applyFileUploadEvent(known, { type: 'progress', attempt: known.attempt, loaded }).error.code, 'form-upload-progress-invalid');
  for (const total of [null, NaN, Infinity, -1, 2, 9])
    assert.equal(applyFileUploadEvent(known, { type: 'progress', attempt: known.attempt, loaded: 3, total }).error.code, 'form-upload-progress-invalid');
  assert.equal(known.loaded, 3); assert.equal(known.total, 8);
});
test('cancellation/reset invalidate publication without claiming remote rollback and explicit retry starts afresh', () => {
  const queued = createFileUploadState(file); assert.equal(step(queued, { type: 'reset' }), queued);
  const canceled = step(queued, { type: 'cancel' }); assert.equal(step(canceled, { type: 'cancel' }), canceled);
  const active = step(canceled, { type: 'start' }), progress = step(active, { type: 'progress', attempt: active.attempt, loaded: 1 });
  const stopped = step(progress, { type: 'cancel' }); assert.equal(stopped.loaded, 1);
  assert.equal(applyFileUploadEvent(stopped, { type: 'succeed', attempt: active.attempt, receipt: 'remote may have committed' }).error.code, 'form-upload-attempt-stale');
  const retry = step(stopped, { type: 'start' }); assert.equal(retry.loaded, 0); assert.equal(retry.total, null); assert.notEqual(retry.attempt, active.attempt);
  const error = new Error('transport failed'), failed = step(retry, { type: 'fail', attempt: retry.attempt, error }); assert.equal(failed.error, error);
  const again = step(failed, { type: 'start' }); assert.equal(again.status, 'uploading'); assert.equal('error' in again, false);
  const done = step(again, { type: 'succeed', attempt: again.attempt, receipt: 'saved' });
  const reset = step(done, { type: 'reset' }); assert.equal(reset.status, 'queued'); assert.equal('receipt' in reset, false);
});
test('progress reads no admitted file metadata again and malformed events cannot mutate a state', () => {
  let reads = 0; const metadata = Object.fromEntries(['name', 'type', 'size'].map(key => [key, file[key]]));
  for (const key of ['name', 'type', 'size']) Object.defineProperty(metadata, key, { get() { reads++; return file[key]; } });
  let state = step(createFileUploadState(metadata), { type: 'start' }); reads = 0;
  for (let loaded = 0; loaded < 256; loaded++) state = step(state, { type: 'progress', attempt: state.attempt, loaded });
  assert.equal(reads, 0);
  for (const event of [null, { type: 'unknown' }, { get type() { throw Error('invalid type'); } }, { type: 'progress', attempt: state.attempt, get loaded() { throw Error('invalid bytes'); } }])
    assert.equal(applyFileUploadEvent(state, event).error.code, 'form-upload-event-invalid');
  assert.equal(state.status, 'uploading'); assert.equal(state.loaded, 255);
});
