---
title: Engineering
description: Repository, package, build, naming, and release constraints.
---

# Engineering

The repository uses TypeScript 7 with strict, declaration-isolated settings and Node's native test runner. No renderer or framework dependency is permitted in production output.

## Release

The packages share one version. Conventional Commits determine the default bump: a breaking subject or `BREAKING CHANGE` body selects major, `feat` selects minor, and every other change selects patch.

The first publication is manual: run `pnpm verify`, `pnpm release:check v0.1.0`, and `pnpm publish:packages` with local npm authentication. Configure the `release.yml` trusted publisher for all three packages, create the annotated `v0.1.0` tag, and push it. The tag workflow verifies the already-published packages and creates the first GitHub Release.

For later releases, run `pnpm release`. It reads commits since the latest published GitHub Release, applies the recommended bump, updates every package changelog from those commits, verifies the repository, and atomically pushes local main, the release commit, and the annotated tag. Local main may be ahead of `origin/main`, but it must contain the remote tip without divergence. Use `pnpm release patch`, `pnpm release minor`, or `pnpm release major` to override the recommendation. The tag workflow publishes through npm trusted publishing with OIDC and creates release notes from the annotated tag. No npm write token is stored in GitHub.

See [package boundary](package-boundary.md), [component completeness](component-completeness.md),
and [naming](naming.md).
