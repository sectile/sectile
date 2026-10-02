---
name: Sectile Documentation
description: A clean reading surface for headless interaction behavior.
colors:
  accent: "#4659d4"
  accent-hover: "#3c4db8"
  accent-soft: "#eef0fd"
  paper: "#ffffff"
  paper-muted: "#f6f6f7"
  ink: "#3c3c43"
  ink-muted: "#67676c"
  rule: "#e2e2e3"
  control-border: "#c2c2c4"
  code-background: "#101827"
  code-text: "#edf2ff"
  code-muted: "#a9b5cc"
  code-rule: "#293852"
  code-control-border: "#52617a"
  error: "#b42332"
typography:
  display:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2.4rem, 4.3vw, 3.5rem)"
    fontWeight: 720
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2rem, 3vw, 2.75rem)"
    fontWeight: 720
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "16px"
    lineHeight: 1.65
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
  inline: "4px"
  navigation: "6px"
  control: "9px"
  surface: "12px"
  dialog: "16px"
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
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  navigation-link:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.navigation}"
    padding: "6px 12px"
  navigation-link-current:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  example-card:
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  preview:
    backgroundColor: "{colors.paper-muted}"
    rounded: "{rounded.surface}"
    padding: "40px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  code-block:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.code-text}"
    typography: "{typography.code}"
    rounded: "{rounded.surface}"
    padding: "20px"
---

# Design System: Sectile Documentation

## Overview

**Creative North Star: "The Inspectable Workbench"**

This is the documentation's reading expression of Sectile's established white,
ink, and violet world. Open paper carries explanations; ruled links, static
example galleries, runnable previews, and source blocks make behavior inspectable.
The mood is a clean Read surface.

This contract belongs to the private Vue/Vite documentation package. Its reading
shell, geometry, preview styling, and source components extend the root design
system locally. The library's headless components leave application presentation
with the consumer. Root `DESIGN.md` remains the authority for the broader brand
and landing surface.

**Key Characteristics:**

- White reading canvas with ink copy and quiet rules.
- Restrained violet for actions, navigation selection, and focus.
- Sans-serif explanation with monospace code and live values.
- Flat previews and source blocks with perimeter-defined geometry.
- Distinct Vue and DOM navigation contexts.

## Colors

The documentation applies the existing paper, ink, and violet family to a light
reading shell. Dark source blocks provide a local code contrast surface.

### Primary

- **Sectile Violet:** Links, primary actions, checked controls, and focus outlines.
- **Deep Action Violet:** Primary reading-action hover.
- **Violet Wash:** The current sidebar page.

### Neutral

- **Paper / Muted Paper:** Reading canvas, example previews, thumbnails, and inline code.
- **Ink / Muted Ink:** Headings and body copy, then navigation and supporting text.
- **Rule / Control Border:** Reading divisions, container perimeters, and input edges.
- **Code Background / Code Text / Code Muted:** Source surface, source text, and metadata.
- **Code Rule / Code Control Border:** Source-header separation and copy-control hover.

Error red identifies form validation messages. It is feedback, not an additional
decorative accent.

**The Violet Means Action Rule.** Use violet for links, actions, selected navigation,
checked state, and visible keyboard focus.

## Typography

**Display and Body Font:** The declared Inter stack, with system sans-serif fallbacks.
**Code Font:** SFMono-Regular, with Consolas and Liberation Mono fallbacks.

The overview title is larger than ordinary page titles. Section headings and
body leading keep the reading hierarchy compact. Frontmatter records the desktop
roles; stylesheets define responsive variants. Naming Inter in the stack does not
establish that a downloaded font is available.

Monospace distinguishes source, inline API names, and emitted example values.
Navigation and explanation use the sans-serif stack. Paragraphs are limited to
70ch within the reading column.

**The Code Is Mono Rule.** Keep code and emitted values in monospace, and explanatory
copy in the sans-serif reading voice.

## Layout

The sticky header is 56px high. Desktop uses a 256px sidebar and a flexible main
area; the centered reading column is at most 760px wide with 48px page gutters.
The page begins 56px below the header. Prose sections use the larger spacing
steps; navigation and controls use the smaller steps.

At 1000px and below the rail contracts to 232px, gutters to 32px, and page top
padding to 40px. At 760px and below, a menu button opens the fixed navigation
below the header; gutters become 24px, page top padding 32px, and sidebar links
have a 44px minimum height. Overview display type becomes
`clamp(2.3rem, 8vw, 3rem)` and ledes become 16px.

Example galleries use two columns with 24px gaps, then 20px gaps below 760px and
one column below 520px. Small screens also stack overview actions and preview
headings. Code scrolls within its container; source text is not squeezed to fit.

## Elevation & Depth

The reading shell uses no shadows. One-pixel borders, horizontal rules, muted
preview backgrounds, and the dark source surface distinguish regions. The dialog
example overlays a translucent scrim and a centered paper surface; this belongs
to the demonstrated interaction.

**The Paper Before Panels Rule.** Use open paper and ruled rows for guidance;
bounded containers hold examples and source.

## Shapes

Controls use restrained rounded corners, sidebar links a smaller curve, and
preview/card/source surfaces a larger curve. The modal example has the broadest
corner treatment. Inline code has a compact radius. The frontmatter owns these
values; perimeter borders and ruled rows carry the recurring geometry.

## Components

### Buttons and fields

The overview reading action is violet with paper text and a 46px minimum height.
Secondary preview controls and form fields use paper, ink, and a control border,
with a 44px minimum height. Form submission uses the violet treatment; field
messages use error red. Visible keyboard focus uses a two-pixel violet outline
with a three-pixel offset.

### Navigation

Environment links use an underline and violet text for the current context.
Sidebar links change from muted ink to ink on a muted-paper hover; the current
page uses violet wash and violet text. Nested component links indent within their
package group. The mobile menu exposes expanded state, closes on route changes
or Escape, and returns focus to its trigger on Escape.

### Reading links and galleries

Reading links use ruled rows with a short title and explanation, stacking on
small screens. Example cards combine an inert representative thumbnail and a
title/description; hover strengthens the perimeter. A gallery does not mount live
interaction controls.

### Preview and source

Detail pages show a muted-paper live preview followed by a native disclosure,
initially closed, containing the executed source. Preview notes distinguish
documentation-owned presentation from source that includes its own styling.
The preview starts at a 280px minimum height and uses 40px padding; below 760px
these become 240px and 24px.

Source blocks have a dark header, visible copy control, and focusable scrolling
code region capped at 560px high. Copy feedback reports success or a selection
fallback. Code text becomes 12px with 16px padding below 760px. Source disclosure
uses a 160ms reveal only when reduced motion is not requested.

## Do's and Don'ts

### Do:

- **Do** keep this contract scoped to the documentation reading shell and examples.
- **Do** preserve paper, ink, restrained violet, and explicit keyboard focus.
- **Do** use ruled links for guidance and bounded previews for runnable behavior.
- **Do** identify whether preview styling is supplied by the docs or shown source.

### Don't:

- **Don't** prescribe application styling through the headless library's public contract.

<!-- Source extraction: src/styles/{tokens,base,shell}.css, App.vue, CodeBlock.vue,
ExampleGallery.vue, ExamplePage.vue, and the state-styling Checkbox fixture.
Rendered visual verification: Pending; Browser Plugin startup failed with EOF.
Dark documentation mode is not established by the local dark code surface. -->
