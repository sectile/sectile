# Component completeness

A public Sectile component is a cross-package contract, not only a primitive export.
The same component ID must exist in `@sectile/core`, `@sectile/dom`, and
`@sectile/terminal`, and it must satisfy every requirement below before release.

1. **Theory** — authoritative state is decomposed into existing structures and state
   theories, or a new invariant is proved before promotion.
2. **Public capabilities** — APG-required and supported optional behavior is explicit.
   Presentation-only variants stay in renderer or framework packages.
3. **State ownership** — every mutable state dimension declares controlled and
   uncontrolled behavior, synchronization, and change notification.
4. **Host input** — keyboard, pointer/direct targeting, focus, IME, and terminal input
   are covered where the host can produce them.
5. **Host semantics** — DOM ARIA projection and terminal effects are complete without
   forcing applications to rebuild adapter internals.
6. **Failure edges** — empty, disabled, stale, invalid, bounded-resource, and dynamic
   collection cases are either verified or explicitly inapplicable.
7. **DOM scenarios** — the documentation demonstrates core mode, major variants, and an
   edge or dynamic state with real interactive markup.
8. **Terminal scenarios** — the documentation terminal preview demonstrates the same semantic
   variants plus terminal-specific input behavior.
9. **Cross-host parity** — both adapters witness the same renderer-neutral transitions.
10. **Framework ergonomics** — framework packages expose the conventions of their
    host (`v-model`, HTML form props, native focus and keyboard behavior) and keep
    core policies and host wiring behind the component boundary.

`verification/component-completeness.json` is the machine-readable inventory, and
`verification/component-evidence.json` binds every semantic family to concrete Core, DOM,
and Terminal test files. Each family also declares the host-input channels exercised by
those witnesses: keyboard, pointer, focus, IME, text, timers, or native form behavior as
applicable. Coordination support such as layer ownership and reorder has the same
cross-host evidence contract. Existing gaps are an explicit migration baseline. The checker
rejects an unlisted public subpath, package export drift, an invalid capability entry,
missing host evidence, or a newly introduced component with an unaudited gap. Migration
entries are deleted as implementation and evidence land; the target is an empty
`migrationGaps` object.

Example breadth follows semantic variation, not visual prop count. A listbox needs cases
such as single/multiple selection, disabled options, typeahead, grouping, large/dynamic
collections, and controlled ownership. It does not make color, avatar, icon, size, or slot
configuration part of renderer-neutral primitives.
