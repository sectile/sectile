# Introduction

Sectile is a system for specifying and verifying interaction behavior. It represents the current facts as state, expresses input as semantic events, and calculates the next state with ordered work.

The same model applies to navigation, selection, expansion, text editing, forms, civil dates, tabular data, charts, and virtualized collections. Each domain defines its valid values, operations, results, failures, and cost bounds through a public contract.

## How a transition works

1. A model defines the valid structure and values.
2. State records facts such as the current item, selection, expansion, or text.
3. An event expresses an action such as move, select, insert, validate, or submit.
4. A policy supplies choices such as eligibility and boundary behavior.
5. The transition returns a new immutable state and ordered commands together.

A rejected event returns a typed error while preserving the previous state and command list. This failure-atomic rule lets a caller inspect every outcome without observing a partial update.

## Domain ownership

- **Core:** sequence, range, grid, tree, state, transition, and command foundations.
- **Form:** field paths, values, validation, errors, submission, and reset.
- **Temporal:** civil dates, wall-clock time, ranges, and calendar rules.
- **Tabular:** columns, row access, grouping, selection, and data queries.
- **Virtual:** collection extents, layout, measurement, and anchor correction.
- **Chart:** immutable chart models, scales, projections, and queries.

The [package map](/packages/) shows the public boundary of each domain. [Core theory](/theory/) explains the common structures, laws, failure semantics, and composition model.

## Start using it

Choose the domain that owns the problem, then open [Getting started](/guide/getting-started) for installation and the first public API.
