---
title: Engineering
description: Repository, package, build, naming, and release constraints.
---

# Engineering

The repository uses TypeScript 7 with strict, declaration-isolated settings and Node's native test runner. No renderer or framework dependency is permitted in production output.

## Release

`v0.14.1` is the compatibility bridge from synchronized versions to independent package versions. This final synchronized release changes published internal dependency and peer ranges to caret ranges. The release script uses independent package tracking after this tag.

The first publication of a new public package is manual because npm requires the package to exist before trusted publishing can be configured. After repository verification, run `pnpm publish:packages -- --bootstrap-only` with local npm authentication. The command publishes only package names that do not exist in the registry. Configure `release.yml` as the trusted publisher for each newly registered package and enable its **Allow npm publish** setting. Later publications use Releaseway's direct OIDC publishing with no npm write token stored in GitHub; an unregistered public workspace package blocks publication.

After the bridge, publish with `pnpm release`. The command detects package changes since each package's latest release tag and recommends bumps independently from each package's commits. While a package remains on `0.x`, breaking changes are capped at a minor bump instead of advancing it to `1.0.0`; breaking changes recommend major only after the package is already on `1.x` or later. The command prints one recommendation-based release plan including compatibility propagation, then asks for one global confirmation before verification and publication. `pnpm release --yes` prints the same plan but accepts it without requiring an interactive terminal, which is intended for reviewed automation and agent-driven releases. `pnpm release:plan` remains read-only and non-interactive. Independent releases do not accept positional bump or package/version override arguments; patch dependency releases remain isolated inside the current caret range, while a minor or major dependency release automatically adds affected dependents as patch releases so their published ranges remain valid.

Each independent publication writes `release-manifest.json`, creates one `release-YYYY-MM-DD.N` release-set tag using a per-day sequence, and creates an annotated `@sectile/package@version` tag for every included package. Every GitHub release title uses `N packages · YYYY-MM-DD`, including releases containing one or two packages. The date is the UTC release-set tag date. The release-set annotation contains only that title. The worktree must normally be clean; `--allow-dirty` prepares committed `HEAD` in an isolated worktree and restores unrelated local work before pushing.

The workflow generates release notes with Releaseway's `changelog` template before any npm publication. `.github/release-notes.yml` owns the presentation policy: Added / Changed / Fixed and related sections, comparison links, and the previous published `release-*` release as the repository change boundary. Build, CI, style and test commits, plus release, verification and performance-harness housekeeping scopes, are omitted from this consumer summary. Performance changes scoped to product packages remain included. Sectile adds a table of the manifest's independent package versions with links to npm and commit-pinned package changelogs; an explicit maintenance reason appears above the table when present. The repository change range is distinct from each package's own history, which remains in its changelog. The first matching release without an existing base requires an explicit policy decision instead of silently including all history.

`scripts/release-metadata.mjs` combines only those package facts with the generated Markdown, preserving the template body. It does not read signed tag annotations or qualification output. Before sealing the final body, it rejects PGP armor and the `Pre-publication qualification` log section, including Markdown-escaped text and maintenance reasons. A rejected body stops preparation before npm publication. The final `notes.md` and Releaseway's `release-notes-report.json` are frozen in the preparation artifact. Publication uses `notes: file` to send those exact reviewed bytes; it does not bypass the template or regenerate notes during a GitHub-only retry. Qualification logs, performance records and publication reports belong in evidence, not in the consumer-facing body. Existing published notes are not automatically rewritten; the authorized migration of all 39 historical bodies is recorded in [the migration verification](../../verification/releases/notes-2026-10-24.md).

The release command dispatches `release.yml` on the release-set **tag ref**, so the workflow SHA, checkout, manifest source and remote tag all identify the same commit. For manual dispatch, use `gh workflow run release.yml --ref <release-tag> --field tag=<release-tag>`. A dispatch on `main` with a different tag input is rejected. The workflow serializes releases across tags and uses the tooling committed in the release source; it does not overlay newer tooling onto an older source. Tags predating this integration retain their original workflow and recovery procedure.

