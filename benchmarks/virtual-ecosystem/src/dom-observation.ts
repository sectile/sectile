export function waitForElement(
  root: Node,
  predicate: () => boolean,
  label: string,
  timeoutMs: number,
): Promise<void> {
  if (predicate()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const dispose = (): void => {
      observer.disconnect();
      if (timeout !== undefined) clearTimeout(timeout);
    };
    const complete = (): void => {
      if (settled || !predicate()) return;
      settled = true;
      dispose();
      resolve();
    };
    const observer = new MutationObserver(complete);
    observer.observe(root, { attributes: true, childList: true, subtree: true });
    timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      dispose();
      reject(new Error(`Timed out waiting for ${label}.`));
    }, timeoutMs);
    complete();
  });
}

export function waitForPresentationBoundary(
  requestFrame: (callback: FrameRequestCallback) => number = requestAnimationFrame,
): Promise<void> {
  return new Promise((resolve) => {
    requestFrame(() => resolve());
  });
}
