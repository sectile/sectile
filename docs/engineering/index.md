---
title: Engineering
description: Repository, package, build, naming, and release constraints.
---

# Engineering

The repository uses TypeScript 7 with strict, declaration-isolated settings and Node's native test runner. No renderer or framework dependency is permitted in production output.

## Release

The packages share one version. Conventional Commits determine the default bump: a breaking subject or `BREAKING CHANGE` body selects major, `feat` selects minor, and every other change selects patch.

The first publication of a new public package is manual because npm requires the package to exist before trusted publishing can be configured. Run the repository verification and package publication with local npm authentication, then configure `release.yml` as that package's trusted publisher. Later publications use OIDC with no npm write token stored in GitHub.

For later releases, run `pnpm release`. It reads commits since the latest published GitHub Release, recommends a bump, and asks you to choose patch, minor, or major before changing anything. It then updates every package changelog from those commits, removes all generated package, verification, and documentation outputs, runs one quiet full verification on the current local Node version, and atomically pushes local main, the release commit, and the annotated tag. Use `pnpm release patch`, `pnpm release minor`, or `pnpm release major` to choose non-interactively. Local main may be ahead of `origin/main`, but it must contain the remote tip without divergence. The tag workflow runs the same clean-build release gate on Node 24 and a focused clean-build runtime compatibility gate on Node 26 before it publishes through npm trusted publishing with OIDC, creates the GitHub Release, and deploys the documentation artifact produced by the Node 24 gate. A failed tag deployment can be retried from the workflow dispatch input without moving the tag, provided the published package contents have not changed. No npm write token is stored in GitHub.

See [package boundary](package-boundary.md), [component completeness](component-completeness.md),
and [naming](naming.md).
