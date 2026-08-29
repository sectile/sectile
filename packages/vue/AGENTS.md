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

### Vue performance rules

- Use `useTemplateRef` for statically named Composition API template refs in
  SFC templates and render functions. Account for the initial `null` value and
  later unmounts. Use function refs when assignment must be dynamic.
- Keep child props as stable as possible so an unrelated parent update does not
  update every child. Project item-local scalar state before passing it to a
  large repeated subtree.
- A computed value that allocates an object can trigger dependents whenever its
  identity changes. In a measured hot path, compute all dependencies, compare
  the result, and return the previous object when its meaning is unchanged.
- Use `shallowRef` or `shallowReactive` for large immutable structures and
  external state integration. Treat nested values as immutable and replace the
  root to publish an update.
- Avoid deep watchers on large structures. Use an explicit getter or a
  `watchEffect` that reads only required properties. Use post-flush watchers for
  owner-DOM reads and clean up stale asynchronous side effects.
- Virtualize large lists. Avoid unnecessary renderless or wrapper component
  instances inside large repeated subtrees.
- Add micro-optimizations only after production profiling identifies an update
  or load bottleneck.

These rules follow the official Vue documentation for
[template refs](https://vuejs.org/guide/essentials/template-refs.html),
[render-function refs](https://vuejs.org/guide/extras/render-function.html#template-refs),
[watchers](https://vuejs.org/guide/essentials/watchers.html), and
[performance](https://vuejs.org/guide/best-practices/performance.html).
