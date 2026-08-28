# @sectile/form

Accessible form coordination for native HTML controls and Sectile components.

Install this optional peer only when a DOM or Vue application uses Form:

```sh
pnpm add @sectile/form
```

Use `@sectile/vue/form` in Vue templates or `@sectile/dom/form` with existing browser markup. Ordinary imports from either host do not require this package.

```ts
import { createForm } from '@sectile/dom/form'
```

```ts
import {
  FormField,
  FormRoot,
  FormSubmit,
  defineFormSubmission,
} from '@sectile/vue/form'
```

See the [Form documentation](https://sectile.dev/packages/form) for Vue, DOM, validation, submission, custom controls, and SSR.
