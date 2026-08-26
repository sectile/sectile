# Packages

| Package | Role |
| --- | --- |
| [`@sectile/core`](/packages/core) | Renderer-neutral interaction semantics |
| [`@sectile/temporal`](/packages/temporal) | Date and time fields and picker semantics |
| [`@sectile/virtual`](/packages/virtual) | Dynamic virtualization and layout semantics |
| [`@sectile/dom`](/packages/dom) | DOM input and semantic projection |
| [`@sectile/terminal`](/packages/terminal) | Terminal input and rendering projection |
| [`@sectile/vue`](/packages/vue) | Headless Vue components |

Packages depend on one another only through public exports. Application code should follow the same boundary.
