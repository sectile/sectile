# Vue

`@sectile/vue` provides headless compound components, normal Vue model ownership, HTML-shaped prop names, stable parts, and child composition.

::: warning Workspace preview
The Vue package is not published yet. Its documentation describes the current workspace API so the surface can stabilize before publication.
:::

```vue
<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
</script>
```

Vue components include no visual CSS. Apply classes and state selectors in the consuming application.
