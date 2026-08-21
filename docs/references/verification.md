# Verification record

> Status: Accepted

The theory verifier is preserved byte-for-byte at `verification/theory-verifier.py`. Its SHA-256 is `83ffb6798c61a295d409dd5327512d8fff691ac89c857bb8aa0fa775fd3fb584`.

The stored theory output is `verification/theory-verification.json`. Its SHA-256 is `774d1f79119a212b0798245d7ce4e59542954a67f37f7bb15f927d240cf0b7ec`.

The implementation verifier uses seed `0x5EC71E`, compares 2,000 generated models per structure and internal cursor, selection, expansion, and text theories, covers invalid construction and controlled-snapshot vectors, and checks normal observations, query absence, projections, movement, scan rejection, exact range arithmetic, tree expansion, state reconciliation, selection operations, expansion transitions, UTF-16 replacement, and composition transitions. The repository gate runs it twice, requires byte-identical output, and compares it with `verification/implementation-verification.json`.

Reference implementations are compiled only for verification. Production declarations and output are independently fingerprinted and reproducibly rebuilt.
