# Verification record

> Status: Accepted

The theory verifier is preserved byte-for-byte at `packages/core/verification/theory-verifier.py`. Its SHA-256 is `83ffb6798c61a295d409dd5327512d8fff691ac89c857bb8aa0fa775fd3fb584`.

The stored theory output is `packages/core/verification/theory-verification.json`. Its SHA-256 is `774d1f79119a212b0798245d7ce4e59542954a67f37f7bb15f927d240cf0b7ec`.

The core implementation verifier uses seed `0x5EC71E`, compares 2,000 generated models per structure and internal cursor, selection, expansion, text, listbox, slider, calendar, tree-view, and combobox theories, covers invalid construction and controlled-snapshot vectors, and checks normal observations, query absence, projections, movement, scan rejection, exact range arithmetic, tree expansion, state reconciliation, selection operations, expansion transitions, UTF-16 replacement, composition transitions, listbox command traces, bounded slider transitions, calendar grid navigation, external page commands, visible tree navigation, committed-query combobox filtering, composition-safe candidate acceptance, and 124 revision-wrapper cases. The tree-grid reference suite separately checks 5,881 bounded row-tree/cell-grid models and 276,720 transitions. The core gate runs its deterministic implementation verifier twice, requires byte-identical output, and compares it with `packages/core/verification/implementation-verification.json`. The root cross-host suite independently compares 160,000 listbox, slider, calendar, tree-view, tree-grid, combobox, and text-editing operations through `@sectile/dom` and `@sectile/terminal` package exports.

Reference implementations are compiled only for verification. Production declarations and output are independently fingerprinted and reproducibly rebuilt.

The public law registry currently fixes 52 named laws. In addition to the canonical structure laws, it covers generation-bound Form validation/submission, topmost layer ownership and close propagation, finite collection-window revision/generation rules, and identity-preserving sequence/tree reorder. `law-evidence.json` must resolve every law to an existing test whose title names that law. Component completeness separately requires each semantic family to name Core, DOM, and Terminal witness files.
