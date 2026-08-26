# @sectile/temporal

Renderer-neutral date and time fields, calendars, and picker state machines.

The domain is intentionally ISO/Gregorian plain civil dates and timezone-free
wall-clock times. It does not model instants, time zones, or non-ISO calendars.

Import runtime APIs from explicit subpaths such as `@sectile/temporal/date-field`.

The type-only package root exports `TemporalErrorCode`, `TemporalError`, and `TemporalResult`. Temporal-owned failures are declared here rather than in `@sectile/core`.

Empty calendar state requires an explicit `referenceDate`; host adapters inject
their current date and let SSR applications override it deterministically.
