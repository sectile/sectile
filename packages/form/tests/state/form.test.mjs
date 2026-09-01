import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyFormEvent,
  clearFormFieldIssues,
  createFormState,
  getFormField,
  getFormFieldIDByPath,
  getFormFieldIDsByIssueSource,
  getFormIssuesBySource,
  removeFormFieldIssue,
  replaceFormFieldIssues,
  setFormFieldMeta,
  tryCreateFormState,
  upsertFormFieldIssue,
} from '../../.verification-dist/state.js';
import {
  appendFormFieldPath,
  createFormFieldPath,
  createFormRelativePath,
  encodeFormFieldPath,
  tryCreateFormFieldPath,
  tryCreateFormRelativePath,
} from '../../.verification-dist/path.js';
import {
  createFormValues,
  tryCreateFormValues,
} from '../../.verification-dist/values.js';

// FRM-10
test('form field paths normalize dot, bracket, and explicit segment syntax', () => {
  assert.deepEqual(createFormFieldPath('profile.name'), ['profile', 'name']);
  assert.deepEqual(createFormFieldPath('addresses[0].city'), ['addresses', 0, 'city']);
  assert.deepEqual(createFormFieldPath('profile[email]'), ['profile', 'email']);
  assert.equal(
    encodeFormFieldPath(['addresses', 0, 'city']),
    'addresses[0].city',
  );
  assert.equal(tryCreateFormFieldPath('profile..name').ok, false);
  assert.equal(tryCreateFormFieldPath(['items', -1, 'name']).ok, false);
  assert.equal(tryCreateFormFieldPath([0, 'name']).ok, false);
  assert.deepEqual(createFormRelativePath(0), [0]);
  assert.deepEqual(createFormRelativePath('start.date'), ['start', 'date']);
  assert.deepEqual(
    appendFormFieldPath('filters.price', [0]),
    ['filters', 'price', 0],
  );
  for (const path of [['profile', 'name'], ['addresses', 0, 'city'], ['items', 12]]) {
    assert.deepEqual(createFormFieldPath(encodeFormFieldPath(path)), path);
  }
});

test('form values build immutable nested objects, indexed arrays, and repeated leaves', () => {
  const values = createFormValues([
    { path: 'profile.name', value: 'Mina' },
    { path: 'addresses[0].city', value: 'Seoul' },
    { path: ['addresses', 1, 'city'], value: 'Busan' },
    { path: 'roles', value: 'admin' },
    { path: 'roles', value: 'reviewer' },
    { path: 'profile.note', value: '' },
  ]);

  assert.equal(Object.getPrototypeOf(values), null);
  assert.deepEqual({ ...values.profile }, { name: 'Mina', note: '' });
  assert.deepEqual(values.addresses.map((address) => ({ ...address })), [
    { city: 'Seoul' },
    { city: 'Busan' },
  ]);
  assert.deepEqual(values.roles, ['admin', 'reviewer']);
  assert.equal(Object.isFrozen(values), true);
  assert.equal(Object.isFrozen(values.addresses), true);
  assert.equal(Object.isFrozen(values.roles), true);
});

test('form values preserve opaque values and reject leaf-container collisions', () => {
  const file = { name: 'avatar.png' };
  const values = createFormValues([{ path: 'profile.avatar', value: file }]);
  assert.equal(values.profile.avatar, file);

  const leafFirst = tryCreateFormValues([
    { path: 'profile', value: 'Mina' },
    { path: 'profile.name', value: 'Mina' },
  ]);
  assert.equal(leafFirst.ok, false);
  assert.equal(leafFirst.error.code, 'form-value-path-collision');

  const objectFirst = tryCreateFormValues([
    { path: 'profile.name', value: 'Mina' },
    { path: 'profile', value: 'Mina' },
  ]);
  assert.equal(objectFirst.ok, false);
  assert.equal(objectFirst.error.code, 'form-value-path-collision');

  assert.equal(tryCreateFormValues([
    { path: 'items[0]', value: 'first' },
    { path: 'items.name', value: 'invalid' },
  ]).ok, false);
});

const requiredIssue = {
  id: 'email-required',
  fieldId: 'email',
  message: 'Enter an email address.',
  source: 'field',
};

