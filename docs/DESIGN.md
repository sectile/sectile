---
name: Sectile Documentation
description: A neutral reading surface for inspectable interaction behavior.
colors:
  accent: "#000000"
  accent-hover: "#262626"
  accent-soft: "#f3f3f3"
  paper: "#ffffff"
  paper-muted: "#fafafa"
  ink: "#171717"
  ink-muted: "#666666"
  rule: "#e5e5e5"
  control-border: "#8a8a8a"
  checkbox-border: "#737373"
  focus: "#737373"
  code-background: "#fafafa"
  code-text: "#171717"
  code-muted: "#666666"
  code-rule: "#e5e5e5"
  code-control-border: "#8a8a8a"
  code-keyword: "#67459c"
  code-string: "#356346"
  code-constant: "#855518"
  code-function: "#285b83"
  code-tag: "#286473"
  code-attribute: "#815176"
  code-punctuation: "#525252"
  error: "#b42332"
  error-soft: "#fff0f1"
  success: "#157347"
  success-soft: "#edf8f1"
  warning: "#795500"
  warning-soft: "#fff7df"
  on-accent: "#ffffff"
  disabled-text: "#666666"
  disabled-background: "#f5f5f5"
  disabled-border: "#737373"
  overlay: "rgb(0 0 0 / 32%)"
typography:
  display:
    fontFamily: 'ui-rounded, "SF Pro Rounded", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headline:
    fontFamily: 'ui-rounded, "SF Pro Rounded", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: 'ui-rounded, "SF Pro Rounded", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0"
  body:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "16px"
    lineHeight: 1.6
  lede:
    fontSize: "18px"
    lineHeight: 1.7
  label:
    fontSize: "14px"
    fontWeight: 600
  code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: "13px"
    lineHeight: 1.75
rounded:
  small: "6px"
  item: "8px"
  control: "9999px"
  field: "9999px"
  inner: "3px"
  surface: "12px"
  switch-track: "14px"
  switch-thumb: "10px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
  space-7: "48px"
  space-8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  navigation-link:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.item}"
    padding: "8px 12px"
  navigation-link-current:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  example-card:
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "8px"
  preview:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.surface}"
    padding: "32px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
    height: "44px"
  chip:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "4px 8px"
  switch-track:
    backgroundColor: "{colors.control-border}"
    rounded: "{rounded.switch-track}"
    padding: "3px"
    width: "44px"
    height: "28px"
  switch-track-checked:
    backgroundColor: "{colors.accent}"
  code-block:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.code-text}"
    typography: "{typography.code}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: Sectile Documentation

## Overview

**Creative North Star: "The Inspectable Workbench"**

Open white paper, near-black copy, rounded system headings, and compact controls keep interaction behavior easy to inspect. Reading links, static galleries, runnable previews, and light source blocks share a quiet neutral frame.

This private contract belongs to the Vue/Vite documentation package. It governs the reading shell and documentation-owned examples; application presentation remains with consumers of Sectile's headless components. Root `DESIGN.md` governs the broader product identity.

## Style ownership

`tokens.css` owns shared geometry, colors, and typography; `base.css` owns document defaults and focus. `shell.css` owns page layout and reading typography. Reusable documentation UI owns scoped styles in its Vue component. Header/sidebar, sidebar groups/links, breadcrumbs, in-page navigation, page headings, prose sections, link cards/lists, notices, static reference tables, example lists/cards/thumbnails/frames, and source blocks each have one presentation owner. Feature pages compose those owners instead of repeating their markup or behavior.

`DocsButton` composes Sectile `Primitive` for element adoption, centered content, variants, and sizing through parent-supplied CSS properties. `DocsLink` projects anchors through `Primitive`; `DocsRouteLink` owns documentation route/fragment handling and preserves modified clicks and external destinations. `DocsDisclosure` composes Sectile `DisclosureRoot`, `DisclosureTrigger`, and `DisclosureContent`; its trigger and action are siblings, not nested controls. Header menu state also delegates toggling to Disclosure. `CopyButton` owns clipboard feedback, stable width, source-change reset, and stale async completion handling. Callers supply the source rather than implementing feedback again. No feedback timer is needed.

