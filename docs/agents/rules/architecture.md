## Semantic ownership and package boundaries

Load this rule for new behavior, cross-package refactors, duplicate logic, or
dependency changes.

### Reuse decision order

Before adding portable logic, use this order:

1. use an existing owner export;
2. compose existing owner primitives;
3. extend the existing owner with the narrow missing operation;
4. add owner-local logic when exactly one domain needs it;
5. consider Core only when at least two independent domains need identical
   semantics and a shared complexity contract.

Generic-looking code alone does not justify Core. A wrapper or alias may remain
in a host only when it adds platform vocabulary without reproducing semantics.

Record the search scope, selected owner, reused APIs, and reason any nearby API
was insufficient in the active work item. Search Core and relevant domains
before writing a reducer, navigation rule, reconciliation helper, geometry or
range operation, selection rule, color operation, or reusable index.

### Authority

- Core owns portable foundations, algorithms, algebra, immutable structures,
  and component-independent state transitions.
- Form, Temporal, Virtual, and Tabular own their vocabulary, invariants,
  policies, state machines, and domain-specific indexes.
- DOM owns event translation, accessibility projection, focus, measurement,
  browser effects, and DOM resource lifecycle.
- Terminal owns terminal input translation, cell projection, terminal effects,
  and terminal resource lifecycle.
- Vue owns reactivity bridges, component composition, refs, provide/inject,
  rendering, SSR, and hydration integration.

Host code may normalize platform input before calling an owner and may translate
commands into effects afterward. It must not decide the portable next state.

### Dependency direction

Allowed semantic direction:

```text
Core
├─ Form
├─ Temporal
├─ Virtual
└─ Tabular ──> Virtual

DOM ──> Core + domains
Terminal ──> Core + Temporal
Vue ──> Core + DOM + domains
```

Core never imports a domain or host. Domains never import hosts. Hosts do not
import semantic implementations from other hosts. New cross-domain edges need
an explicit authority decision and cycle check.

### Violations

Treat these as blockers:

- equivalent reducers or transition rules in more than one owner;
- portable selection, navigation, reconciliation, geometry, range, color, or
  collection algorithms implemented in DOM, Vue, or Terminal;
- a domain recreating an available Core primitive;
- Core importing DOM, Vue, Terminal, or domain vocabulary;
- a host calling another host to obtain semantics;
- public behavior with no declared canonical owner;
- a migration exception added without an owner and removal work item.

Use `verification/semantic-authority.json` as machine-readable authority. Update
it with an ownership change and close the corresponding exception; do not use
the manifest to legitimize duplicate implementations.
