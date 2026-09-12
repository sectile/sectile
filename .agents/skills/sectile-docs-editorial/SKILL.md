---
name: sectile-docs-editorial
description: Write and review Sectile public documentation with a consistent product
  voice. Use for Sectile home copy, guides, package docs, localization, and editorial
  review together with dev-docs; keeps product identity separate from documentation
  instructions and enforces native Korean/English prose.
---

# Sectile Docs Editorial

Use this skill together with `dev-docs` for all public Sectile documentation. `dev-docs` governs information architecture, reader tasks, public-contract accuracy, and examples. This skill governs Sectile product voice and editorial quality.

## Product identity

Use the repository's canonical product model as the source of positioning:

- Sectile defines renderer-neutral interaction semantics so interfaces behave consistently across supported hosts.
- Interaction rules are separated from presentation.
- Renderer-neutral packages own deterministic state and domain behavior; host packages connect native input and project effects.
- Vue exposes headless compound components backed by the corresponding host/domain behavior.
- Styling, application data, and product-specific presentation remain application concerns unless a public API explicitly says otherwise.

Do not replace this identity with a documentation strategy. "Example-first", "copy an example", navigation structure, or how to read the docs may describe the documentation, but must not be presented as what Sectile is.

## Separate product copy from documentation guidance

The hero and first product description answer only these questions: what is Sectile, what problem does it solve, and what public capability distinguishes it?

Do not put reader instructions in product positioning. Avoid imperative or procedural copy such as "pick", "copy", "start with", "choose", "adapt", "learn", or "use this page" in the hero description unless the section is explicitly a navigation or getting-started section.

Documentation guidance belongs in navigation, getting-started, examples, and task-oriented sections below the product description.

## Write concrete product prose

Prefer direct statements about observable product behavior. Avoid generic marketing language, vague benefits, and AI-style copy.

Avoid phrases whose subject could be replaced by another library without changing the meaning. Avoid unsupported claims such as "seamless", "powerful", "flexible", "modern", "production-ready", "best", or "easy".

Do not turn implementation structure into marketing copy. Internal architecture may be consulted as evidence, but public prose should name only stable concepts a developer needs to understand or use Sectile.

Do not over-explain. A product description should normally be one short heading plus one or two sentences. Deeper semantics belong in guides or package documentation.

## Language discipline

Write English pages as natural English and Korean pages as natural Korean. Do not translate sentence structure mechanically between languages.

In Korean prose, keep only proper nouns, package names, code/API identifiers, and established technical terms in English when their original form improves precision. Do not mix ordinary English prose into Korean sentences. Prefer natural Korean explanations around code identifiers, for example "저장되지 않은 변경 여부(`dirty`)" rather than "dirty 상태" when the identifier itself is not the subject.

In English prose, do not inject Korean terminology or mirror Korean word order.

When editing Korean public prose, run the `humanize-korean` review after factual and structural editing. Treat that pass as editorial review, not as a substitute for correct product positioning.

## Headings and labels

Use headings to name the subject or task, not to advertise the documentation method. Avoid slogans derived from navigation strategy.

Labels may be concise nouns or task phrases. Do not force every heading into the same grammatical pattern.

## Navigation consistency

Pages in the same public documentation area share one sidebar definition. Moving between Getting Started and common guide pages must not replace the sidebar with a different legacy or internal menu. Legacy routes that remain reachable inherit the current canonical sidebar instead of exposing superseded navigation.

Keep one canonical destination for each reader task. Do not surface old introduction, host-model, adapter-authoring, implementation, or theory navigation merely because the route still exists for compatibility.

## Environment separation

Vue and DOM documentation are separate route trees, navigation contexts, example catalogs, and source trees. A Vue page documents Vue usage only; a DOM page documents DOM usage only. Do not add a runtime host selector, Vue/DOM tabs, segmented controls, or another control that mixes both environments into one page. Ordinary links may point to the corresponding page in the other environment when useful.

Within each environment, organize examples under Components, Form, Temporal, Virtual, Tabular, and Chart. Package landing pages are example galleries. Keep the same package navigation shape even when one area has no examples yet.

## Examples and instructions

Task guides may be instructional. Keep instructions next to the task they help complete. Explain the intended result before the API details, and keep complete examples small enough to understand.

Describe examples in terms of the developer's environment and public package APIs, not the Sectile repository layout. Do not invent filenames such as `main.mjs`, `Example.vue`, or `index.html` unless the filename itself is required by the documented tool or framework. A reader should not need to infer a checkout path, docs fixture, or arbitrary file placement before understanding what the example demonstrates.

Examples are preview-first. The interactive Preview is the primary surface; code is secondary and collapsed by default under **Relevant code** or an equivalent label. Give each focused example one primary behavior or styling concern and its own stable route.

Package and component landing pages show static example cards or thumbnails rather than mounting every interactive Preview. Do not make readers scan a long prose page to find one feature-specific example.

Behavior examples show only code relevant to the behavior under examination. Generic documentation presentation, spacing, centering, preview dimensions, and neutral scaffolding belong to a small shared preview fixture selected by example metadata and are not presented as feature code. A behavior example must not contain presentation CSS merely to make the documentation preview attractive. Styling examples are the explicit exception: presentation code is part of the example because styling itself is the subject.

Do not author the Preview implementation and displayed source as separate copies. Display source from the same example-owned files that execute the Preview. Metadata for route, environment, package area, title, primary focus, kind, fixture, source paths, tags, and related examples has one canonical owner.

For DOM examples, the displayed feature source must contain or construct the application-owned elements it operates on and must include lifecycle cleanup when the public API owns resources. Do not show a connection fragment while hiding required markup in documentation-only code.

For Vue examples, the displayed feature source is the actual SFC or example-owned module mounted by the Preview. Shared documentation fixtures may wrap it but must not alter or fake the documented behavior.

Do not call behavior-example source a complete reproduction of the visual Preview when neutral documentation fixture styling is intentionally omitted. Do not use View/Code host-switching tabs. Never let separately authored code appear to be the implementation behind a richer Preview.

Product overview sections are descriptive, not instructional. Do not tell the reader to copy code, choose components, or customize styling there.

## API and package guides

Package overview pages explain when the package is useful and show practical public workflows. Exact exhaustive surfaces belong in `/api/`.

Do not expose repository paths, private helpers, internal state machinery, or implementation rationale merely because it is available during research.

## Editorial review before completion

For every changed public page, check:

1. Does the opening describe Sectile or the documented feature, rather than how to read the docs?
2. Are product claims supported by the public contract or canonical repository description?
3. Are Vue and DOM fully separated in routes, navigation, metadata, and feature source?
4. Does each focused example have one primary concern and its own route?
5. Is Preview visually primary and Relevant code secondary and collapsed by default?
6. Do package and component galleries remain static instead of mounting every interactive example?
7. Is displayed source read from the same example-owned file that executes the Preview?
8. Does behavior source omit documentation presentation styling while styling examples are explicitly typed as styling examples?
9. Is each language natural on its own, and are API identifiers preserved exactly?

If these checks fail, revise before validation or commit.