`preview.css` owns shared presentation for headless example descendants and equivalent static thumbnail controls, including portaled content; it stays global because those elements are not documentation component parts. Preview frames and static reference tables own their component styles. Document structure and static prose retain appropriate HTML semantics; data-source-driven DataTable behavior is not assigned to a plain reference table. These styles do not enter displayed behavior source or the published packages.

**Key Characteristics:**

- White canvas, near-black text, and black primary actions.
- Neutral selection surfaces with explicit keyboard focus.
- Rounded system headings, system body text, and monospace source.
- Flat bordered panels with geometry derived from shared tokens.
- Distinct Vue and DOM navigation contexts.

## Colors

### Primary

Black anchors primary actions and binary checked controls. Hover uses a restrained neutral wash without changing perimeters; selected rows and pressed choices use a light neutral surface and ink, with an underline or an existing indicator identifying selection. Preview choices keep their text weight stable across state changes so their dimensions stay constant. On-accent text remains white for primary actions and binary checked controls.

### Neutral

Paper is the reading canvas and live-preview surface; muted paper supports thumbnails, inline code, and source blocks. Ink carries headings and body copy; muted ink carries supporting text. Rule defines panel and header boundaries, while control and checkbox borders preserve stronger interactive edges. Bordered controls use a contrast-checked gray keyboard outline. Borderless supporting actions use a text underline for keyboard focus. Text selection uses a 10% neutral mix of the accent.

Error, success, and warning foreground/surface pairs belong to semantic feedback. Disabled text, surface, and border have explicit roles. The overlay token belongs to modal examples. Code keyword, string, constant, function, tag, attribute, and punctuation colors distinguish syntax inside the light source surface.

**The Neutral Action Rule.** Use black for primary action and checked state, neutral wash for selection, and semantic colors for feedback.

## Typography

Display and page headings use the rounded system stack; body and labels use the system sans-serif stack. Fonts resolve locally through platform fallbacks. Source, inline API names, and emitted values use the monospace stack.

The frontmatter records overview, page, section, body, lede, label, and source roles. Captions use 12px. Paragraphs stay within 70ch; the reading column supplies the wider layout bound. Mobile overview type uses `clamp(1.75rem, 6vw, 2.25rem)`, ledes use the body size, and source uses the caption size.

**The Code Is Mono Rule.** Keep code and emitted values in monospace, and explanatory copy in the sans-serif reading voice.

## Layout

The sticky header is 56px high. Desktop pairs a 256px sidebar with a flexible main area and a centered 720px reading column. Page gutters are 48px, contracting to 32px with a 232px sidebar at 1000px and to 24px at 760px. At the mobile boundary, navigation becomes a fixed menu beneath the header and sidebar targets use the 44px control minimum.

Galleries use two columns with 24px gaps and become one column at 520px. Reading rows stack at 760px; overview actions and preview headings stack at 520px. Preview padding is 32px, reducing to 24px on mobile, with a 240px minimum height. Source scrolls inside its container.

At 1280px and wider, a 200px sticky "On this page" rail sits beside the reading column. Narrower screens place the same bounded, scrollable outline before the article. The outline derives its hierarchy and links from actual public h2/h3 headings; example internals, cards and collapsed family references stay outside it. Existing heading IDs are retained and missing IDs are generated uniquely. Every section intersecting the reading viewport uses ink. A thin connected accent rail follows heading depth, with diagonal transitions between parent and child rows. Its visible segment maps viewport edges continuously through each section and the measured outline rows; it follows scrolling directly without a time-based easing effect. The first visible section alone carries the accessible current-location attribute. The final section ends at the article boundary.

The documentation-owned outline connection collects headings once per keyed page mount and caches document offsets on layout changes. Collection traverses the mounted document subtree and reads heading text/ancestry; suffix counters avoid repeated duplicate-title searches, while existing document ID collisions are checked explicitly. For `n` eligible headings and `a` unique flow ancestors, geometry measurement is O(n), connection/storage are O(n + a), and viewport lookup is O(log n) with constant-size output and no layout reads or heading snapshots during ordinary scrolling. Rail clipping updates directly; Vue updates link visibility only when the first or last visible section changes. Two window listeners, one ResizeObserver observing the article, headings and their flow ancestors, and one subtree MutationObserver belong to the mounted article. A separate ResizeObserver and coalesced frame belong to the outline rows, so wrapped labels use actual heights. All resources are removed on replacement or disposal. Production-bound tests cover stable/duplicate anchors, exclusion, viewport and bottom boundaries, continuous nested rail projection, lookup bounds, internal layout refresh and stale-callback cleanup. This presentation owner composes Primitive and DocsLink; Sectile has no public page-outline or scroll-spy component, and internal Core selection search is not a public documentation API.

