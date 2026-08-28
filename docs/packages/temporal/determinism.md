---
title: Deterministic Temporal rendering
description: Reference dates, host defaults, SSR, and hydration without a hidden clock.
---

# Deterministic Temporal rendering

An empty calendar cannot choose a visible month without a reference. Temporal never reads the current date by itself.

```ts
import { createDatePickerState } from '@sectile/temporal/date-picker'

const state = createDatePickerState({
  referenceDate: { year: 2026, month: 8, day: 27 },
})
```

Use the same `referenceDate` on the server and client. This produces the same initial month during SSR and hydration.

DOM and Terminal facades may inject the host's current civil date when called without one. Vue picker roots accept an explicit reference date, while `TemporalProvider` shares one with a subtree. The convenience default is suitable for client-only interfaces; tests, snapshots, workers, and server rendering should provide a stable value.

The reference date initializes an otherwise empty view. It does not replace a selected value or silently advance an existing calendar state.
