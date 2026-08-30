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

Form lifecycle state is grouped by concern:

```ts
state.validation // { generation, status, trigger, intent }
state.submission // { generation, status, count, failure }
```

Submission failures remain separate from validation issues. A single issue can name a primary field and additional `relatedFieldIds`; it appears once in the form summary while every related field is invalid.

See the [Form documentation](https://sectile.dev/packages/form) for Vue, DOM, validation, submission, custom controls, and SSR.
