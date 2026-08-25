import assert from 'node:assert/strict';
import test from 'node:test';
import { createForm } from '../dist/form.js';

test('terminal Form navigates fields without owning their values', () => {
  const current = [];
  const form = createForm({
    fields: [
      { id: 'name', name: 'name', label: 'Project name' },
      { id: 'internal', name: 'internal', label: 'Internal metadata', available: false },
      { id: 'region', name: 'region', label: 'Region' },
    ],
    onCurrentFieldChange: (id) => current.push(id),
  });

  assert.equal(form.currentFieldId, 'name');
  assert.equal(form.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(form.currentFieldId, 'region');
  assert.equal(form.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(form.currentFieldId, 'name');
  assert.deepEqual(current, ['region', 'name']);
  assert.equal('value' in form.state.fields[0], false);
});

test('terminal Form focuses and announces the first invalid field on submit', () => {
  let nameValid = false;
  const announcements = [];
  const submissions = [];
  const form = createForm({
    fields: [
      {
        id: 'name',
        label: 'Project name',
        validate: () => ({
          valid: nameValid,
          issues: nameValid ? [] : [{
            id: 'name:required',
            fieldId: 'name',
            source: 'field',
            message: 'Enter a project name.',
          }],
        }),
      },
      { id: 'region', label: 'Region' },
    ],
    defaultCurrentFieldId: 'region',
    onAnnounceSummary: (issues) => announcements.push(issues.map((issue) => issue.message)),
    onSubmit: (details) => submissions.push(details.state.validationStatus),
  });

  assert.equal(form.submit(), true);
  assert.equal(form.state.validationStatus, 'invalid');
  assert.equal(form.currentFieldId, 'name');
  assert.deepEqual(announcements, [['Enter a project name.']]);
  assert.deepEqual(submissions, []);

  nameValid = true;
  assert.equal(form.submit(), true);
  assert.equal(form.state.validationStatus, 'valid');
  assert.deepEqual(submissions, ['valid']);
  const generation = form.submitStarted();
  assert.equal(generation, form.state.submissionGeneration);
  assert.equal(form.state.submissionStatus, 'submitting');
  assert.equal(form.submitSucceeded(generation), true);
  assert.equal(form.state.submissionStatus, 'succeeded');
});

test('terminal Form coordinates reset and server issues without serializing fields', () => {
  const resets = [];
  const form = createForm({
    fields: [
      { id: 'email', name: 'email', label: 'Email', reset: () => resets.push('email') },
      { id: 'team', name: 'team', label: 'Team', reset: () => resets.push('team') },
    ],
  });

  form.refreshField('email', { dirty: true, touched: true });
  assert.equal(form.state.dirty, true);
  assert.equal(form.submit(), true);
  const generation = form.submitStarted();
  assert.equal(generation, form.state.submissionGeneration);
  assert.equal(form.submitFailed(generation, [{
    id: 'email:taken',
    fieldId: 'email',
    source: 'server',
    message: 'This email is already registered.',
  }]), true);
  assert.equal(form.state.submissionStatus, 'failed');
  assert.equal(form.state.fields[0].issues[0].source, 'server');

  assert.equal(form.reset(), true);
  assert.deepEqual(resets, ['email', 'team']);
  assert.equal(form.state.validationStatus, 'idle');
  assert.equal(form.state.submissionStatus, 'idle');
  assert.equal(form.state.dirty, false);
  assert.equal(form.summaryIssues.length, 0);
  assert.equal(form.submitSucceeded(generation), false);
});

test('terminal Form supports dynamic field registration and subscriptions', () => {
  const form = createForm();
  const revisions = [];
  const unsubscribe = form.subscribe((snapshot) => revisions.push(snapshot.revision));
  const unregister = form.registerField({ id: 'query', label: 'Query' });

  assert.equal(form.currentFieldId, 'query');
  assert.deepEqual(form.state.fields.map((field) => field.id), ['query']);
  unregister();
  assert.equal(form.currentFieldId, null);
  assert.deepEqual(form.state.fields, []);
  assert.ok(revisions.length >= 2);
  unsubscribe();
  form.destroy();
});
