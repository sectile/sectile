## DOM host boundary

DOM owns browser event translation, accessibility attributes, focus, DOM
measurement, effect execution, and browser resource lifecycle.

- Delegate portable reducers, navigation, selection, reconciliation, geometry,
  color, range, Form, Temporal, Virtual, and Tabular semantics to their owners.
- DOM helpers may discover platform state and project canonical results; they
  must not become an alternate semantic owner.
- Every connection owns and fully cleans listeners, observers, timers,
  subscriptions, scheduled work, styles, and registry entries.
- Public APIs expose Sectile vocabulary rather than third-party implementation
  types.
