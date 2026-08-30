## Chart ownership

Chart owns renderer-neutral chart models, scales, view transforms, interaction
state, packed projections, profile-specific reduction, and incremental repair.

- Reuse Core identity, sequence, range, selection, index-span, geometry,
  revision, and result primitives.
- Keep browser input, measurement, rendering, accessibility, and resource
  lifecycle in DOM.
- Keep Vue reactivity, components, SSR, and hydration in Vue.
- Public identities remain distinct from dense internal projection indices.
- Every hot representation has a finite bound and deterministic work evidence.
