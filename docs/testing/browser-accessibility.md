# Browser and accessibility protocol

Browser and assistive-technology evidence is a separate class from Node DOM tests. Correct ARIA attributes in a simulated document do not prove focus, native form, IME, accessibility-tree, or announcement behavior in a shipped browser.

## Repository automation

The package gate provides deterministic projection evidence before a real-browser run:

- `packages/vue/tests/presence.dom.test.mjs` verifies SSR Teleport hydration, focus restoration, outside interaction, and exit presence.
- `packages/vue/tests/combobox.dom.test.mjs` and `packages/vue/tests/text.dom.test.mjs` verify controlled native input and Hangul composition state.
- `packages/vue/tests/form.dom.test.mjs` verifies successful native controls, hidden submission elements, validation focus, reset, and `FormData`.
- `packages/vue/tests/dynamic-collections.dom.test.mjs` verifies live-domain reconciliation after mount.
- `verification/component-evidence.json` requires a Vue witness for every semantic family and coordination support surface.

These tests run under a DOM implementation in Node. Record them as automated projection evidence, not as Chromium, Firefox, WebKit, NVDA, or VoiceOver evidence.

## Browser matrix

Run the built documentation examples at the release commit in each engine. Record the exact browser and operating-system versions rather than writing “latest.”

| Engine | Required environment | Required scenarios |
| --- | --- | --- |
| Chromium | Chrome or Chromium on a supported desktop OS | listbox focus, dialog restoration, portalled Select, native Form, Hangul composition, hydration IDs |
| Firefox | Firefox on Windows for NVDA and on one supported desktop OS without AT | the same browser scenarios plus NVDA announcements |
| WebKit | Safari on macOS | the same browser scenarios plus VoiceOver announcements |

Start the site with `pnpm --filter @sectile/docs dev` and use the generated component pages. Do not replace these checks with screenshots; inspect focus, values, attributes, form output, console warnings, and spoken output.

## Browser scenarios

1. **Listbox focus** — Tab to the listbox. The root owns DOM focus with `tabindex="0"`; every option has `tabindex="-1"`. Arrow movement changes `aria-activedescendant` without moving `document.activeElement` away from the root. Disabled options are skipped.
2. **Dialog restoration** — Open a modal from its trigger, move focus inside it, and close with Escape and the close control. Background content is unavailable while open. Focus returns to the original trigger after both close paths.
3. **Portalled Select** — Open a Select whose content is teleported to `body`. The trigger's `aria-controls` resolves to the popup across the portal, keyboard selection works, outside interaction closes it, and focus returns to the trigger.
4. **Native Form** — Submit checkbox, listbox, Select, and text values. Only successful controls appear in `FormData`; hidden submission elements do not become the validation or focus target. Reset restores each uncontrolled initial value.
5. **IME composition** — With a Korean IME, compose and revise at least two Hangul syllables before committing. No model update may overwrite the live composing text. Enter during composition must not submit, accept a combobox option, or commit a numeric field.
6. **Hydration IDs** — Load the server-rendered page directly, then exercise a teleported Select and Toast. Every ARIA reference resolves before and after hydration, IDs remain unchanged, and the console contains no hydration mismatch warning.

## Assistive-technology scenarios

Run both NVDA with Firefox and Chrome on Windows, and VoiceOver with Safari on macOS.

1. In listbox browse/focus mode, confirm the accessible name, selected option, disabled option, and active option are announced as Arrow keys move. DOM focus must remain on the listbox root.
2. Open a dialog and confirm its role, name, and description are announced once. Confirm virtual navigation cannot escape a modal and focus restoration is announced after closing.
3. Open a portalled Select and confirm expanded/collapsed state, option count or position where the AT provides it, selected state, and disabled options. The portal must not split trigger ownership from popup navigation.
4. Submit an invalid Form and confirm the first invalid visible field receives focus and its issue is announced. Hidden native submission controls must never be announced as the interactive field.
5. Compose Hangul in Text and Combobox. Confirm intermediate composition is not announced as repeated replacement and the committed value is spoken once.

AT wording varies by product and verbosity settings. The acceptance criterion is correct role, name, state, position, focus order, and non-duplication—not an exact sentence transcript.

## Evidence record

Store one record per environment in the release notes or attached verification artifact:

```text
commit:
date:
operating system and version:
browser and version:
assistive technology and version, or none:
input method and version:
scenarios passed:
scenarios failed:
console warnings:
notes and issue links:
reviewer:
```

A missing real-environment record is an unverified environment, not a passing result. Node tests may block regressions early, but they cannot close this evidence gap.
