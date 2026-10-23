import { connectFocusVisibility, type FocusVisibilityConnection, type FocusVisibilityErrorCode } from '@sectile/dom/focus-visibility';
const result = connectFocusVisibility({ element: document.createElement('main'), documentScroll: true });
if (result.ok) { const connection: FocusVisibilityConnection = result.value; connection.refresh(); connection.disconnect(); }
else { const code: FocusVisibilityErrorCode = result.error.code; void code; }
// @ts-expect-error A native owned element is required.
connectFocusVisibility({});
// @ts-expect-error Document scrolling is explicit boolean admission.
connectFocusVisibility({ element: document.body, documentScroll: 'all' });
connectFocusVisibility({ element: document.body, getFocusRoot: () => document.querySelector<HTMLElement>('#portal') ?? undefined });
// @ts-expect-error Logical roots remain native element references, not selectors.
connectFocusVisibility({ element: document.body, getFocusRoot: () => '#portal' });
