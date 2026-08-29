## Sectile engineering kernel

Sectile treats performance as part of the behavioral contract. Priority order:
semantic correctness and invariants, runtime cost, allocation and retained
memory, consumer bundle and install footprint, then compatibility and
implementation convenience. Compatibility applies only when a task requires it.

### Load rules on demand

Do not read every project rule preemptively. Before editing, load the target
package's nearest `AGENTS.md` and only the matching rule files:

| Work | Required rule |
|---|---|
| Algorithm, data structure, hot path, cache, index, projection | `docs/agents/rules/performance.md` |
| Semantic ownership, reuse, package boundary, cross-package refactor | `docs/agents/rules/architecture.md` |
| Listener, observer, timer, subscription, scheduled work | `docs/agents/rules/lifecycle.md` |
| Export, dependency, bundle, install, tree-shaking, source map | `docs/agents/rules/packaging.md` |
| Test, benchmark, verification, close | `docs/agents/rules/validation.md` |

Load multiple files only when the change crosses those concerns. For changes in
multiple packages, read each affected package's `AGENTS.md`.

### Mandatory design gate

Finish read-only analysis before runtime edits. Record in the active work item:

1. operation kind and semantic owner;
2. relevant cardinalities and ceilings;
3. incumbent and proposed time, space, allocation, and resource bounds;
4. read/write frequency;
5. existing Core/domain APIs and retained structures considered;
6. public API complexity and lifecycle ownership;
7. validation artifacts that will prove correctness, bounds, cleanup, and
   public-surface behavior at close.

Runtime implementation is blocked until ownership and representation are
settled. Portable semantics belong to Core or one domain owner. DOM, Vue, and
Terminal translate platform input, project state, execute effects, and own
platform resources; they do not reimplement portable transitions.

### Implementation cadence

Write the required tests, reference fixtures, adversarial witnesses,
deterministic counters, and verification registrations with the implementation.
During implementation, execute only the narrowest relevant package production
build and `git diff --check`; production builds own implementation typechecking.
Defer running tests, performance and heap measurements, bundle and install
gates, browser checks, generated inventories and docs, and baseline recording to
close. Follow `docs/agents/rules/validation.md` when entering close.