test('form state preserves numeric and textual field identities independently', () => {
  const state = createFormState({
    fields: [
      { id: 1, name: 'numeric' },
      { id: '1', name: 'textual' },
    ],
  });
  assert.equal(getFormField(state, 1)?.name, 'numeric');
  assert.equal(getFormField(state, '1')?.name, 'textual');
  assert.notEqual(getFormField(state, 1), getFormField(state, '1'));
});

test('indexed field commands preserve unrelated identity and make equal writes no-ops', () => {
  const initial = createFormState({
    fields: [
      { id: 'email', name: 'email' },
      { id: 'profile', name: 'profile' },
    ],
  });
  const profile = getFormField(initial, 'profile');
  const validation = initial.validation;
  const submission = initial.submission;
  assert.ok(profile !== null);

  const changed = setFormFieldMeta(initial, 'email', { dirty: true });
  assert.equal(changed.ok, true);
  assert.equal(getFormField(changed.value.state, 'profile'), profile);
  assert.equal(getFormField(changed.value.state, 'email')?.dirty, true);
  assert.equal(changed.value.state.validation, validation);
  assert.equal(changed.value.state.submission, submission);

  const equal = setFormFieldMeta(changed.value.state, 'email', { dirty: true });
  assert.equal(equal.ok, true);
  assert.equal(equal.value.state, changed.value.state);
  assert.deepEqual(equal.value.commands, []);

  const missing = setFormFieldMeta(initial, 'missing', { touched: true });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'form-field-id-missing');
});

test('indexed issue commands update only the selected owner and retained source index', () => {
  const issue = {
    id: 'email-server',
    fieldId: 'email',
    message: 'Already used.',
    source: 'server',
  };
  const initial = createFormState({
    fields: [
      { id: 'email', name: 'email' },
      { id: 'profile', name: 'profile' },
    ],
  });
  const profile = getFormField(initial, 'profile');

  const replaced = replaceFormFieldIssues(initial, 'email', 'server', [issue]);
  assert.equal(replaced.ok, true);
  assert.equal(getFormField(replaced.value.state, 'profile'), profile);
  assert.deepEqual(getFormFieldIDsByIssueSource(replaced.value.state, 'server'), ['email']);
  assert.equal(replaced.value.state.valid, false);

  const upserted = upsertFormFieldIssue(replaced.value.state, 'email', {
    ...issue,
    message: 'Use another address.',
  });
  assert.equal(upserted.ok, true);
  assert.equal(getFormField(upserted.value.state, 'email')?.issues[0].message, 'Use another address.');

  const absent = removeFormFieldIssue(upserted.value.state, 'email', 'absent');
  assert.equal(absent.ok, true);
  assert.equal(absent.value.state, upserted.value.state);

  const removed = removeFormFieldIssue(upserted.value.state, 'email', issue.id);
  assert.equal(removed.ok, true);
  assert.deepEqual(getFormFieldIDsByIssueSource(removed.value.state, 'server'), []);

  const cleared = clearFormFieldIssues(replaced.value.state, 'email', 'server');
  assert.equal(cleared.ok, true);
  assert.equal(cleared.value.state.valid, true);
});

test('form registry preserves order and derives aggregate field state', () => {
  let state = createFormState({
    fields: [
      { id: 'email', name: 'email' },
      { id: 'team', name: 'team', touched: true, dirty: true },
    ],
  });
  assert.deepEqual(state.fields.map((field) => field.id), ['email', 'team']);
  assert.equal(state.touched, true);
  assert.equal(state.dirty, true);

  state = applyFormEvent(state, {
    type: 'register-field',
    field: { id: 'email', name: 'account-email', dirty: true },
  }).value.state;
  assert.deepEqual(state.fields.map((field) => field.id), ['email', 'team']);
  assert.equal(state.fields[0].name, 'account-email');

  state = applyFormEvent(state, {
    type: 'set-field-meta',
    id: 'email',
    meta: {
      name: 'profile.email',
      touched: true,
    },
  }).value.state;
  assert.equal(state.fields[0].name, 'profile.email');
  assert.equal(state.fields[0].touched, true);
  assert.equal(state.fields[0].dirty, true);

  state = applyFormEvent(state, {
    type: 'reorder-fields',
    ids: ['team', 'email'],
  }).value.state;
  assert.deepEqual(state.fields.map((field) => field.id), ['team', 'email']);

  state = applyFormEvent(state, { type: 'unregister-field', id: 'team' }).value.state;
  assert.deepEqual(state.fields.map((field) => field.id), ['email']);
});

