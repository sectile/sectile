---
title: Core
description: Renderer-neutral interaction state, transitions, structures, and commands.
---

# Core

`@sectile/core` answers one question: **given this state and event, what state and ordered commands come next?** It contains no dates, layout geometry, DOM, framework lifecycle, or styling.

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
- stable string identity, revisions, typed failures, resource ceilings
- composed component semantics such as Listbox, Combobox, Slider, and Tree Grid

Date arithmetic and picker calendars belong to [`@sectile/temporal`](/packages/temporal). Viewport geometry and dynamic measurement belong to [`@sectile/virtual`](/packages/virtual).

## Learning path

1. [Foundations](core/foundations.md): identity, `Result`, revisions, and limits.
2. [Structures and state](core/structures.md): reusable sequence, range, grid, tree, and selection models.
3. [Transitions and composition](core/transitions.md): events, immutable updates, commands, and controlled ownership.

Core has no DOM, terminal, Vue, or styling dependency. Choose a host adapter only after the interaction contract is clear.
