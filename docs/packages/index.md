---
title: Packages
description: Choose the semantic domain and host adapter that own each part of an interaction.
---

# Packages

Sectile separates **what an interaction means** from **where it runs**. Core, Form, Temporal, Tabular, and Virtual are renderer-neutral domains. DOM, Terminal, and Vue are host adapters, although Form intentionally integrates only with DOM and Vue.

<PackageBoundaryMap />

## Semantic domains

| Package | Owns | Does not own |
| --- | --- | --- |
| [`@sectile/core`](/packages/core) | interaction state, transitions, identity, commands | dates, layout geometry, rendering |
| [`@sectile/form`](/packages/form) | accessible field composition, errors, validation, submission, and reset | control values, visual styling, Terminal forms |
| [`@sectile/temporal`](/packages/temporal) | civil dates, wall-clock time, calendar and picker rules | time zones, formatting, rendering |
| [`@sectile/tabular`](/packages/tabular) | tabular identity, data access, columns, selection, grouping, grid interaction | transport, rendering, loading/error UI |
| [`@sectile/virtual`](/packages/virtual) | extents, viewport queries, placements, anchor correction | collection identity, data loading, DOM measurement |

Choose a semantic package from the value your application needs to reason about. A calendar uses Core composition and Temporal date rules. A virtualized list uses Core identity and Virtual geometry. Neither package needs to know how the result is rendered.

## Host adapters

| Package | Connects |
| --- | --- |
| [`@sectile/dom`](/packages/dom) | native events, focus, attributes, browser measurement, scrolling |
| [`@sectile/terminal`](/packages/terminal) | keyboard input, terminal commands, text projection |
| [`@sectile/vue`](/packages/vue) | Vue ownership, reactivity, slots, headless parts |

Packages communicate only through public exports. Application code should keep the same boundary: domain state in semantic packages, platform effects at the host edge, visual styling in the application.
