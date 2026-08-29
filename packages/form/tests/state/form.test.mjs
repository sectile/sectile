import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyFormEvent,
  clearFormFieldIssues,
  createFormState,
  getFormField,
  getFormFieldIDsByIssueSource,
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
} from '../../.verification-dist/path.js';
import {
  createFormValues,
  tryCreateFormValues,
} from '../../.verification-dist/values.js';

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

test('indexed field commands preserve unrelated identity and make equal writes no-ops', () => {
  const initial = createFormState({
    fields: [
      { id: 'email', name: 'email' },
      { id: 'profile', name: 'profile' },
    ],
  });
  const profile = getFormField(initial, 'profile');
  assert.ok(profile !== null);

  const changed = setFormFieldMeta(initial, 'email', { dirty: true });
  assert.equal(changed.ok, true);
  assert.equal(getFormField(changed.value.state, 'profile'), profile);
  assert.equal(getFormField(changed.value.state, 'email')?.dirty, true);

  const equal = setFormFieldMeta(changed.value.state, 'email', { dirty: true });
  assert.equal(equal.ok, true);
  assert.equal(equal.value.state, changed.value.state);
  assert.deepEqual(equal.value.commands, []);

  const missing = setFormFieldMeta(initial, 'missing', { touched: true });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'form-field-not-registered');
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
    type: 'update-field',
    id: 'email',
    name: 'profile.email',
    touched: true,
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
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: started.validationGeneration,
  }).value;
  assert.equal(submitted.state.validationStatus, 'invalid');
  assert.equal(submitted.state.submissionStatus, 'idle');
  assert.equal(submitted.state.submitCount, 1);
  assert.deepEqual(submitted.commands, [
    { type: 'focus-field', id: 'email' },
    {
      type: 'announce-summary',
      issueIds: ['email-required', 'password-short'],
    },
  ]);
});

test('valid submit has an explicit request, pending, success, and failure lifecycle', () => {
  let state = createFormState({ fields: [{ id: 'email', name: 'email' }] });
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  const requested = applyFormEvent(state, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: state.validationGeneration,
  }).value;
  assert.equal(requested.state.validationStatus, 'valid');
  assert.equal(requested.state.submissionStatus, 'idle');
  assert.deepEqual(requested.commands, [{ type: 'submit-requested', generation: 1 }]);

  state = applyFormEvent(requested.state, { type: 'submit-started', generation: 1 }).value.state;
  assert.equal(state.submissionStatus, 'submitting');

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    generation: 1,
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  }).value.state;
  assert.equal(failed.submissionStatus, 'failed');
  assert.equal(failed.valid, false);

  state = applyFormEvent(failed, {
    type: 'replace-issues',
    source: 'server',
    issues: [],
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: state.validationGeneration,
  }).value.state;
  state = applyFormEvent(state, { type: 'submit-started', generation: state.submissionGeneration }).value.state;
  state = applyFormEvent(state, { type: 'submit-succeeded', generation: state.submissionGeneration }).value.state;
  assert.equal(state.submissionStatus, 'succeeded');
  assert.equal(state.issues.length, 0);
});

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

test('reset clears coordinator metadata and emits participant commands in order', () => {
  const state = createFormState({
    validationStatus: 'invalid',
    validationTrigger: 'submit',
    validationIntent: 'submission',
    submissionStatus: 'failed',
    submitCount: 2,
    submitted: true,
    fields: [
      { id: 'email', touched: true, dirty: true, valid: false, issues: [requiredIssue] },
      { id: 'team', touched: true, dirty: true },
    ],
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  });
  const reset = applyFormEvent(state, 'reset').value;
  assert.equal(reset.state.validationStatus, 'idle');
  assert.equal(reset.state.submissionStatus, 'idle');
  assert.equal(reset.state.submitCount, 0);
  assert.equal(reset.state.submitted, false);
  assert.equal(reset.state.dirty, false);
  assert.equal(reset.state.valid, true);
  assert.deepEqual(reset.commands, [
    { type: 'reset-field', id: 'email' },
    { type: 'reset-field', id: 'team' },
  ]);
});

test('reinitialize establishes a clean baseline without resetting participant values', () => {
  const state = createFormState({
    validationStatus: 'invalid',
    validationTrigger: 'submit',
    validationIntent: 'submission',
    submissionStatus: 'failed',
    submitCount: 2,
    submitted: true,
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
  assert.equal(result.state.validationStatus, 'idle');
  assert.equal(result.state.submissionStatus, 'idle');
  assert.equal(result.state.submitCount, 0);
  assert.equal(result.state.submitted, false);
  assert.deepEqual(result.state.fields[0].issues.map((issue) => issue.id), ['email-required']);
  assert.deepEqual(result.commands, []);
});

test('reinitialize can preserve independent metadata groups while dirty always clears', () => {
  const state = createFormState({
    validationStatus: 'invalid',
    validationTrigger: 'submit',
    validationIntent: 'submission',
    submissionStatus: 'failed',
    submitCount: 1,
    submitted: true,
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
  assert.equal(result.validationStatus, 'invalid');
  assert.equal(result.submissionStatus, 'failed');
  assert.equal(result.submitCount, 1);
  assert.equal(result.submitted, true);
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
  const firstGeneration = state.validationGeneration;
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
    generation: state.validationGeneration,
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validationGeneration,
  }).value.state;
  const firstSubmissionGeneration = state.submissionGeneration;
  state = applyFormEvent(state, {
    type: 'submit-started', generation: firstSubmissionGeneration,
  }).value.state;
  state = applyFormEvent(state, {
    type: 'submit-failed', generation: firstSubmissionGeneration,
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validationGeneration,
  }).value.state;
  const staleSubmission = applyFormEvent(state, {
    type: 'submit-started',
    generation: firstSubmissionGeneration,
  });
  assert.equal(staleSubmission.ok, false);
  assert.equal(staleSubmission.error.code, 'form-submission-generation-stale');
});
