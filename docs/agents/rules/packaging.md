## Public surface and package delivery

Load this rule for exports, imports, dependencies, bundle closure, tree-shaking,
source maps, package files, or third-party replacement.

- Prefer focused subpath exports. Do not add compatibility barrels or aggregate
  exports unless the task explicitly requires them.
- Import the narrow owning subpath. Avoid root imports that pull unrelated
  runtime families into a consumer closure.
- Keep modules side-effect free. Mark construction pure only after proving the
  constructor has no observable module or call-site effects.
- Public host APIs expose Sectile-owned vocabulary, not implementation-library
  types, callbacks, middleware, or escape hatches.
- Removing a third party means removing public type references, runtime imports,
  manifest entries, lockfile closure, and isolated-install requirements.
- A zero-third-party-dependency claim excludes workspace packages but includes
  runtime and optional peer closure.
- Keep source maps for published JavaScript when they map to shipped source and
  contain no private paths or unintended sources. Verify declarations and maps
  resolve from packed artifacts.

Any public export, dependency, or closure change records a breaking mapping and
gets two-bundler consumer evidence, raw/gzip/brotli impact, tarball and installed
footprint, isolated import/install coverage, declaration coverage, and source
map checks during close.

Do not increase bundle or install ceilings to follow the current output. Record
the old ceiling, delta, contributors, and approved replacement as a separate
decision after implementation stabilizes.
