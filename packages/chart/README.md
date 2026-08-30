# @sectile/chart

Renderer-neutral chart models, scales, packed projections, spatial queries, and
interaction semantics for Sectile.

The package root is type-only. Import runtime APIs from focused subpaths such as
`@sectile/chart/model`, `@sectile/chart/scale`, `@sectile/chart/projection`,
`@sectile/chart/query`, `@sectile/chart/interaction`, and
`@sectile/chart/controller`.

Browser rendering and input live in `@sectile/dom/chart`. Vue composition lives
in `@sectile/vue/chart`. Both treat Chart as an optional peer dependency; this
package never reads host elements or owns rendering resources.

See the [Chart manual](https://sectile.github.io/sectile/packages/chart) for
supported profiles, resource ceilings, performance contracts, and adapter
guidance.
