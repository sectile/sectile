## Editor ownership

Editor owns renderer-neutral authoring state over validated Portable Content:
logical selection/references, revision/configuration authority, transaction and
action/query capability, local history/coalescing, and component authoring
metadata.

- Delegate durable document validity, grammar, indexes, pure transforms,
  mapping, fragments and prepared Content state to @sectile/content.
- Reuse Core Result, interaction and revision foundations where semantics fit.
- Keep DOM/Vue components, contenteditable, focus, ARIA, clipboard, browser
  resources, renderer styling and application side effects outside Editor.
- External asynchronous work resolves outside a transaction and re-enters
  through a fresh revision-checked transaction/action.
- Only successful persistent document changes create local history entries.
