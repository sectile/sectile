---
title: Temporal
description: Civil date, wall-clock time, calendar, and picker semantics without hidden clocks.
---

# Temporal

`@sectile/temporal` owns renderer-neutral rules for **calendar dates** and **wall-clock times**. It builds date/time fields, ranges, calendars, and pickers on public Core contracts.

```sh
pnpm add @sectile/core @sectile/temporal
```

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createDatePickerState } from '@sectile/temporal/date-picker'
```

## Domain boundary

Temporal models ISO/Gregorian plain civil dates such as `{ year, month, day }` and timezone-free times such as `{ hour, minute, second }`. It does not model instants, offsets, timezone databases, locale formatting, or non-ISO calendars.

This boundary prevents a field or calendar from silently reading the machine clock or changing meaning across environments.

## Learning path

1. [Values and fields](temporal/values.md): canonical values, parsing boundaries, date and time fields.
2. [Calendars and pickers](temporal/calendars.md): visible months, selection, ranges, and navigation.
3. [Deterministic rendering](temporal/determinism.md): `referenceDate`, SSR, hydration, and host defaults.

DOM and Terminal adapters may inject the host's current civil date as a convenience. Deterministic or server-rendered applications should provide one stable reference date explicitly.
