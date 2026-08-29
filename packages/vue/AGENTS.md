## Vue host boundary

Vue owns components, refs, provide/inject, narrow reactive subscriptions,
rendering, SSR, hydration, and composition of DOM/domain connections.

- Delegate portable transitions, navigation, selection, reconciliation,
  geometry, Form, Temporal, Virtual, and Tabular behavior to canonical owners.
- Keep selectors granular and shallow. Avoid central duplicate stores, deep
  proxies, whole-state projection, and per-render controller reconstruction.
- Component wrappers may map props/events and expose refs; they must not become
  a second reducer or policy implementation.
- Every mounted subscription or resource has one stable disposer and unmount
  cleanup.
