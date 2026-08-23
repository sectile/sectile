# DOM

`@sectile/dom` projects Sectile semantics into browser behavior: keyboard and pointer normalization, focus and composition handling, form semantics, ARIA attributes, and native element behavior.

```sh
pnpm add @sectile/dom
```

```ts
import * as checkbox from '@sectile/dom/checkbox'
```

DOM helpers remain unstyled and expose attributes or controllers rather than a visual component library.

## Factory behavior

Use `create*` for normal application setup. It returns the ready connection and throws a typed Sectile error when configuration is invalid. Use `tryCreate*` when setup failure must remain a recoverable `Result`.

```ts
const connection = checkbox.createCheckbox(options)
const recoverable = checkbox.tryCreateCheckbox(options)
```

No `unwrap` is needed around a host `create*` call.
