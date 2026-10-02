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
  control-border: "#8b8b90"
  checkbox-border: "#67676c"
  code-background: "#101827"
  code-text: "#edf2ff"
  code-muted: "#a9b5cc"
  code-rule: "#293852"
  code-control-border: "#52617a"
  error: "#b42332"
  error-soft: "#fff0f1"
  success: "#157347"
  success-soft: "#edf8f1"
  warning: "#795500"
  warning-soft: "#fff7df"
  disabled-text: "#67676c"
  disabled-background: "#eeeeef"
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
  navigation: "4px"
  control: "7px"
  inner: "7px"
  surface: "16px"
  dialog: "16px"
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
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
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
    padding: "8px 12px"
  navigation-link-current:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  example-card:
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  preview:
    backgroundColor: "{colors.paper-muted}"
    rounded: "{rounded.surface}"
    padding: "32px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
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

This is the documentation's reading expression of Sectile's established white,
ink, and violet world. Open paper carries explanations; reading links, static
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

Feedback has explicit foreground/surface pairs: error #b42332/#fff0f1,
success #157347/#edf8f1, warning #795500/#fff7df. These are reserved for feedback,
not arbitrary category decoration. Disabled foreground and border use #67676c
on #eeeeef; controls retain readable labels instead of fading the whole element.
Selected text uses violet on violet wash. On-accent text uses white.

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

Repeated caption/code/label/body/section sizes are 12/13/14/16/23px tokens.
Body leading is 1.65. Focus has shared 2px width and 3px offset tokens. The
Documentation styles guide renders the live semantic colors and the same token
source used by the site, with its nested-radius specimen.

## Layout

The sticky header is 56px high. Desktop uses a 256px sidebar and a flexible main
area; the centered reading column is at most 760px wide with 48px page gutters.
Page padding is equal on all four sides at each breakpoint. Prose sections use
the larger spacing steps; navigation and controls use the smaller steps. Margin,
padding, and gap decisions consume the shared spacing scale.

At 1000px and below the rail contracts to 232px and page padding to 32px. At 760px
and below, a menu button opens the fixed navigation below the header; page
padding becomes 24px, and sidebar links
have a 44px minimum height. Overview display type becomes
`clamp(2.3rem, 8vw, 3rem)` and ledes become 16px.

Example galleries use two columns with 24px gaps, and one column below 520px.
Card bodies stretch to align their trailing metadata when descriptions have
different lengths. Small screens also stack overview actions and preview
headings. Code scrolls within its container; source text is not squeezed to fit.

## Elevation & Depth

The reading shell uses no shadows. Quiet shell borders, muted preview
backgrounds, and the dark source surface
distinguish regions. Prose transitions and reading links use spacing rather than
repeated separator lines. The dialog
example overlays a translucent scrim and a centered paper surface; this belongs
to the demonstrated interaction.

**The Paper Before Panels Rule.** Use open paper and reading rows for guidance;
bounded containers hold examples and source.

## Shapes

Gallery cards use an outer radius of 16px, a 1px border, and an equal 8px inset.
Their thumbnail radius is computed as max(0, outer radius − border − inset),
yielding 7px. This equation describes concentric surfaces, not every control
placed somewhere inside a larger preview. Independent controls use the control
radius; checkbox squares and inline code use the small radius.

The switch track is 44px wide and 28px high with a 1px border and a 20px thumb.
Its equal inset is (28 − 2 × 1 − 20) / 2 = 3px, and thumb travel is
44 − 2 × 1 − 2 × 3 − 20 = 16px. Circular corners use half the element height:
14px outside and 10px inside, also equal to 14 − 1 − 3.

**The Concentric Corners Rule.** Derive a flush inset surface from its actual outer
radius, border, and inset. Keep independent control geometry a separate role.

## Components

### Buttons and fields

The overview reading action is violet with paper text and a 44px minimum height.
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

Component child routes are expanded within the Components area. Other guides
retain the same area navigation without showing every component child.

### Reading links and galleries

Reading links use open rows with a short title and explanation, stacking on
small screens. Package example cards combine an inert representative thumbnail and a
title/description, an equal inset, and a calculated thumbnail corner; hover
strengthens the perimeter. A gallery does not mount live
interaction controls.

Component pages display their focused examples inline with matching headings,
live previews and collapsed source. A reset control restores each example by
remounting only that preview; its dedicated route remains available for sharing.
Readers can compare behaviors without returning through a gallery.
The Vue Components index groups focused variants into one entry per component.
Local example links jump to the selected behavior without navigating away.

### Preview and source

Detail pages show a muted-paper live preview followed by a native disclosure,
initially closed, containing the executed source. Preview notes distinguish
documentation-owned presentation from source that includes its own styling.
The preview uses a 240px minimum height and equal 32px padding; below 760px
padding becomes 24px. A checkbox label row has no outer perimeter; its persistent
20px square carries the control boundary.

Checkbox squares use border-box sizing in both fixtures and copyable styling.
Indicators center a block SVG with unit line height; inline baselines do not
determine checkmark placement. Thumbnails use the same 20px outer square and
14px icon with a 1px border. Preview layout is applied to a documentation-owned
wrapper rather than the component root.

Source blocks have a dark header, visible copy control, and focusable scrolling
code region capped at 560px high. Copy feedback reports success or a selection
fallback. Code text becomes 12px with 16px padding below 760px. Source disclosure
uses a 160ms reveal only when reduced motion is not requested.

The disclosure presence example uses a deliberately observable 600ms opacity
and translation transition. Its status reflects the content element's actual
hidden and inert attributes rather than an application timer. Closing, reopening
during exit, completing exit, and reduced motion are separate inspection cases.
The example's attribute observer is disconnected when the example unmounts.

Switches, toggle buttons, toggle groups, radio groups, tabs, and popovers share
the control height, spacing, border, and focus roles. Group rows wrap and align
their controls at the center. Pressed choices and active tabs use violet wash;
disabled controls are subdued. Tabs keep explanatory panel text in the sans-serif
voice. Popover content uses the surface radius and equal padding; positioning is
owned by the interaction rather than a fixed documentation offset.

Text inputs and textareas use the same 44px minimum height, 1px control border,
7px corner and 8px/12px padding as form inputs. Accordion headings use the shared
button geometry and open spacing between panels, without an extra outer card.

## Do's and Don'ts

### Do:

- **Do** keep this contract scoped to the documentation reading shell and examples.
- **Do** preserve paper, ink, restrained violet, and explicit keyboard focus.
- **Do** use reading links for guidance and bounded previews for runnable behavior.
- **Do** identify whether preview styling is supplied by the docs or shown source.

### Don't:

- **Don't** prescribe application styling through the headless library's public contract.

<!-- Source extraction: src/styles/{tokens,base,shell}.css, App.vue, CodeBlock.vue,
ExampleGallery.vue, ExamplePage.vue, and the state-styling Checkbox fixture.
Rendered visual verification: Pending; Browser Plugin startup failed with EOF.
Dark documentation mode is not established by the local dark code surface. -->
