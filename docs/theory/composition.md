# Composition

Components combine structures, independent state, explicit policies, and host commands. Each fact has one owner, so changing a policy cannot silently rewrite a structure or duplicate state authority.

<TheoryComposition />

## Composition operators

| Operator | Meaning |
| --- | --- |
| Product | Combine independent state or structure authorities. |
| Sum | Select one mutually exclusive mode. |
| Refinement | Restrict valid models with additional laws. |
| Projection | Derive a canonical observable view. |
| Parameterization | Inject an explicit policy or capability. |
| Transaction | Compute child transitions and commit them atomically. |
| Revision | Reject stale input through an ordered snapshot wrapper. |

## Example: listbox

```text
sequence
× cursor
× selection
× eligibility policy
× selection-follows-focus policy
× focus command
```

The sequence owns item order. The cursor owns the current item. Selection owns chosen identities. Policy decides whether cursor movement also changes selection. The host executes the resulting focus command.

## Example: combobox

```text
text
× popup state
× (sequence | grid | tree)
× cursor
× selection
× filter and acceptance policy
× focus and acceptance commands
```

IME composition remains text state until it is explicitly committed or cancelled. Candidate acceptance cannot reinterpret active composing text as committed query text.

## Example: tree grid

```text
tree hierarchy
× grid coordinates
× expansion
× cursor
× selection
× edit mode
```

The composite owns the mapping between row identity and cell coordinate. Tree and grid retain their individual laws instead of becoming one ambiguous hybrid structure.
