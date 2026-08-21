# Verification record

> Status: Accepted

The theory verifier is preserved byte-for-byte at `verification/theory-verifier.py`. Its SHA-256 is `83ffb6798c61a295d409dd5327512d8fff691ac89c857bb8aa0fa775fd3fb584`.

The stored theory output is `verification/theory-verification.json`. Its SHA-256 is `774d1f79119a212b0798245d7ce4e59542954a67f37f7bb15f927d240cf0b7ec`.

The implementation verifier uses seed `0x5EC71E`, compares 2,000 generated models per structure and internal cursor, selection, expansion, text, listbox, slider, calendar, tree-view, and combobox theories, covers invalid construction and controlled-snapshot vectors, and checks normal observations, query absence, projections, movement, scan rejection, exact range arithmetic, tree expansion, state reconciliation, selection operations, expansion transitions, UTF-16 replacement, composition transitions, listbox command traces, bounded slider transitions, calendar grid navigation, external page commands, visible tree navigation, composition-safe candidate acceptance, 124 revision-wrapper cases, and 40,000 cross-host DOM/terminal adapter transitions. The repository gate runs it twice, requires byte-identical output, and compares it with `verification/implementation-verification.json`.

Reference implementations are compiled only for verification. Production declarations and output are independently fingerprinted and reproducibly rebuilt.
