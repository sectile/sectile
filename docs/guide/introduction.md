# Introduction

Sectile models interaction behavior independently from its renderer. The same component semantics can drive a browser interface, a terminal application, or a framework binding without moving host details into core state.

## What Sectile owns

- State transitions and controlled or uncontrolled ownership.
- Eligibility, navigation, selection, expansion, editing, and range rules.
- Explicit effects such as focus requests, announcements, and activation commands.
- Host projections for DOM and terminal input.

## What Sectile leaves to you

- Visual design, layout, spacing, and animation.
- Application data fetching and persistence.
- Product-specific validation and policy when a component exposes an extension point.

## Package layers

`@sectile/core` defines renderer-neutral semantics. `@sectile/dom` and `@sectile/terminal` translate native input and output. Framework packages such as `@sectile/vue` compose those host contracts into headless components.
