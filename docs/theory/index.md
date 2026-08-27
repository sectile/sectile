# Core theory

`@sectile/core` does not render UI. It represents item relationships and interaction state as values, then computes the **next state and ordered commands** from the current state and a semantic event.

A command requests an effect such as focus or scrolling; it does not perform that effect. DOM, terminal, and Vue interpret commands in their own environments, so the Core calculation remains host-independent and directly testable.

<TheoryOverview />

Models define item relationships and valid values. State records facts such as cursor, selection, expansion, and text. Events express user intent, while policies make product choices such as eligibility and boundary behavior explicit.

A successful transition returns a new immutable state and its commands together. A failed transition returns a typed error without changing the old state or command list.

## Canonical vocabulary

Core uses [sequence, range, grid, and tree](/theory/structures) as its canonical item relationships. It composes them with independent [cursor, selection, expansion, and text state](/theory/state-and-text). Because each model owns one fact, a component policy can explicitly decide whether moving the cursor preserves selection or moves it too.

Components combine those ingredients through a [deterministic transition](/theory/transitions). Date and calendar arithmetic belongs to [`@sectile/temporal`](/packages/temporal), tabular data interaction to [`@sectile/tabular`](/packages/tabular), and viewport layout to [`@sectile/virtual`](/packages/virtual).

## Reading a public specification

A Core specification is more than a list of API names. It defines valid values, available operations and observable results together with the laws, failures, and resource bounds an implementation must preserve.

<TheoryContractDiagram />

Two implementations are observably equivalent when the same public input trace produces the same state, commands, query results, and failures while preserving every law and cost ceiling.

## Composition is the primitive

A listbox combines a sequence with cursor and selection. A combobox adds text and popup state. A tree grid combines tree and grid relationships with expansion, cursor, selection, and editing state. See [Composition](/theory/composition) for how each component owns facts and updates them atomically.
