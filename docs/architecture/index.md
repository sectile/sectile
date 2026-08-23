---
title: Architecture
description: Semantic ownership and refinement boundaries across Sectile packages.
---

# Architecture

The architecture preserves semantic ownership. Structures own data observations; policies own eligibility and boundary choices; state theories own cursor, selection, and expansion; the public text theory owns editing transitions; host adapters own runtime state and effects.

`@sectile/core` remains pure and renderer-neutral. DOM and terminal packages provide controlled/uncontrolled controllers over that contract. `@sectile/vue` renders headless compound components from declarative DOM projections, without taking semantic or styling ownership. Read [theory to runtime](theory-to-runtime.md) for the refinement boundary.

New interaction patterns follow the [composite proof plan](composite-proof-plan.md) before a primitive or adapter facade is promoted.
