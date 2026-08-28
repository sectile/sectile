# @sectile/form

Renderer-neutral paths, structured values, issues, validation, submission, and reset state for Sectile forms.

Import runtime APIs from explicit subpaths such as `@sectile/form/state`, `@sectile/form/path`, and `@sectile/form/values`. The package root is a type-only facade.

Install this optional peer only when a DOM or Vue application uses Form:

```sh
pnpm add @sectile/form
```

DOM and Vue adapters live at `@sectile/dom/form` and `@sectile/vue/form`. Ordinary imports from either host remain peer-free. Terminal intentionally has no Form adapter.

`@sectile/form` does not own control values and has no renderer dependency. Native `FormData` remains the source of truth; the package coordinates safe paths, immutable structured values, issues, validation generations, submission state, and reset commands.

Vue uses static `FormRoot` and `FormField` parts. `defineFormSubmission()` binds an optional Standard Schema to its inferred submit handler without introducing a typed component factory.

See the [complete Form guide](https://sectile.dev/packages/form) for native, Sectile, mixed, custom-control, lifecycle, SSR, and migration examples.
