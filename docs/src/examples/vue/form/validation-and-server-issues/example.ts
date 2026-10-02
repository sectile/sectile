import type { FormSubmitHandler, FormValidateHandler } from '@sectile/vue/form';

export const validateNotificationEmail: FormValidateHandler = (values, { signal }) => {
  signal.throwIfAborted();
  const email = String(values['email'] ?? '').trim().toLowerCase();
  const confirmation = String(values['confirmation'] ?? '').trim().toLowerCase();
  return {
    issues: email === confirmation ? [] : [{
      path: 'confirmation', relatedPaths: ['email'], message: 'The email addresses must match.',
    }],
  };
};

// A local stand-in for a server response; no network request is made.
export const submitNotificationEmail: FormSubmitHandler = event => {
  event.preventDefault();
  const email = String(event.formData.get('email') ?? '').trim().toLowerCase();
  return email === 'blocked@example.com'
    ? { ok: false, issues: [{ path: 'email', message: 'This address is reserved. Choose another address.' }] }
    : { ok: true };
};
