# Getting started

Choose the package closest to your rendering host. The published packages are `@sectile/core`, `@sectile/dom`, and `@sectile/terminal`. The Vue package is currently a workspace preview.

## Install a published package

```sh
pnpm add @sectile/core
```

Add a host adapter when the application needs one:

```sh
pnpm add @sectile/dom
```

## Import one component

Every component has a public subpath. Importing the subpath keeps the dependency and bundle boundary visible.

```ts
import * as checkbox from '@sectile/core/checkbox'
```

## Next steps

- Read [State ownership](/guide/state-ownership) before choosing controlled state.
- Read [Styling](/guide/styling) for stable parts and state attributes.
- Open [Checkbox](/components/checkbox) for a complete component reference.