Only release-manifest packages are built and packed. The pack owner runs release metadata validation once, then checks packed files, exports, source maps and dependency rewriting. The pack command's `--releaseway-manifest` option seals all selected tarballs into `artifacts.json`, recording their original source and SHA-512 SRI. `scripts/lib/release-artifacts.mjs` owns this external handoff format; `scripts/publish-packages.mjs` calls it after validation. The preparation job uploads tarballs, manifest, generated notes and the notes report together. The npm job downloads that exact artifact ID and passes the manifest to `releaseway/npm-actions`; it neither rebuilds nor repacks. Independent package versions remain authoritative in `package.json`, and `.github/npm/packages.yml` selects direct publishing.

Sectile retains independent version calculation, compatibility propagation, package changelogs, atomic branch/package-tag publication and local-work isolation because Releaseway's single-series preparation does not replace those responsibilities. npm submission, registry polling and GitHub Release lifecycle belong to Releaseway. Manual first-package bootstrap remains separate. Historical tag readers remain available for artifact validation; the obsolete synchronized-version publication path is removed.

Releaseway checks every unpublished workspace package has a supplied artifact, so an unpublished version outside the release manifest blocks the run instead of broadening publication. Supplied already-public versions must match their original SHA-512; other already-public workspace versions retain existence-only skip behavior. Direct publication waits for matching live registry integrity, with Releaseway's 20-minute visibility budget and 10-second polling. npm publication is not atomic across packages.

After a partial failure, use **Re-run failed jobs** on the original workflow run to reuse its original successful preparation job and artifact ID. Preserve the original manifest and tarballs; do not regenerate them merely to retry. If the preparation artifact has expired, recover the exact original bundle from durable storage and investigate before retrying. npm and GitHub diagnostics are uploaded even on controlled failures. Workflow artifacts are retained for 90 days, subject to repository limits. Successful releases also attach the tarballs, manifest and npm evidence to the immutable GitHub Release. To retry only GitHub publication, retain the same npm evidence artifact as well; report bytes from another npm attempt are not interchangeable with existing immutable assets.

GitHub **immutable releases** must be enabled in repository settings before using `releaseway/actions`. The final GitHub job has repository write permission but no npm OIDC authority; the npm job has OIDC authority and only repository read permission. GitHub publication creates or resumes a draft, uploads all requested assets, verifies them, then publishes. Prepare acceptance and performance evidence before final publication; published immutable releases cannot receive later attachments. Sectile's release qualification and published-consumer acceptance remain separate checks, and this workflow does not claim to execute them. Build/test and version-planning ownership stay in Sectile. Releaseway's two actions are pinned to reviewed v0.8.0 commit SHAs in the workflow.

See [package boundary](package-boundary.md), [component completeness](component-completeness.md),
and [naming](naming.md).

When a Core public contract intentionally changes, first update its declaration signature, then run `pnpm --filter @sectile/core update:semantic-api -- --classification=<classification> --reason=<reason>`. The accepted classification is stored with the semantic baseline; the regular `verify` command rejects an unclassified type, subpath, error-code, or tracked-default change.

Vue hydration has a fast package-local contract suite and an actual-browser
fixture. Run `pnpm --filter @sectile/vue serve:browser-verification`, open the
reported local URL in each target browser, and require
`data-sectile-verification="passed"` on the document element. This manual matrix
does not add a pull-request or main-branch workflow trigger.

The separate automated interaction journey uses `node scripts/browser-verification.mjs`
after `pnpm verify:prepare` and the `publication-artifacts` verification unit.
It resolves public imports to those prepared tarballs and reports their SHA-256
digests. The existing deep-verification workflow runs Chromium on Linux and
real Hangul input in headed Chromium across four standard macOS runner shards.
Those checks cover candidate bytes; published-consumer acceptance additionally
requires the released registry versions.
