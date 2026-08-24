import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createForm } from '../dist/form.js';

function installDOM() {
  const window = new Window({ url: 'https://sectile.dev/forms' });
  const previous = {
    FormData: globalThis.FormData,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
  };
  globalThis.FormData = window.FormData;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  return {
    window,
    restore() {
      globalThis.FormData = previous.FormData;
      globalThis.HTMLElement = previous.HTMLElement;
      globalThis.Node = previous.Node;
      window.close();
    },
  };
}

test('DOM Form coordinates native invalid submission and accessible focus recovery', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    const summary = document.createElement('div');
    email.name = 'email';
    email.required = true;
    formElement.append(email, summary);
    document.body.append(formElement);

    const form = createForm({
      form: formElement,
      summary,
      participants: [{ id: 'email', element: email }],
    });

    formElement.requestSubmit();
    await Promise.resolve();

    assert.equal(form.state.status, 'invalid');
    assert.equal(form.state.submitCount, 1);
    assert.equal(form.state.fields[0].touched, true);
    assert.equal(form.state.fields[0].issues[0].source, 'native');
    assert.equal(document.activeElement, email);
    assert.equal(summary.hidden, false);
    assert.notEqual(summary.textContent.trim(), '');
    assert.equal(formElement.dataset.scope, 'form');
    assert.equal(email.dataset.part, 'field');
  } finally {
    dom.restore();
  }
});

test('DOM Form reads successful native controls through FormData and observes submission lifecycle', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    const ignored = document.createElement('input');
    email.name = 'email';
    email.value = 'team@sectile.dev';
    ignored.value = 'browser omits unnamed controls';
    formElement.append(email, ignored);
    document.body.append(formElement);
    let entries = [];
    let values;

    const form = createForm({
      form: formElement,
      participants: [{ id: 'email', element: email }],
      onSubmit(details) {
        details.event.preventDefault();
        entries = [...details.formData.entries()];
        values = details.values;
      },
    });

    email.value = 'release@sectile.dev';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    formElement.requestSubmit();

    assert.deepEqual(entries, [['email', 'release@sectile.dev']]);
    assert.equal(values.email, 'release@sectile.dev');
    assert.equal(form.state.fields[0].dirty, true);
    assert.equal(form.state.status, 'ready');
    assert.equal(form.submitStarted(), true);
    assert.equal(form.state.status, 'submitting');
    assert.equal(form.submitFailed([{
      id: 'email:taken',
      fieldId: 'email',
      source: 'server',
      message: 'This email is already registered.',
    }]), true);
    assert.equal(form.state.status, 'failed');
    assert.equal(form.state.fields[0].issues[0].source, 'server');
  } finally {
    dom.restore();
  }
});

test('DOM Form derives nested values from the exact submitter-aware successful controls', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    const city = document.createElement('input');
    const firstTag = document.createElement('input');
    const secondTag = document.createElement('input');
    const disabled = document.createElement('input');
    const submitter = document.createElement('button');
    email.name = 'profile.email';
    email.value = 'team@sectile.dev';
    city.name = 'addresses[0].city';
    city.value = 'Seoul';
    firstTag.name = 'tags';
    firstTag.value = 'vue';
    secondTag.name = 'tags';
    secondTag.value = 'a11y';
    disabled.name = 'ignored';
    disabled.value = 'not successful';
    disabled.disabled = true;
    submitter.type = 'submit';
    submitter.name = 'intent.action';
    submitter.value = 'save';
    formElement.append(email, city, firstTag, secondTag, disabled, submitter);
    document.body.append(formElement);
    let details;

    createForm({
      form: formElement,
      onSubmit(next) {
        next.event.preventDefault();
        details = next;
      },
    });

    formElement.requestSubmit(submitter);

    assert.equal(details.submitter, submitter);
    assert.deepEqual([...details.formData.entries()], [
      ['profile.email', 'team@sectile.dev'],
      ['addresses[0].city', 'Seoul'],
      ['tags', 'vue'],
      ['tags', 'a11y'],
      ['intent.action', 'save'],
    ]);
    assert.equal(details.values.profile.email, 'team@sectile.dev');
    assert.equal(details.values.addresses[0].city, 'Seoul');
    assert.deepEqual(details.values.tags, ['vue', 'a11y']);
    assert.equal(details.values.intent.action, 'save');
    assert.equal('ignored' in details.values, false);
  } finally {
    dom.restore();
  }
});

test('DOM Form keeps field, semantic, focus, and submission targets distinct', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const field = document.createElement('div');
    const semanticControl = document.createElement('div');
    const focusTarget = document.createElement('button');
    const submission = document.createElement('input');
    submission.type = 'hidden';
    submission.name = 'profile.preference';
    submission.value = 'compact';
    field.append(semanticControl, focusTarget, submission);
    formElement.append(field);
    document.body.append(formElement);

    const form = createForm({ form: formElement });
    form.registerParticipant({
      id: 'preference',
      element: field,
      semanticControl,
      focusTarget,
      submissionElements: [submission],
      name: ['profile', 'preference'],
      validate: () => ({
        valid: false,
        issues: [{
          id: 'preference:required',
          fieldId: 'preference',
          source: 'field',
          message: 'Choose a preference.',
        }],
      }),
    });

    formElement.requestSubmit();

    assert.equal(form.state.fields[0].name, 'profile.preference');
    assert.equal(document.activeElement, focusTarget);
  } finally {
    dom.restore();
  }
});

test('DOM Form preserves document order and delegates reset to participants and native controls', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    const second = document.createElement('input');
    first.name = 'first';
    first.defaultValue = 'initial';
    first.value = 'initial';
    second.name = 'second';
    formElement.append(first, second);
    document.body.append(formElement);
    const resets = [];
    const form = createForm({ form: formElement });

    form.registerParticipant({ id: 'second', element: second, reset: () => resets.push('second') });
    form.registerParticipant({ id: 'first', element: first, reset: () => resets.push('first') });
    assert.deepEqual(form.state.fields.map((field) => field.id), ['first', 'second']);

    first.value = 'changed';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    first.dispatchEvent(new Event('blur'));
    assert.equal(form.state.dirty, true);
    assert.equal(form.state.touched, true);

    form.reset();
    assert.equal(first.value, 'initial');
    assert.deepEqual(resets, ['first', 'second']);
    assert.equal(form.state.status, 'idle');
    assert.equal(form.state.dirty, false);
    assert.equal(form.state.touched, false);
    assert.equal(form.state.submitCount, 0);
  } finally {
    dom.restore();
  }
});

test('DOM Form updates duplicate participant ids in place and unregisters explicitly', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    const replacement = document.createElement('input');
    formElement.append(first, replacement);
    document.body.append(formElement);
    const form = createForm({ form: formElement });

    form.registerParticipant({ id: 'field', element: first, name: 'before' });
    const unregister = form.registerParticipant({ id: 'field', element: replacement, name: 'after' });

    assert.equal(form.state.fields.length, 1);
    assert.equal(form.state.fields[0].name, 'after');
    unregister();
    assert.equal(form.state.fields.length, 0);
  } finally {
    dom.restore();
  }
});
