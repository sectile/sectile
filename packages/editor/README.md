# @sectile/editor

Renderer-neutral structured authoring for `@sectile/content`.

`@sectile/editor` owns authoring session state: logical selection, monotonic
revision/configuration identity, atomic transactions, synchronous actions and
queries, component authoring metadata, and bounded local undo/redo.

The package does not render HTML/Vue, own `contenteditable`, style content,
perform uploads/network requests, or persist callbacks. DOM/Vue host packages
project the Editor session into platform input and rendering.

```ts
import { defineEditorAction, createEditorActionRegistry } from '@sectile/editor/action'
import { createEditorSession } from '@sectile/editor/session'
```

Use `@sectile/content` directly for portable document validation,
serialization, migrations and lower-level schema-valid transforms that do not
need authoring policy/history parity.

The root export is type-focused. Runtime APIs live on focused subpaths.
