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

## Firefox without assistive technology

- Commit: `4407459`
- Date: 2026-08-27
- Operating system: macOS 26.5.2 (25F84)
- Browser: Firefox 154.0
- Assistive technology: none
- Input method: none; these projections have no keyboard input contract
- Reviewer: Codex Computer Use
- Result: passed

Observed results:

- The browser fixture exposed Meter as `level indicator` named `Browser meter` with value `0.2`, Progress as `progress indicator` named `Browser progress` with value `0.1`, and MeterGroup as the named `Browser capacity` container.
- Group segments remained individually named and ordered `Media` then `Documents`, with values `0.3` and `0.1`.
- The fixture reported `ok: true`, no failures, no warnings, and the expected final reactive projection.
- The generated Progress examples exposed `Upload progress` values `64`, `50`, `100`, and `0.1` for the known, unknown, complete, and exact-decimal examples respectively.

## Safari without assistive technology

- Commit: `4407459`
- Date: 2026-08-27
- Operating system: macOS 26.5.2 (25F84)
- Browser: Safari 26.5.2, WebKit 605.1.15
- Assistive technology: none
- Input method: none; these projections have no keyboard input contract
- Reviewer: Codex Computer Use
- Result: passed

Observed results:

- The browser fixture exposed Meter as `level indicator` named `Browser meter` with value `0.2`, Progress as `progress indicator` named `Browser progress` with value `0.1`, and MeterGroup as the named `Browser capacity` container.
- Group segments remained individually named and ordered `Media` then `Documents`, with values `0.3` and `0.1`.
- The fixture reported `ok: true`, no failures, no warnings, and the expected final reactive projection.
- The generated Progress examples exposed `Upload progress` values `64`, `50`, `100`, and `0.1` for the known, unknown, complete, and exact-decimal examples respectively.

## Indeterminate platform variance

The DOM projection correctly omits `aria-valuenow` for indeterminate Progress. Browser accessibility APIs may still synthesize a numeric value:

| Projection | Firefox 154.0 | Safari 26.5.2 |
| --- | --- | --- |
| Custom `role="progressbar"`, no current value | `50` | `50` |
| Custom `role="progressbar"`, explicit zero | `0` | `0` |
| Native `<progress>` without `value` | `nan` | `0` |
| Native `<progress value="0">` | `0` | `0` |

This is a browser/platform accessibility-tree variance rather than a Sectile attribute-projection failure. Consumers must not infer determinate state from the synthesized accessibility value; the DOM contract remains the presence or absence of the current-value attribute.

## Safari with VoiceOver

- Commit: `4407459`
- Date: 2026-08-27
- Operating system: macOS 26.5.2 (25F84)
- Browser: Safari 26.5.2, WebKit 605.1.15
- Assistive technology: VoiceOver supplied by macOS 26.5.2
- Input method: Computer Use
- Reviewer: Codex Computer Use
- Result: partial; spoken-output acceptance remains unverified

Observed results:

- VoiceOver was enabled through System Settings and its caption panel setting was confirmed active.
- Safari exposed the expected role, accessible name, value, and group ordering through the macOS accessibility tree while VoiceOver was enabled.
- Computer Use key events are app-scoped and could not issue the global VoiceOver navigation commands needed to produce and capture spoken-output traversal. Role/name/value/update/order announcements and non-duplication therefore remain unverified.
- VoiceOver was restored to its original off state after the inspection.

## Required environments not available in this run

The following remain unverified and must not be recorded as passing:

| Environment | Status | Required observation |
| --- | --- | --- |
| Firefox with NVDA on Windows | unverified | Spoken role/name/value/update/order and absence of duplicate announcements |
| Chrome with NVDA on Windows | unverified | Spoken role/name/value/update/order and absence of duplicate announcements |
| Safari with VoiceOver on macOS | partial | Spoken role/name/value/update/order and absence of duplicate announcements |

Use the record shape and acceptance rules in `docs/testing/browser-accessibility.md`. A reviewer must record exact browser, operating-system, and assistive-technology versions plus spoken-output results before the release accessibility gate can pass.
