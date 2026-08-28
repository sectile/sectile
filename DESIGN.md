---
name: Sectile
description: An inspectable technical surface for explicit interaction rules.
colors:
  violet-action: "#5368eb"
  violet-bright: "#6f82ff"
  violet-deep: "#4659d4"
  violet-soft: "rgba(83, 104, 235, 0.16)"
  focus-violet: "#7889f2"
  feedback-success: "#16856f"
  paper: "#ffffff"
  paper-ruled: "#f6f6f7"
  ink: "#3c3c43"
  ink-muted: "#67676c"
  ink-faint: "#606875"
  rule: "#e2e2e3"
  control-border: "#c2c2c4"
  night-canvas: "#090e18"
  night-surface: "#111a2a"
  night-soft: "#101827"
  night-rule: "#223049"
  night-border: "#293852"
  night-ink: "#edf2ff"
  night-ink-muted: "#a9b5cc"
  night-ink-faint: "#8e9bb2"
typography:
  display:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(3.2rem, 6.4vw, 5.6rem)"
    fontWeight: 760
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  headline:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2.2rem, 4.2vw, 3.65rem)"
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    lineHeight: 1.65
  label:
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.69rem"
    fontWeight: 760
    lineHeight: 1.2
    letterSpacing: "0.04em"
  live-state:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: "0.74rem"
    fontWeight: 650
    lineHeight: 1.4
rounded:
  inner: "9px"
  action: "11px"
  surface: "16px"
  pill: "999px"
spacing:
  hairline: "5px"
  xs: "8px"
  sm: "10px"
  md: "18px"
  lg: "24px"
  xl: "48px"
  section: "104px"
components:
  action-primary:
    backgroundColor: "{colors.violet-action}"
    textColor: "{colors.paper}"
    rounded: "{rounded.action}"
    padding: "0 17px"
    height: "46px"
  action-secondary:
    backgroundColor: "{colors.paper-ruled}"
    textColor: "{colors.ink}"
    rounded: "{rounded.action}"
    padding: "0 17px"
    height: "46px"
  workbench:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "18px"
  listbox-option:
    backgroundColor: "{colors.paper-ruled}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.inner}"
    padding: "0 11px"
    height: "40px"
  listbox-option-selected:
    backgroundColor: "{colors.violet-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inner}"
    padding: "0 11px"
    height: "40px"
  state-panel:
    backgroundColor: "{colors.paper-ruled}"
    textColor: "{colors.ink}"
    rounded: "{rounded.action}"
    padding: "13px"
---

# Design System: Sectile

## Overview

**Creative North Star: "The Inspectable Workbench"**

Sectile presents interaction behavior as a practical technical surface: calm enough to read like near-white paper, but structured enough that ownership, rules, effects, and failures remain visible. The system is direct, precise, and operational rather than promotional. Violet identifies a decision or active state; ink and ruled neutrals carry the explanation.

The signature expression pairs a concise thesis with a live contract workbench, then continues through ruled rows instead of a field of interchangeable feature cards. Controls remain familiar and directly manipulable. Formal theory is available, but the first encounter stays grounded in behavior a visitor can inspect and change.

**Key Characteristics:**

- Near-white technical-paper surfaces with ink text and quiet ruled divisions.
- A restrained Sectile violet reserved for actions, selection, and focus.
- Live state shown in monospace; explanatory prose remains in Inter.
- Flat, perimeter-defined interactive containers with 9–16px corners.
- Responsive layouts that preserve the thesis, action, and workbench sequence.

## Colors

The palette combines technical paper and ink neutrals with one lucid violet action family; dark mode keeps the same hierarchy on deep blue-black surfaces.

### Primary

- **Sectile Violet:** Drives primary actions, links, active selections, and diagrams.
- **Bright Violet:** Supports high-visibility accent states in the shared documentation theme.
- **Deep Violet:** Replaces the action color on primary-action hover.
- **Violet Wash:** Marks selected or lightly emphasized regions without turning them into raised cards.
- **Focus Violet:** Forms the explicit two-pixel keyboard focus outline.

### Secondary

- **Verified Green:** Signals live or successful status in compact indicators, not large decorative fields.

### Neutral

- **Technical Paper / Ruled Paper:** Establish the main canvas and alternating or softly separated regions.
- **Ink / Muted Ink / Faint Ink:** Carry primary copy, explanations, and tertiary or disabled content.
- **Rule / Control Border:** Separate rows and define interactive perimeters.
- **Night Canvas / Night Surface / Night Soft:** Preserve paper, elevated, and subdued surface roles in dark mode.
- **Night Ink / Night Muted Ink / Night Faint Ink:** Preserve the same content hierarchy in dark mode.

### Named Rules

**The Violet Means Action Rule.** Use violet for something the visitor can act on, has selected, or is actively focusing; its rarity keeps interaction legible.

**The Paper Before Panels Rule.** Prefer open paper and ruled separation before adding another filled container.

## Typography

**Display Font:** Inter (with the system sans-serif stack)
**Body Font:** Inter (with the system sans-serif stack)
**Label/Mono Font:** SFMono-Regular (with Consolas and Liberation Mono fallbacks)

