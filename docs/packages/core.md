---
title: Core
description: Renderer-neutral interaction state, transitions, structures, and commands.
---

# Core

`@sectile/core` answers one question: **given this state and event, what state and ordered commands come next?** It contains no dates, collection layout state, platform measurement, DOM, framework lifecycle, or styling.

```sh
pnpm add @sectile/core
```

```ts
import * as listbox from '@sectile/core/listbox'
import * as sequence from '@sectile/core/sequence'
```

## What Core owns

- canonical structures: sequence, range, grid, tree
- independent state: cursor, selection, expansion, text editing
- deterministic transitions and ordered commands
- stable string or safe-integer identity, revisions, typed failures, resource ceilings
- bounded geometry values and operations, anchored placement, and a generic metric index
- composed component semantics such as Listbox, Combobox, Slider, and Tree Grid

Core geometry provides reusable calculations over explicit bounded values. Collection extents, viewport queries, dynamic measurement state, layout strategies, and virtual repair belong to [`@sectile/virtual`](/packages/virtual). Actual element or terminal measurement belongs to the selected host adapter. Date arithmetic and picker calendars belong to [`@sectile/temporal`](/packages/temporal).

## Learning path

1. [Foundations](core/foundations.md): identity, `Result`, revisions, and limits.
2. [Structures and state](core/structures.md): reusable sequence, range, grid, tree, and selection models.
3. [Transitions and composition](core/transitions.md): events, immutable updates, commands, and controlled ownership.

Core has no DOM, terminal, Vue, or styling dependency. Choose a host adapter only after the interaction contract is clear.
