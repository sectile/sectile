---
title: Temporal values and fields
description: Canonical civil date and wall-clock values, with formatting kept at the host boundary.
---

# Temporal values and fields

Temporal values describe what a user entered without assigning a timezone or display format.

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createTimeValue } from '@sectile/temporal/time-field'

const releaseDate = createDateValue(2026, 8, 27)
const openingTime = createTimeValue(9, 30)
```

A civil date is not midnight in a timezone. A wall-clock time is not an elapsed duration or instant. Convert to those application domains only at an explicit boundary with an explicit timezone or reference date.

## Field state

Date and time fields combine canonical values with Core text editing state. Host codecs own localized segment labels, digits, separators, parsing, and presentation. The canonical value remains stable when the locale changes.

Use date ranges when the domain requires ordered endpoints. Invalid dates and reversed ranges are typed failures rather than normalized guesses.
