## Lifecycle and retained resources

Load this rule when code creates listeners, observers, timers, subscriptions,
scheduled work, registries, or connections.

Every connection owns every resource it creates. Define connect, update,
reconfigure, and disconnect bounds using listener, observer, timer,
subscription, ancestor, mounted-element, and pending-generation counts.

- Connect exactly once or make repeated connect idempotent.
- Retain stable handler identities required for removal.
- Coalesce equivalent invalidations into one scheduled generation.
- Reject stale scheduled work with an owner generation or active flag.
- Reconfiguration removes obsolete resources before installing replacements.
- Disconnect is idempotent, cancels scheduled work, removes listeners,
  disconnects observers, clears subscriptions, releases registry entries, and
  restores owned DOM state.
- Owner-bound caches and registries must not retain disconnected elements,
  documents, callbacks, or state.
- Animation-frame tracking is explicit and limited to behavior that requires
  continuous observation. Event-driven tracking is the default.

Shared registries require evidence at realistic concurrency. Prefer simple
per-connection resources until listener count, dispatch work, allocation, and
retained-heap measurements show a shared registry wins. Shared source events
dispatch only to affected owners.

Lifecycle contracts state both peak resources while connected and zero-resource
postconditions after cleanup. Close verification exercises repeated
connect/reconfigure/disconnect churn and stale callbacks.