## Elevation & Depth

The shell uses flat surfaces without shadows. White space, thin perimeters, and muted thumbnail/source surfaces separate regions. Dialog examples use the translucent scrim and a centered white panel. Motion belongs to interaction state: source disclosure reveals over 160ms; presence examples expose a 600ms transition. Both honor reduced motion.

**The Paper Before Panels Rule.** Use open paper and reading rows for guidance; bounded containers hold examples and source.

## Shapes

Panels and tab content use the surface radius (12px); buttons and single-line fields use pills; repeated items and multiline fields use the item radius (8px); checkbox squares and inline source use the small radius (6px). Standalone controls have a 44px minimum height. Controls embedded in a fixed-height toolbar derive their height from the toolbar's height and equal inset rather than growing its parent.

Gallery and inset menu geometry uses a 1px border and 8px inset: the inner radius is max(0, 12 − 1 − 8), yielding 3px. The 44 × 28px switch has a 20px circular thumb, 3px inset, and 16px travel. Its outer/inner circular radii are 14px and 10px.

**The Concentric Corners Rule.** Derive a flush inset surface from its actual outer radius, border, and inset. Keep independent control geometry a separate role.

## Components

Buttons use black with white text for primary actions and white with a control border for secondary actions. Quiet supporting actions stay borderless in every state; hover changes the neutral surface and text, and keyboard focus underlines the label. Inputs share the pill silhouette; textareas use the item radius. Other keyboard focus uses a 2px gray outline with a 2px offset. Disabled styling preserves explicit text and boundary colors.

Current sidebar links use neutral wash and black text; hover uses muted paper and ink. Environment navigation adds a black underline. Tags use neutral pill surfaces. Menus and popovers use white panels with inset items; selected and pressed choices use neutral wash.

Gallery cards contain static representative thumbnails with calculated inner corners and aligned metadata. Component pages pair focused runnable previews with adjacent source. Each source block starts expanded at up to 18 logical lines and 100 characters per line; longer blocks start collapsed. The shared source-based policy preserves SSR/client agreement, readers can toggle blocks independently, and copy remains available for the complete source. The Styling guide explains source and preview styling ownership; reset remounts the local preview. Checkbox rows leave the perimeter on the 20px square and center a block SVG indicator.

Source blocks use the shared light Shiki palette and a thin boundary. The shared fixed 44px Disclosure header combines the source label, line count, and independent copy control. Equal 8px insets derive the content and copy height: 44 − 2 × 8 = 28px. Both text and copy center within that same content row. Long labels truncate with their full label retained in text and a title; children do not grow the header. Only expanded code has a non-sizing header divider. Closed content stays mounted for full-source copying, but is inert, excluded from accessibility, and visually hidden. Focusable scrolling code is capped at 560px. Mobile source uses 16px padding and 12px text. Copy and highlighting failures retain readable source and status feedback. Sidecar specimens describe appearance; their markup does not implement the library's interaction semantics.

## Do's and Don'ts

Successful copy changes the centered button label to "Copied" without adding a row or changing its dimensions. Copy failures retain a separate recovery message. The button label announces successful copying through a polite live region.

- Do keep this contract scoped to the documentation reading shell and examples.
- Do preserve white paper, near-black copy, neutral selection, and explicit keyboard focus.
- Do derive nested corners from their perimeter and inset.
- Do identify whether preview styling is supplied by the docs or shown source.
- Don't prescribe application styling through the headless library's public contract.

<!-- Source-only extraction: src/styles/{tokens,base,shell}.css, components/CodeBlock.vue,
and examples/vue/components/checkbox/state-styling/Preview.vue.
Rendered visual acceptance remains unverified; this contract records source evidence. -->
