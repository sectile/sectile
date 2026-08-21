# Architecture

The architecture preserves semantic ownership. Structures own data observations; policies own eligibility and boundary choices; state theories own cursor, selection, expansion, and text; host adapters own runtime state and effects.

`@sectile/primitives` remains pure and renderer-neutral. DOM and terminal packages provide controlled/uncontrolled controllers over that contract. Read [theory to runtime](theory-to-runtime.md) for the refinement boundary.
