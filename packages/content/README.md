# @sectile/content

Portable structured content for Sectile.

`@sectile/content` owns the renderer-independent document format, durable
schema/component descriptors, validation, structural queries, logical positions,
pure transforms, fragments, and prepared validated runtime state.

Stored documents are plain JSON-compatible data. Rendering does not require
`@sectile/editor`, and non-Sectile consumers can interpret the public format.

Install:

```sh
pnpm add @sectile/content
```

Use focused runtime entrypoints:

```ts
import {
  baseRef,
  compileContentSchema,
  componentRef,
} from '@sectile/content/schema'
import { validateDocument } from '@sectile/content/validate'
import { transformDocument } from '@sectile/content/transform'
```

The package root is type-focused. Runtime operations intentionally live on
focused subpaths so applications do not load the transform/index/schema runtime
unless they use it.

Portable Content does not persist DOM/Vue implementations, CSS, classes,
callbacks, Editor selection/history, renderer state, or application side effects.

The current public persistence contract is `formatVersion: 1`. Package semver
and application/component contract versions are independent from the format
version.
