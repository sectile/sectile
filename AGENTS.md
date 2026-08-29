## Sectile engineering kernel

Sectile treats performance as part of the behavioral contract for shipped
runtime and package behavior. Priority order: semantic correctness and
invariants, runtime cost, allocation and retained memory, consumer bundle and
install footprint, then compatibility and implementation convenience.
Compatibility applies only when a task requires it.

### Performance rigor

Choose the lowest rigor that fits the change. Base the choice on execution
frequency, maximum cardinality, retention lifetime, and consumer impact. Use the
highest level indicated by any material risk:

| Rigor | Typical scope | Required analysis |
|---|---|---|
| Light | Repository tooling, release and CI automation, tests, examples, docs, cold error paths, and fixed small inputs | Establish correctness, security, failure handling, and any directly relevant bound. |
| Standard | Ordinary shipped runtime, initialization, user-event work, and bounded collections outside known hot paths | Establish semantic ownership, cardinality, complexity changes, resource cleanup, and focused validation. Measure only a plausible regression. |
| Strict | Core algorithms, hot paths, caches, indexes, projections, frame/input loops, large or unbounded collections, long-lived retained state, and consumer bundle or install cost | Complete the strict design gate and select direct evidence for correctness and performance. |

An explicit performance target requires direct evidence at the selected rigor;
it does not by itself select strict. Light or standard work moves to strict when
analysis reveals unbounded work, frequency amplification, meaningful retained
state, or broad consumer cost.

### Load rules on demand

Classify rigor from the initial read-only scan, then load context progressively.
Always load the target package's nearest `AGENTS.md`. Use this specialist-rule
budget:

| Rigor | Rule loading |
|---|---|
| Light | Load no specialist rule by default. Load one when its concern is the task's primary risk or the change directly edits that contract. |
| Standard | Load each rule directly matching the current work, usually one. |
| Strict | Load the rule governing each strict signal: performance for runtime cost or memory, packaging for bundle or install cost, and lifecycle for long-lived resources. Add architecture only for ownership or boundary work. Load `validation.md` when selecting, writing, or running evidence and at close. |

Load a specialist rule when its concern first becomes concrete:

| Concern | Rule |
|---|---|
| Algorithm, data structure, hot path, cache, index, projection | `docs/agents/rules/performance.md` |
| Semantic ownership, reuse, package boundary, cross-package refactor | `docs/agents/rules/architecture.md` |
| Listener, observer, timer, subscription, scheduled work | `docs/agents/rules/lifecycle.md` |
| Export, dependency, bundle, install, tree-shaking, source map | `docs/agents/rules/packaging.md` |
| Test, benchmark, verification, close | `docs/agents/rules/validation.md` |

For changes in multiple packages, read each package's `AGENTS.md` before editing
that package. Later-discovered concerns add their rule at that point rather than
expanding initial context.

### Strict design gate

For strict work, finish read-only analysis before editing. Settle the applicable
facts below and record only decisions that affect implementation or validation.
Use concise prose instead of a fixed-form report:

1. operation kind and semantic owner;
2. relevant cardinalities and ceilings;
3. incumbent and proposed time, space, allocation, and resource bounds;
4. read/write frequency;
5. existing Core/domain APIs and retained structures considered;
6. public API complexity and lifecycle ownership;
7. validation artifacts that will prove correctness, bounds, cleanup, and
   public-surface behavior at close.

Strict implementation begins after ownership and representation are settled.
Portable semantics belong to Core or one domain owner. DOM, Vue, and Terminal
translate platform input, project state, execute effects, and own platform
resources; they do not reimplement portable transitions.

### Implementation cadence

Add the minimum non-duplicative validation proportional to the selected rigor.
When `docs/agents/rules/validation.md` is loaded under the rule budget above,
its risk matrix governs artifact selection. During implementation, execute only
the narrowest relevant package production build and `git diff --check`;
production builds own implementation typechecking. Defer running tests,
performance and heap measurements, bundle and install gates, browser checks,
generated inventories and docs, and baseline recording to close.
