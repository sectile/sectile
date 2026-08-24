import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyFormEvent,
  createFormFieldPath,
  createFormState,
  createFormValues,
  encodeFormFieldPath,
  tryCreateFormState,
  tryCreateFormFieldPath,
  tryCreateFormValues,
} from '../../.verification-dist/form.js';

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
  const submitted = applyFormEvent(state, 'submit').value;
  assert.equal(submitted.state.status, 'invalid');
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
  const requested = applyFormEvent(state, 'submit').value;
  assert.equal(requested.state.status, 'ready');
  assert.deepEqual(requested.commands, [{ type: 'submit-requested' }]);

  state = applyFormEvent(requested.state, 'submit-started').value.state;
  assert.equal(state.status, 'submitting');
  assert.equal(applyFormEvent(state, 'submit').value.state, state);

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  }).value.state;
  assert.equal(failed.status, 'failed');
  assert.equal(failed.valid, false);

  state = applyFormEvent(failed, {
    type: 'replace-issues',
    source: 'server',
    issues: [],
  }).value.state;
  state = applyFormEvent(state, 'submit').value.state;
  state = applyFormEvent(state, 'submit-started').value.state;
  state = applyFormEvent(state, 'submit-succeeded').value.state;
  assert.equal(state.status, 'succeeded');
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
    status: 'failed',
    submitCount: 2,
    submitted: true,
    fields: [
      { id: 'email', touched: true, dirty: true, valid: false, issues: [requiredIssue] },
      { id: 'team', touched: true, dirty: true },
    ],
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  });
  const reset = applyFormEvent(state, 'reset').value;
  assert.equal(reset.state.status, 'idle');
  assert.equal(reset.state.submitCount, 0);
  assert.equal(reset.state.submitted, false);
  assert.equal(reset.state.dirty, false);
  assert.equal(reset.state.valid, true);
  assert.deepEqual(reset.commands, [
    { type: 'reset-field', id: 'email' },
    { type: 'reset-field', id: 'team' },
  ]);
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
