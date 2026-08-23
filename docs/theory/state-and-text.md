# State and text

Structure and interaction state have separate authority. Moving focus does not implicitly select, opening a branch does not rewrite a tree, and editing text does not belong to a sequence of characters.

## Cursor

A cursor is the current logical identity or no identity.

```text
Cursor<ID> = ID | none
```

When a domain changes, reconciliation preserves an existing identity and applies an explicit fallback for a missing one. The cursor does not own selection or platform focus.

## Selection

Selection owns a finite selected set and an optional anchor.

```text
Selection<ID> = {
  selected: Set<ID>
  anchor: ID | none
}
```

Single selection has cardinality zero or one. Multiple selection is a subset of the current domain. The anchor defines the origin of ordered range extension. Selection following focus is a component policy, never an implicit invariant.

## Expansion

Expansion is the set of open branch identities in a tree.

```text
Expansion<Tree> = Set<branchID>
visible(Tree, Expansion) → Sequence<ID>
```

Missing identities and leaves are removed during reconciliation. Visible nodes remain a unique preorder subsequence of the complete tree.

## Text

Text is well-formed UTF-16 with explicit code-unit offsets, surrogate-safe boundaries, directional selection, replacement laws, and an IME composition baseline.

```text
replace(text, start, end, inserted)

length(result)
  = length(text) - (end - start) + length(inserted)
```

Active composition stores the original snapshot, replacement range, complete composing text, and projected selection. Each update replaces the active passage from the same baseline; it never appends to the previous composition update. Commit promotes the projection, while cancel restores the exact baseline.

Sectile does not normalize text implicitly. Unicode normalization, word segmentation, grapheme movement, spellcheck, clipboard, and visual caret geometry require an explicit host or capability contract.
