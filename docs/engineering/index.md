---
title: Engineering
description: Repository, package, build, naming, and release constraints.
---

# Engineering

The repository uses TypeScript 7 with strict, declaration-isolated settings and Node's native test runner. No renderer or framework dependency is permitted in production output.

## Release

The packages share one version. Conventional Commits determine the default bump: a breaking subject or `BREAKING CHANGE` body selects major, `feat` selects minor, and every other change selects patch.

The first publication of a new public package is manual because npm requires the package to exist before trusted publishing can be configured. After repository verification, run `pnpm publish:packages -- --bootstrap-only` with local npm authentication. The command publishes only package names that do not exist in the registry; regular release publication refuses to publish anything while an unregistered package remains. Configure `release.yml` as the trusted publisher for each newly registered package, then retry the release workflow. Later publications use OIDC with no npm write token stored in GitHub.

For later releases, run `pnpm release`. It reads commits since the latest published GitHub Release, recommends a bump, and asks you to choose patch, minor, or major before changing anything. It then updates every package changelog from those commits, removes all generated package, verification, and documentation outputs, runs one quiet full verification on the current local Node version, atomically pushes local main with the release commit and annotated tag, and dispatches `release.yml` exactly once for that tag. Use `pnpm release patch`, `pnpm release minor`, or `pnpm release major` to choose non-interactively. Local main may be ahead of `origin/main`, but it must contain the remote tip without divergence. The release workflow runs the same clean-build release gate on Node 24 and a focused clean-build runtime compatibility gate on Node 26 before it publishes through npm trusted publishing with OIDC, creates the GitHub Release, and deploys the documentation artifact produced by the Node 24 gate. A failed deployment can be retried from the workflow dispatch input without moving the tag, provided every published package directory still matches the tag. No npm write token is stored in GitHub.

See [package boundary](package-boundary.md), [component completeness](component-completeness.md),
and [naming](naming.md).

When a Core public contract intentionally changes, first update its declaration signature, then run `pnpm --filter @sectile/core update:semantic-api -- --classification=<classification> --reason=<reason>`. The accepted classification is stored with the semantic baseline; the regular `verify` command rejects an unclassified type, subpath, error-code, or tracked-default change.
