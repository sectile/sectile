---
title: Engineering
description: Repository, package, build, naming, and release constraints.
---

# Engineering

The repository uses TypeScript 7 with strict, declaration-isolated settings and Node's native test runner. No renderer or framework dependency is permitted in production output.

## Release

`v0.14.1` is the compatibility bridge from synchronized versions to independent package versions. This final synchronized release changes published internal dependency and peer ranges to caret ranges. The release script uses independent package tracking after this tag.

The first publication of a new public package is manual because npm requires the package to exist before trusted publishing can be configured. After repository verification, run `pnpm publish:packages -- --bootstrap-only` with local npm authentication. The command publishes only package names that do not exist in the registry; regular release publication refuses to publish anything while an unregistered package remains. Configure `release.yml` as the trusted publisher for each newly registered package, then retry the release workflow. Later publications use OIDC with no npm write token stored in GitHub.

After the bridge, publish with `pnpm release`. The command detects package changes since each package's latest release tag and recommends bumps independently from each package's commits. While a package remains on `0.x`, breaking changes are capped at a minor bump instead of advancing it to `1.0.0`; breaking changes recommend major only after the package is already on `1.x` or later. The command first prints the recommendation-based release plan including compatibility propagation. It then prompts for each direct package before verification and recalculates propagation from the selected bumps. `pnpm release:plan` is read-only and non-interactive: it always applies the package recommendations when rendering the plan and never changes the worktree. Independent releases do not accept a global positional bump. `--package` remains available as an explicit direct-package override, and `--bump` is scoped to the preceding package, for example `pnpm release --package @sectile/form --bump minor`. A version-only metadata or packaging repair supplies the target and a reason, for example `pnpm release --package @sectile/form --bump patch --reason "repair peer dependency metadata"`. Patch dependency releases remain isolated inside the current caret range. A minor or major dependency release automatically adds affected dependents as patch releases so their published ranges remain valid.

Each independent publication writes `release-manifest.json`, creates one `release-YYYY-MM-DD.N` release-set tag using a per-day sequence, and creates an annotated `@sectile/package@version` tag for every included package. GitHub release titles stay compact: one or two package releases name those packages and versions, while larger release sets use `N packages · YYYY-MM-DD`. Release notes keep the package version transitions and the commit subjects with short SHAs. Only manifest packages are built, packed, and published, in workspace dependency order. The workflow uploads the verified tarballs once and the publish job does not rebuild them. An existing npm version is skipped only when its registry integrity matches the verified tarball. Registry visibility is polled with bounded backoff because npm may process a successful publication asynchronously. Partial failures are retried from the same immutable release-set tag and artifact. The worktree must normally be clean; `--allow-dirty` verifies committed `HEAD` in an isolated worktree and restores unrelated local work before pushing.

See [package boundary](package-boundary.md), [component completeness](component-completeness.md),
and [naming](naming.md).

When a Core public contract intentionally changes, first update its declaration signature, then run `pnpm --filter @sectile/core update:semantic-api -- --classification=<classification> --reason=<reason>`. The accepted classification is stored with the semantic baseline; the regular `verify` command rejects an unclassified type, subpath, error-code, or tracked-default change.

Vue hydration has a fast package-local contract suite and an actual-browser
fixture. Run `pnpm --filter @sectile/vue serve:browser-verification`, open the
reported local URL in each target browser, and require
`data-sectile-verification="passed"` on the document element. This manual matrix
does not add a pull-request or main-branch workflow trigger.