// FRM-11
test('invalid submit focuses the first invalid field and announces its issues', () => {
  const state = createFormState({
    fields: [
      { id: 'email', valid: false, issues: [requiredIssue] },
      {
        id: 'password',
        valid: false,
        issues: [{
          id: 'password-short',
          fieldId: 'password',
          message: 'Use at least twelve characters.',
          source: 'field',
        }],
      },
    ],
  });
  const started = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  const submitted = applyFormEvent(started, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: started.validation.generation,
  }).value;
  assert.equal(submitted.state.validation.status, 'invalid');
  assert.equal(submitted.state.submission.status, 'idle');
  assert.equal(submitted.state.submission.count, 1);
  assert.deepEqual(submitted.commands, [
    { type: 'focus-field', id: 'email' },
    {
      type: 'announce-summary',
      issueIds: ['email-required', 'password-short'],
    },
  ]);
});

test('invalid input revalidation preserves focus while announcing submission issues', () => {
  const state = createFormState({
    fields: [
      { id: 'current-password' },
      {
        id: 'new-password',
        valid: false,
        issues: [{
          id: 'new-password-required',
          fieldId: 'new-password',
          message: 'Enter a new password.',
          source: 'field',
        }],
      },
    ],
  });
  const started = applyFormEvent(state, {
    type: 'validation-started', trigger: 'input', intent: 'submission',
  }).value.state;
  const revalidated = applyFormEvent(started, {
    type: 'validation-completed',
    trigger: 'input',
    intent: 'submission',
    generation: started.validation.generation,
  }).value;

  assert.deepEqual(revalidated.commands, [{
    type: 'announce-summary',
    issueIds: ['new-password-required'],
  }]);
});

test('valid submit has an explicit request, pending, success, and failure lifecycle', () => {
  let state = createFormState({ fields: [{ id: 'email', name: 'email' }] });
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  const requested = applyFormEvent(state, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: state.validation.generation,
  }).value;
  assert.equal(requested.state.validation.status, 'valid');
  assert.equal(requested.state.submission.status, 'idle');
  assert.deepEqual(requested.commands, [{ type: 'submit-requested', generation: 1 }]);

  state = applyFormEvent(requested.state, { type: 'submit-started', generation: 1 }).value.state;
  assert.equal(state.submission.status, 'submitting');

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    generation: 1,
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  }).value.state;
  assert.equal(failed.submission.status, 'failed');
  assert.equal(failed.valid, false);

  state = applyFormEvent(failed, {
    type: 'replace-issues',
    source: 'server',
    issues: [],
  }).value.state;
  assert.equal(state.validation.status, 'idle');
  assert.equal(state.submission.status, 'idle');
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: state.validation.generation,
  }).value.state;
  state = applyFormEvent(state, { type: 'submit-started', generation: state.submission.generation }).value.state;
  state = applyFormEvent(state, { type: 'submit-succeeded', generation: state.submission.generation }).value.state;
  assert.equal(state.submission.status, 'succeeded');
  assert.equal(state.issues.length, 0);
});

// FRM-08
test('issue replacement preserves other sources and unregistered server issues', () => {
  let state = createFormState({
    fields: [{ id: 'email', valid: false, issues: [requiredIssue] }],
    issues: [{ id: 'form-policy', message: 'Review the form.', source: 'form' }],
  });
  state = applyFormEvent(state, {
    type: 'replace-issues',
    source: 'server',
    issues: [
      {
        id: 'email-used',
        fieldId: 'email',
        message: 'That email is already registered.',
        source: 'server',
      },
      {
        id: 'account-locked',
        fieldId: 'missing-field',
        message: 'The account is locked.',
        source: 'server',
      },
    ],
  }).value.state;
  assert.deepEqual(
    state.fields[0].issues.map((issue) => issue.id),
    ['email-required', 'email-used'],
  );
  assert.deepEqual(
    state.issues.map((issue) => issue.id),
    ['form-policy', 'account-locked'],
  );
});

