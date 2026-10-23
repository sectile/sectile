# Automatic release presentation and title verification

## Verification — v1

- Record ID / Work ID / Run ID: release-presentation-20261024-verified / release-presentation / 20261024
- Verifier / role: Codex / Verifier; maintainer-directed work, no independent code-review claim.
- Verified at: 2026-10-23T15:59:13.927Z.
- Repository / issue / PR: sectile/sectile; direct maintainer request to verify automatic template use, prevent recurrence of signature/qualification-log contamination, and standardize release titles.
- Phase: Implementation close and published GitHub metadata verification; no package publication.
- Source full SHA: ded326bf77787f1936a94acb44ef85c5891790e6.
- Package / version / artifact digest or integrity: N/A for runtime; exact historical body hashes and tag objects appear in [the title migration evidence](titles-2026-10-24.json).
- Environment / tool versions: WSL Linux; explicit Node 24.21.0; Git 2.43.0; GitHub CLI 2.103.0.
- Source state: committed release tooling; pre-existing untracked coverflow proposal excluded; one-off title helper and local API payloads under ignored `.tmp/release-notes-retrofit-20261024/`.
- Accepted criteria snapshot: automatically apply the existing Releaseway changelog template to future releases; verify the body input path and reject PGP armor/previous qualification logs before publication; use `N packages · YYYY-MM-DD` for every future title and all 39 existing titles; retain current bodies, metadata, assets and tags; leave Editor unchanged.
- Template version / policy commit: sectile-records/v1 / 8b998d076d74f6f9b7a27aa74c454e89fa6f5874.

| Unit / criterion | Command or procedure | Exact target | Outcome | Durable evidence |
| --- | --- | --- | --- | --- |
| Automatic template | Trace `release.yml` preparation through the metadata CLI and final GitHub job | Workflow and scripts at source SHA | Passed by source inspection and existing workflow contract test | Commit-pinned workflow; same Releaseway v0.8.0 pins retained |
| Contaminated body rejection | Execute metadata CLI with plain/Markdown-escaped PGP armor, qualification section, and contaminated maintenance reason | Temporary Git fixtures using production CLI | Passed; no notes artifact or output metadata emitted | Updated `scripts/release-plan.test.mjs` at source SHA |
| Valid body preservation | Execute metadata CLI with clean preview and inspect sealed body and title | Temporary Git fixture | Passed; template bytes retained and unified title emitted | Same integration test |
| Title generation | Exercise one, two, three and legacy-date release sets | Production `formatReleaseTitle` | Passed | Updated `scripts/release.test.mjs` at source SHA |
| Release regression suite | `node --test scripts/release.test.mjs scripts/release-plan.test.mjs scripts/release-artifacts.test.mjs scripts/release-worktree.test.mjs` | Source SHA | Passed: 31 tests, zero failures/skips | Committed tests; explicit Node 24.21.0 via interactive WSL bash |
| Historical titles | PATCH only `name` when needed, GET each release, then re-list all releases and compare remote tag objects | All 39 release IDs; 26 required changes | Passed | Title evidence JSON with before/after names, body hashes, metadata hashes and tag objects |
| Scope and formatting | `git status --short`, diff statistics, `git diff --check`, explicit staged inspection | Task-owned files only | Passed | Implementation and separate evidence commits; unrelated proposal preserved |

The preparation job always invokes Releaseway's `changelog` preview using
`.github/release-notes.yml`. The metadata CLI adds manifest package facts and an
optional maintenance reason. Its only prose input is the preview file; it does
not read a tag annotation, local verification output or npm diagnostics. The
complete body is checked before an artifact directory is created. PGP armor and
`Pre-publication qualification` text cause preparation to fail, including when
Markdown escaping was applied. The accepted body is preserved byte-for-byte;
the final publication job receives only frozen `notes.md` from the successful
preparation artifact. Publication reports remain separate assets. The workflow
requires preparation success before npm publication can start.

All future titles now use the same production formatter from both local release
planning and workflow metadata. Dates come from UTC release-set tags. For old
`v*` releases without a dated release-set tag, the retrospective title migration
uses the original UTC publication date. Package counts match each body's package
table and historical release manifest/source. Existing historical signed tag
annotations were not rewritten. Title changes supersede the title values in the
earlier body-migration observation; its body hashes and other evidence remain
unchanged.

- Untested areas / residual risk: no new live npm publication, release workflow dispatch, browser rendering, runtime build or performance checks were needed or run. The guard catches PGP armor and the known qualification-log section; it is not a classifier for every possible log format. Separation of input sources prevents automatic verification/report log ingestion. A future workflow change or a direct manual/API edit can change that contract. Historical workflow reruns continue to use their old tag-bound tooling, not this commit.
- Conclusion: automatic template use confirmed; specified contamination blocked before publication; all 39 public titles conform and their bodies, metadata, assets and tag objects are unchanged by this title-only migration.
- Recommended next action: create future release tags from main containing the source commit above; no package republication is necessary for these editorial changes.
