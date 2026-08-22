# @sectile/vue

Headless Vue components backed by Sectile DOM semantics.

## Responsibility

- Expose controlled and uncontrolled state through Vue conventions
- Render accessible compound components without aesthetic styles
- Forward attributes and styling hooks to consumer-owned elements
- Reuse `@sectile/dom` projections for ARIA and interaction behavior
- Follow Vue and HTML naming at the public boundary instead of exposing core policies

Components expose stable `data-scope`, `data-part`, and `data-state` attributes. Styling, themes, spacing, and animation remain application responsibilities.