// FRM-09
test('multi-field server issues stay canonical and clear when a related value changes', () => {
  const issue = {
    id: 'lookup-mismatch',
    message: 'Check the order number and email.',
    source: 'server',
    relatedFieldIds: ['order-number', 'email'],
  };
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 1, failure: null },
    fields: [
      { id: 'order-number', name: 'orderNumber' },
      { id: 'email', name: 'email' },
    ],
    issues: [issue],
  });

  assert.equal(state.allIssues.length, 1);
  assert.equal(state.fields[0].relatedIssues[0], state.allIssues[0]);
  assert.equal(state.fields[1].relatedIssues[0], state.allIssues[0]);
  assert.equal(state.fields[0].valid, false);
  assert.equal(state.fields[1].valid, false);
  assert.deepEqual(getFormIssuesBySource(state, 'server'), state.allIssues);
  assert.equal(getFormFieldIDByPath(state, 'orderNumber.value'), 'order-number');

  const changed = applyFormEvent(state, {
    type: 'field-value-changed',
    id: 'email',
  }).value.state;

  assert.equal(changed.valid, true);
  assert.deepEqual(changed.allIssues, []);
  assert.equal(changed.fields[0].valid, true);
  assert.equal(changed.fields[1].valid, true);
  assert.equal(changed.validation.status, 'idle');
  assert.equal(changed.submission.status, 'idle');
});

test('multi-field submit issues focus their primary field before earlier related fields', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'valid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'submitting', count: 1, failure: null },
    fields: [
      { id: 'order-number', name: 'orderNumber' },
      { id: 'email', name: 'email' },
    ],
  });

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    generation: 1,
    issues: [{
      id: 'lookup-mismatch',
      fieldId: 'email',
      relatedFieldIds: ['order-number'],
      message: 'Check the order number and email.',
      source: 'server',
    }],
  }).value;

  assert.equal(failed.state.validation.status, 'invalid');
  assert.deepEqual(failed.commands[0], { type: 'focus-field', id: 'email' });
});

test('direct issue mutations invalidate settled validation snapshots', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'valid', trigger: 'blur', intent: 'interaction' },
    fields: [{ id: 'email', name: 'email' }],
  });

  const changed = applyFormEvent(state, {
    type: 'replace-field-issues',
    id: 'email',
    source: 'field',
    issues: [{ id: 'required', message: 'Required.', source: 'field' }],
  }).value.state;

  assert.equal(changed.valid, false);
  assert.equal(changed.validation.status, 'idle');
  assert.equal(changed.validation.trigger, null);
  assert.equal(changed.validation.intent, null);
});

test('VAL-033: related server issue clearing changes only affected field identities', () => {
  const fieldCount = 4_096;
  const fields = Array.from({ length: fieldCount }, (_, index) => ({ id: `field-${index}` }));
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 1, failure: null },
    fields,
    issues: [{
      id: 'related-server',
      message: 'Check both fields.',
      source: 'server',
      relatedFieldIds: ['field-0', 'field-1'],
    }],
  });

  const changed = applyFormEvent(state, {
    type: 'field-value-changed',
    id: 'field-1',
  }).value.state;
  const changedFieldIdentities = changed.fields.reduce(
    (count, field, index) => count + Number(field !== state.fields[index]),
    0,
  );

  assert.equal(changedFieldIdentities, 2);
  assert.equal(changed.allIssues.length, 0);
});

test('submission failures do not create validation issues or move field focus', () => {
  let state = createFormState({ fields: [{ id: 'email', name: 'email' }] });
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  const requested = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validation.generation,
  }).value;
  state = applyFormEvent(requested.state, {
    type: 'submit-started',
    generation: requested.state.submission.generation,
  }).value.state;

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    generation: state.submission.generation,
    failure: { message: 'Please try again.' },
  }).value;

  assert.equal(failed.state.valid, true);
  assert.deepEqual(failed.state.allIssues, []);
  assert.deepEqual(failed.state.submission.failure, { message: 'Please try again.' });
  assert.deepEqual(failed.commands, [{ type: 'announce-submission-failure' }]);
});

