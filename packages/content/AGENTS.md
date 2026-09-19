## Content ownership

Content owns the portable document/fragment contracts, durable schema/component
descriptors, schema compilation, validation, queries, indexes, pure transforms,
serialization, and migrations.

- Reuse Core Result, identity, Sequence/Tree/Range/Reorder/Text/Revision
  foundations where their semantics match.
- Keep Content free of DOM, Vue, Editor session, history, focus, ARIA,
  renderer implementation, and application side effects.
- Portable descriptors remain JSON-compatible metadata; executable migrations,
  authoring UI, and renderer/runtime integrations stay outside them.
- Unknown content may be decoded/preserved, but schema-valid transforms require
  validated Content.
- Public collection/query APIs expose their real work and never hide a full
  document index construction.