**Character:** Dense display type makes the thesis decisive, while relaxed body leading keeps technical explanation readable. Monospace is a semantic signal for values emitted by the live behavior model, not a general developer aesthetic.

### Hierarchy

- **Display** (760, fluid 3.2–5.6rem, 0.96 line-height): Reserved for the primary thesis; on small screens it resolves to a fluid 2.7–4rem range.
- **Headline** (fluid 2.2–3.65rem, 1.05 line-height): Introduces major explanatory sections with balanced wrapping.
- **Title** (720, 0.82rem): Names compact technical containers such as the workbench header.
- **Body** (1rem, 1.65 line-height): Explains contracts and routes; hero body copy may grow fluidly to 1.3rem.
- **Label** (760, 0.69rem, 0.04em tracking, uppercase): Identifies compact groups such as a demo or state area.
- **Live State** (650, 0.74rem): Displays current item, selected value, ownership, and requested action.

### Named Rules

**The Live State Is Mono Rule.** Reserve monospace for changing machine-readable state and code; keep navigation, headings, and explanation in the sans-serif voice.

## Layout

The primary container is centered at a maximum width of 1180px with 24px desktop gutters and 20px small-screen gutters. The first viewport uses two weighted columns: thesis and actions on the left, a workbench with a 420px minimum column on the right. Major sections use generous 104px vertical spacing and align explanations against ruled lists rather than card grids.

At 940px and below, the hero and major split sections become one column while retaining comfortable 34–60px gaps. At 680px and below, actions become full-width, the workbench state moves below its listbox, rule lists become a single column, and section spacing contracts to 76px. The reading order remains thesis, actions, supporting note, then workbench.

**The Workbench Leads Rule.** When explaining an interaction contract, pair the claim with directly manipulable behavior before offering deeper routes or formal theory.

## Elevation & Depth

The system is flat by default. Open space, alternating paper tones, one-pixel rules, and a single perimeter border establish hierarchy; focal containers do not need ambient shadows. A tiny live-status dot may use a localized 0 2px 8px success-color glow to read as active without lifting its parent surface.

### Shadow Vocabulary

- **Live Signal Glow** (`0 2px 8px color-mix(in srgb, var(--sectile-feedback-success) 50%, transparent)`): Used only around a tiny status signal.

### Named Rules

**The Flat-by-Default Rule.** Keep surfaces at rest on the page plane; use borders and tonal shifts for structure, and reserve glow for a compact status signal.

## Shapes

Corners are restrained and nested by scale. Compact options use gently curved inner corners (9px), actions and state panels use a firmer medium curve (11px), and focal workbenches or advanced callouts use a broad but technical surface curve (16px). One-pixel borders and horizontal rules are the dominant geometry; circular or pill shapes are limited to status dots and continuous tracks.

**The Perimeter Before Elevation Rule.** Give a focal interactive container one clear perimeter and internal rules before introducing any depth effect.

## Components

### Buttons

- **Shape:** Medium curved action corners (11px) with a 46px minimum height and 17px horizontal padding.
- **Primary:** Sectile Violet fill, white text, and a matching perimeter; hover shifts to Deep Violet and rises by one pixel.
- **Hover / Focus:** State changes run for 160ms with ease-out; keyboard focus uses a two-pixel Focus Violet outline with a three-pixel offset.
- **Secondary:** Ruled Paper fill, Ink text, and a quiet divider border; hover strengthens the border and moves to Technical Paper.

### Cards / Containers

- **Corner Style:** Focal containers and terminal callouts use the 16px surface radius; nested state panels use 11px.
- **Background:** Technical Paper is standard, Ruled Paper is subordinate, and violet appears only as a selected-state wash.
- **Shadow Strategy:** Flat at rest; see Elevation & Depth.
- **Border:** One perimeter rule, with internal one-pixel dividers when the container exposes multiple kinds of state.
- **Internal Padding:** The workbench uses 18px; the compact state panel uses 13px.

### Navigation

Primary routes appear as ruled rows with a strong label, muted explanation, and directional arrow. The rows have no individual card shell. Hover changes the label and arrow to Sectile Violet and translates the row eight pixels; reduced-motion mode removes the transition.

### Interactive Contract Workbench

The signature workbench exposes one selectable behavior model beside a current-state definition list. Options use a 40px row height and 9px radius. Highlighted options strengthen border and ink; selected options add a Violet Wash and check indicator; disabled options reduce opacity and use Faint Ink. Every change is reflected in monospace current, selected, owner, and next-action values.

## Do's and Don'ts

### Do:

- **Do** make behavior inspectable through visible current state, ownership, and requested actions.
- **Do** use one-pixel ruled rows and open space to organize explanations.
- **Do** keep the primary action and current selection unmistakably violet.
- **Do** preserve thesis, actions, then workbench as the small-screen reading order.
- **Do** keep provenance with every raster asset that ships.

### Don't:

- **Don't** turn the landing surface into a generic grid of interchangeable feature cards.
- **Don't** use monospace as decoration or for ordinary prose and navigation.
- **Don't** add ambient shadows to containers that already have a perimeter and tonal hierarchy.
- **Don't** hide ownership, behavior rules, effects, or failure handling behind unexplained component magic.
- **Don't** lead new visitors with formal theory before they can manipulate a concrete behavior model.