test('reset clears coordinator metadata and emits participant commands in order', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 2, failure: null },
    fields: [
      { id: 'email', touched: true, dirty: true, valid: false, issues: [requiredIssue] },
      { id: 'team', touched: true, dirty: true },
    ],
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  });
  const reset = applyFormEvent(state, 'reset').value;
  assert.equal(reset.state.validation.status, 'idle');
  assert.equal(reset.state.submission.status, 'idle');
  assert.equal(reset.state.submission.count, 0);
  assert.equal(reset.state.dirty, false);
  assert.equal(reset.state.valid, true);
  assert.deepEqual(reset.commands, [
    { type: 'reset-field', id: 'email' },
    { type: 'reset-field', id: 'team' },
  ]);
});

test('FRM-04: malformed path, value, and state construction returns typed failures', () => {
  const cases = [
    [tryCreateFormFieldPath(null), 'form-field-path-root-invalid'],
    [tryCreateFormRelativePath(null), 'form-relative-path-invalid'],
    [tryCreateFormValues(null), 'form-value-entry-invalid'],
    [tryCreateFormValues([null]), 'form-value-entry-invalid'],
    [tryCreateFormState(null), 'form-state-input-invalid'],
    [tryCreateFormState({ fields: null }), 'form-state-input-invalid'],
    [tryCreateFormState({ fields: [null] }), 'form-state-input-invalid'],
  ];
  for (const [result, code] of cases) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }
});

test('FRM-05: construction ceilings fail before unbounded output and deep paths stay iterative', () => {
  const ceilingCases = [
    [tryCreateFormFieldPath('abcd', { maxPathCodeUnits: 3 }), 'form-path-code-unit-ceiling-exceeded'],
    [tryCreateFormFieldPath(['root', 'nested'], { maxPathSegments: 1 }), 'form-path-segment-ceiling-exceeded'],
    [tryCreateFormFieldPath(['items', 2], { maxArrayIndex: 1 }), 'form-array-index-ceiling-exceeded'],
    [tryCreateFormValues([{ path: 'a', value: 1 }, { path: 'b', value: 2 }], { maxEntries: 1 }), 'form-entry-ceiling-exceeded'],
    [tryCreateFormValues([{ path: 'a.b', value: 1 }], { maxOutputNodes: 2 }), 'form-output-node-ceiling-exceeded'],
    [tryCreateFormState({ fields: [{ id: 'a' }, { id: 'b' }] }, { maxEntries: 1 }), 'form-entry-ceiling-exceeded'],
  ];
  for (const [result, code] of ceilingCases) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }

  const deepPath = ['root', ...Array.from({ length: 1_200 }, (_, index) => `p${index}`)];
  const deep = tryCreateFormValues([{ path: deepPath, value: 'leaf' }], {
    maxPathSegments: 1_500,
    maxOutputNodes: 1_500,
    maxPathCodeUnits: 20_000,
  });
  assert.equal(deep.ok, true);
  assert.equal(Object.isFrozen(deep.value), true);
});

test('FRM-06: only library-owned branches and repeated wrappers are frozen', () => {
  const callerArray = [];
  const callerObject = { mutable: true };
  const values = createFormValues([
    { path: 'single.array', value: callerArray },
    { path: 'single.object', value: callerObject },
    { path: 'repeated', value: callerArray },
    { path: 'repeated', value: callerObject },
  ]);
  assert.equal(values.single.array, callerArray);
  assert.equal(values.single.object, callerObject);
  assert.deepEqual(values.repeated, [callerArray, callerObject]);
  assert.equal(Object.isFrozen(values.single), true);
  assert.equal(Object.isFrozen(values.repeated), true);
  assert.equal(Object.isFrozen(callerArray), false);
  assert.equal(Object.isFrozen(callerObject), false);
  callerArray.push('still mutable');
  callerObject.mutable = false;
  assert.deepEqual(callerArray, ['still mutable']);
  assert.equal(callerObject.mutable, false);
});

