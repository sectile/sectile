---
title: Temporal calendars and pickers
description: Calendar projection, navigation, single and range selection, and picker composition.
---

# Temporal calendars and pickers

A calendar projects dates into weeks and months. A picker composes that calendar state with field text, popup state, and acceptance rules.

```ts
import { createCalendarMonth } from '@sectile/temporal/calendar'
import { createDatePickerState } from '@sectile/temporal/date-picker'

const picker = createDatePickerState({
  value: { year: 2026, month: 8, day: 27 },
})

const month = createCalendarMonth(picker.view, 1)
```

`weekStartsOn` affects projection, not the canonical date. Eligibility rules may disable dates without removing them from the calendar grid. Navigation, highlighted date, committed value, and range preview remain separate observations.

Month and year pickers use `DateValue` as their committed value contract. Temporal canonicalizes a selected month to its first day and a selected year to January 1; month and year cell projections remain period-specific values. Range variants apply the same normalization to both endpoints, and every host publishes the Temporal-owned canonical value.

Use single-date, range, month, year, date-time, and corresponding picker subpaths for the smallest domain that fits. Rendering and localized labels remain host concerns.
