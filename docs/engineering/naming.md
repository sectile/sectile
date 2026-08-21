# Naming

Canonical initialisms remain visually intact in project-owned identifiers.

- In prose, use the standard spelling: `UTF-16`, `ID`, `API`, `JSON`, `IME`.
- At the start of a lower-camel identifier, use lowercase: `id`, `ids`, `apiVersion`, `utf16Length`.
- Inside a lower-camel identifier or in PascalCase, preserve capitals: `parentID`, `publicAPI`, `packageJSON`, `isWellFormedUTF16`, `StableID`.
- In screaming-snake constants, keep word boundaries: `DEFAULT_MAX_ID_CODE_UNITS`.
- Preserve names owned by external APIs, protocols, packages, and files exactly as published.

The naming gate rejects legacy mixed-case spellings used by earlier revisions of this repository.
