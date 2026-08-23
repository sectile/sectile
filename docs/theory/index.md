# Theory

Sectile defines interaction as a composition of small semantic models. Rendering, framework lifecycle, and visual styling remain outside those models, so the same behavior can be projected into different hosts without changing its meaning.

<TheoryOverview />

## The specification

Every model is described by the same observable contract:

```text
Theory = Sorts + Models + Operations + Observations + Laws + Errors + Costs
```

- **Models** state which values are valid.
- **Operations** construct or transform those values.
- **Observations** are the public results a consumer can inspect.
- **Laws** remain true for every valid value and transition.
- **Errors** distinguish invalid input from ordinary absence.
- **Costs** make resource use part of the contract.

Two implementations are equivalent when the same public input trace produces the same results, failures, state, and ordered commands.

## The canonical vocabulary

Sectile uses four public structures—[sequence, range, grid, and tree](/theory/structures)—plus independent [cursor, selection, expansion, and text state](/theory/state-and-text). Policies parameterize choices such as eligibility and boundary behavior instead of hiding them in callbacks.

A component combines those ingredients through a [deterministic transition](/theory/transitions). DOM, terminal, and framework packages project the resulting state and commands into their native environment.

## Composition is the primitive

Components are not isolated state machines with unrelated rules. A listbox, calendar, combobox, or tree grid is a lawful composition of the same structures and state models. See [Composition](/theory/composition) for the complete mapping.
