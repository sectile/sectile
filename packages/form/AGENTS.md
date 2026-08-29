## Form ownership

Form owns portable field metadata, issues, validation/submission transitions,
form invariants, and structural sharing of form state.

- Reuse Core result, revision, identity, and collection foundations.
- Validity derives from normalized issues; avoid parallel writable validity.
- Field-local updates preserve unrelated field identity and return the existing
  state for semantic no-ops.
- Form does not own DOM controls, Vue reactivity, focus, ARIA, or input-element
  value storage.
- Host packages adapt native values and effects to the Form contract rather
  than recreating Form transitions.