test('FRM-03: unknown form events reject atomically without resetting state', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 2, failure: { message: 'Submission failed.' } },
    fields: [{ id: 'email', touched: true, dirty: true, valid: false, issues: [requiredIssue] }],
  });
  const before = structuredClone(state);

  for (const event of ['unknown', { type: 'unknown' }, null, 1, true, undefined]) {
    const result = applyFormEvent(state, event);
    assert.equal(result.ok, false);
    assert.equal(result.error.class, 'transition-rejection');
    assert.equal(result.error.code, 'form-event-invalid');
    assert.deepEqual(state, before);
  }
});

// FRM-07
test('reinitialize establishes a clean baseline without resetting participant values', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 2, failure: null },
    fields: [
      {
        id: 'email',
        touched: true,
        dirty: true,
        valid: false,
        issues: [
          requiredIssue,
          { id: 'email-native', fieldId: 'email', message: 'Invalid.', source: 'native' },
          { id: 'email-server', fieldId: 'email', message: 'Taken.', source: 'server' },
        ],
      },
    ],
  });

  const result = applyFormEvent(state, { type: 'reinitialize' }).value;

  assert.equal(result.state.dirty, false);
  assert.equal(result.state.touched, false);
  assert.equal(result.state.validation.status, 'idle');
  assert.equal(result.state.submission.status, 'idle');
  assert.equal(result.state.submission.count, 0);
  assert.deepEqual(result.state.fields[0].issues.map((issue) => issue.id), ['email-required']);
  assert.deepEqual(result.commands, []);
});

test('reinitialize can preserve independent metadata groups while dirty always clears', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 1, failure: null },
    fields: [{
      id: 'email',
      touched: true,
      dirty: true,
      valid: false,
      issues: [
        { id: 'native', fieldId: 'email', message: 'Invalid.', source: 'native' },
        { id: 'server', fieldId: 'email', message: 'Taken.', source: 'server' },
      ],
    }],
  });

  const result = applyFormEvent(state, {
    type: 'reinitialize',
    options: { preserve: { touched: true, validation: true, submission: true } },
  }).value.state;

  assert.equal(result.dirty, false);
  assert.equal(result.touched, true);
  assert.equal(result.validation.status, 'invalid');
  assert.equal(result.submission.status, 'failed');
  assert.equal(result.submission.count, 1);
  assert.deepEqual(result.fields[0].issues.map((issue) => issue.id), ['native', 'server']);
});

test('constructors reject duplicate fields and malformed issue ownership', () => {
  assert.equal(tryCreateFormState({ fields: [{ id: 'email' }, { id: 'email' }] }).ok, false);
  assert.equal(tryCreateFormState({
    fields: [{
      id: 'email',
      issues: [{ ...requiredIssue, fieldId: 'other' }],
    }],
  }).ok, false);
});

test('FRM-01, FRM-02: form generations reject stale validation and submission results atomically', () => {
  let state = createFormState({ fields: [{ id: 'email' }] });
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'input', intent: 'interaction',
  }).value.state;
  const firstGeneration = state.validation.generation;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'input', intent: 'interaction',
  }).value.state;
  const staleValidation = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'input',
    intent: 'interaction',
    generation: firstGeneration,
  });
  assert.equal(staleValidation.ok, false);
  assert.equal(staleValidation.error.code, 'form-validation-generation-stale');

  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'input',
    intent: 'interaction',
    generation: state.validation.generation,
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validation.generation,
  }).value.state;
  const firstSubmissionGeneration = state.submission.generation;
  state = applyFormEvent(state, {
    type: 'submit-started', generation: firstSubmissionGeneration,
  }).value.state;
  state = applyFormEvent(state, {
    type: 'submit-failed', generation: firstSubmissionGeneration,
    failure: { message: 'Try again.' },
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validation.generation,
  }).value.state;
  const staleSubmission = applyFormEvent(state, {
    type: 'submit-started',
    generation: firstSubmissionGeneration,
  });
  assert.equal(staleSubmission.ok, false);
  assert.equal(staleSubmission.error.code, 'form-submission-generation-stale');
});
