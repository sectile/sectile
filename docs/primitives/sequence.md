# Sequence

`sequence` is a finite strict total order of stable string identities. Its kernel observations are `size`, `at(index)`, and `indexOf(id)`.

`project` preserves relative order. `move` takes explicit direction, boundary policy, eligibility policy, and optional scan ceiling. A wrapping move never returns the current identity as its own successor.

Construction rejects empty, ill-formed UTF-16, overlong, or duplicate IDs. Missing IDs and out-of-bounds indices are normal query absence.
