# Temporal

`@sectile/temporal` owns renderer-neutral civil date, wall-clock time, range field, calendar projection, and picker state machines.

```sh
pnpm add @sectile/core @sectile/temporal
```

Runtime APIs use focused subpaths:

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createDatePickerState } from '@sectile/temporal/date-picker'
```

The package depends only on public `@sectile/core` contracts. It owns no locale formatting, timezone database, DOM, terminal, or Vue behavior.
