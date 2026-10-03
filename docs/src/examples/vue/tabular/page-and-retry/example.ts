import { createMemberSource } from '../local-source/example.js';

// One local failure flag per mounted example; no network request is made.
export function createRecoverableMemberSource() {
  const resolve = createMemberSource();
  let failNext = false;
  const source: ReturnType<typeof createMemberSource> = (request, context) => {
    context.signal.throwIfAborted();
    if (failNext) {
      failNext = false;
      throw new Error('The simulated member request failed. Retry to load this page.');
    }
    return resolve(request, context);
  };
  return { source, failNextRequest: () => { failNext = true; } };
}
