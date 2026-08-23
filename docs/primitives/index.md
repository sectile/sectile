---
title: Core primitives
description: Canonical sequence, range, grid, and tree contracts.
---

# Primitives

The public canonical structures are:

- [Sequence](sequence.md): finite strict total order of stable identities.
- [Range](range.md): finite quantized affine numeric domain.
- [Grid](grid.md): rectangular ordinal product with partial injective occupancy.
- [Tree](tree.md): ordered rooted forest with expansion as separate state.

They are canonical public vocabulary, not a claim of a unique mathematical minimum.

The public [text theory](../references/sectile-theory.md#13-text) separately owns well-formed UTF-16 editing, selection, and composition transitions. It is not a character-sequence alias.

Public composite facades combine these theories without replacing them. In particular, `tree-grid` keeps `tree` and `grid` independent while its validated model owns the authoritative row-to-cell mapping.
