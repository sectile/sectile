# Temporal

`@sectile/temporal` owns renderer-neutral civil date, wall-clock time, range field, calendar projection, and picker state machines.

Its canonical domain is ISO/Gregorian plain civil dates (`year`, `month`,
`day`) and timezone-free wall-clock times. It does not model instants, timezone
databases, or non-ISO calendar systems. Locale-specific editing and presentation
belong to host codecs rather than the canonical value.

```sh
pnpm add @sectile/core @sectile/temporal
```

Runtime APIs use focused subpaths:

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createDatePickerState } from '@sectile/temporal/date-picker'
```

The package depends only on public `@sectile/core` contracts. It owns no locale formatting, timezone database, DOM, terminal, or Vue behavior.

An empty semantic calendar has no hidden clock. Supply `referenceDate` when no
value or highlight exists:

```ts
createDatePickerState({ referenceDate: { year: 2026, month: 8, day: 26 } })
```

DOM and terminal adapters inject the host's current civil date by default. Vue
also accepts `referenceDate` on picker roots and on `HostProvider`. SSR
applications should provide one stable date to both server and client.
