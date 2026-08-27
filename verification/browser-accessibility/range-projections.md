# Range Projection Browser and Accessibility Evidence

## Automated cross-host evidence

- Commit: `42abba6`
- Date: 2026-08-27
- Command: `pnpm test:cross-host`
- Result: 46 tests passed, including exact Meter, Progress, and MeterGroup state, failure, revision, SSR, DOM projection, and Terminal render-plan parity.
- Browser fixture: `packages/vue/tests/browser/hydration-fixture.mjs`

## Chromium without assistive technology

- Commit: `42abba6`
- Date: 2026-08-27
- Operating system: macOS 26.5.2 (25F84)
- Browser: Codex in-app Chromium, user agent Chrome 151.0.0.0
- Assistive technology: none
- Input method: none; these projections have no keyboard input contract
- Reviewer: Codex automated browser control
- Result: passed

Observed results:

- Meter exposed `role="meter"`, name `Browser meter`, range `0..0.3`, and changed `aria-valuenow` from `0.1` to `0.2` after hydration.
- Progress exposed `role="progressbar"`, name `Browser progress`, and omitted `aria-valuenow`, `aria-valuetext`, and percentage data while indeterminate. It later exposed value `0.1` and percentage `33.333333333333`.
- MeterGroup exposed one named `role="group"` with individually named meters. Segment order changed from `documents,media` to `media,documents`, with updated values `0.3,0.1`.
- The group had no `aria-live`; its track was presentational and its visual legend used `aria-hidden="true"`.
- SSR hydration produced no Vue warnings. The browser fixture reported `data-sectile-verification="passed"` with no failures.
- The generated documentation examples exposed the expected role, name, exact range, exact value text, segment order, zero-valued segment, and exact-decimal attributes. Browser console errors were empty.

## Required environments not available in this run

The following remain unverified and must not be recorded as passing:

| Environment | Status | Required observation |
| --- | --- | --- |
| Firefox without assistive technology | unverified | Role, name, exact range/value, indeterminate omission, reactive updates, and group order |
| Firefox with NVDA on Windows | unverified | Spoken role/name/value/update/order and absence of duplicate announcements |
| Chrome with NVDA on Windows | unverified | Spoken role/name/value/update/order and absence of duplicate announcements |
| Safari with VoiceOver on macOS | unverified | Spoken role/name/value/update/order and absence of duplicate announcements |

Use the record shape and acceptance rules in `docs/testing/browser-accessibility.md`. A reviewer must record exact browser, operating-system, and assistive-technology versions plus spoken-output results before the release accessibility gate can pass.
