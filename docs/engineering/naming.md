# Naming

Canonical initialisms remain visually intact in project-owned identifiers.

- In prose, use the standard spelling: `UTF-16`, `ID`, `API`, `JSON`, `IME`.
- At the start of a lower-camel identifier, use lowercase: `id`, `ids`, `apiVersion`, `utf16Length`.
- Inside a lower-camel identifier or in PascalCase, preserve capitals: `parentID`, `publicAPI`, `packageJSON`, `isWellFormedUTF16`, `StableID`.
- In screaming-snake constants, keep word boundaries: `DEFAULT_MAX_ID_CODE_UNITS`.
- Preserve names owned by external APIs, protocols, packages, and files exactly as published.

The naming gate rejects legacy mixed-case spellings used by earlier revisions of this repository.

Behavior names state their layer and input:

- `create*` constructs and validates an immutable value.
- `apply*Event` applies a semantic event without owning state or executing host effects.
- `handle*Input` is a state-owning adapter/controller operation.
- `to*Event` and `to*Effect` are host-boundary projections.
- `*Update` is the successful `state + commands` result of applying an event.

`transition` remains a theory and failure-taxonomy term. Public operations do not use `step*` or `transition*` because neither name identifies the input being processed.
