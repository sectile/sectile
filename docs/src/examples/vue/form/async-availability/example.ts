import type { FormValidateHandler } from '@sectile/vue/form';

// A local 600ms response simulation. No email or request leaves the browser.
export const validateEmailAvailability: FormValidateHandler = async (values, { signal }) => {
  signal.throwIfAborted();
  const email = String(values['email'] ?? '').trim().toLowerCase();
  if (email === '') return { issues: [] };
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 600);
    signal.addEventListener('abort', abort, { once: true });
  });
  signal.throwIfAborted();
  return { issues: email === 'reserved@example.com' ? [{ path: 'email', message: 'This address is reserved. Choose another address.' }] : [] };
};
