# GitHub Project integration

Work ID: `sectile-project-workflow-v1`.
Adopted workflow-policy baseline:
`7bd0e7bda6c50674ac9c5c1c38e00f4555686995`.

Sectile uses one organization-owned GitHub Project as the operator view for the
engineering pilot. The issue-level organization field `Workflow` is the canonical
lifecycle state. Loki or another explicitly operated environment runs the
repository controller with the operator's existing GitHub authentication. GitHub
Actions validates the controller on pull requests; it does not mutate live
Project or Issue metadata.

## Live resources

The controller is intentionally pinned to the resources approved by the
maintainer:

- Organization: `sectile`.
- Repository: `sectile/sectile`.
- Project: `Sectile Engineering`, number `1`, node ID
  `PVT_kwDOEv2i-c4Bjedw`, public.
- Attached organization Issue Field: `Workflow`, Project field node ID
  `PVTSSF_lADOEv2i-c4BjedwzhiSuVI`.
- Field type: single select.

The controller fails closed if the Project number, node ID, title, visibility,
repository link, Workflow field node ID, or field type differs from the pinned
state. It does not search by title and adopt another Project. Resource creation,
renaming, deletion, or schema migration is a separate maintainer operation.

GitHub creates a Project-local `Status` field by default. `Status` is a view aid
only. Do not use it as a second lifecycle authority or as implementation
authorization.

## Workflow schema

The public organization `Workflow` field uses these options, in order:

1. Candidate
2. Issue Review
3. Ready
4. In Progress
5. Code Review
6. Awaiting Merge
7. Verification
8. Awaiting Release
9. Done
10. Blocked
11. Rejected
12. Duplicate

Normal transitions follow [the work-item protocol](workflow.md). Evidence records
use the v1 schemas in [records.md](records.md). `Done`, `Rejected`, and `Duplicate`
are terminal in the controller. A regression is handled by the repository
protocol rather than silently rewriting a terminal value.

## Repository owners

The integration has three repository owners:

- `scripts/lib/github-cli.mjs` executes bounded `gh` and `git` child processes
  without a shell and validates structured process/JSON results.
- `scripts/lib/github-project-workflow.mjs` owns the lifecycle graph and the
  structured Issue Review, Checkpoint, Code Review, Verification, and transition
  record parsers.
- `scripts/github-project-workflow.mjs` owns pinned-resource inspection, backlog
  reconciliation, transition plan/apply behavior, read-back, and recovery.

`.github/workflows/project-workflow-test.yml` is an unprivileged pull-request
check. It has `contents: read`, no organization mutation credentials, and no live
Project-write step. New pushes cancel older in-progress runs for the same pull
request because the check is read-only and only the newest PR snapshot is useful.

## Operator prerequisites

Run the controller from a trusted checkout with the GitHub CLI and Git installed.
The active GitHub account must have `maintain` or `admin` access to
`sectile/sectile` and enough GitHub CLI scopes to read and edit the Project and
issues. The controller also uses GitHub's versioned Issue Fields REST endpoints
through `gh api`: inspection reads the organization-level `Workflow` definition,
and mutations add only the requested issue field value. The current pilot
operator uses the existing `gh` login; the controller does not read, print,
persist, or inject a GitHub token itself.

The Project and Workflow field already exist. Routine operation therefore does
not need authority to create or edit organization Issue Field definitions. The
Project column is validated by its pinned Project field identity, while the
organization field is validated as a single-select whose ordered options match
the canonical lifecycle.

Use approved default-branch policy, pinned to an exact full SHA for every
transition. The controller fetches the current remote `main`, verifies that the
provided policy SHA is its ancestor, and keeps policy identity separate from the
source or PR snapshot being evaluated.

## Inspect live state

Start every operator session with read-only inspection:

```sh
node scripts/github-project-workflow.mjs inspect
```

Inspection verifies the pinned Project identity, public visibility, repository
link, attached Workflow field identity, Project membership, and the current
issue-level Workflow values for the enrolled pilot backlog. An unexpected CLI
result, incomplete Project list, ambiguous Workflow search, or identity mismatch
is an error rather than an empty-state fallback.

## Reconcile the enrolled backlog

The controller knows only the 34 issues explicitly enrolled under
`sectile-backlog-20260914`. It does not discover arbitrary historical issues and
never rewrites issue bodies or old evidence during reconciliation.

Preview the exact membership and initialization delta first:

```sh
node scripts/github-project-workflow.mjs reconcile
```

Apply that plan only after reviewing it:

```sh
node scripts/github-project-workflow.mjs reconcile --apply
```

For each enrolled issue, reconciliation adds a missing Project item. It preserves
any non-empty Workflow value exactly as observed and initializes only an unset
Workflow to `Candidate`. `Workflow` is an organization Issue Field, so the
controller writes it with the additive `POST .../issue-field-values` REST
operation rather than `gh project item-edit`; unrelated issue fields are not
replaced. The write response and a subsequent search-based read-back must both
confirm the requested value. After writes, the controller reads Project
membership and Workflow values again and fails if an enrolled item is still
missing, a value is unset, or a previously non-empty value changed. Re-running
reconciliation is therefore a recovery operation, not a reset to Candidate.

New issues are not automatically enrolled by a privileged GitHub Action. The
orchestrator must explicitly decide whether a new issue enters this pilot and use
the same inspected, durable process.

## Plan and apply a transition

A transition is an operator command, not an instruction embedded in an Issue
comment. Untrusted Issue/PR bodies and comments are read only as data and are
never interpolated into a shell.

A Ready transition can be planned as follows:

```sh
node scripts/github-project-workflow.mjs transition \
  --issue 194 \
  --from 'Issue Review' \
  --state Ready \
  --record 'https://github.com/sectile/sectile/issues/194#issuecomment-...' \
  --source-sha '<40-character-reviewed-source-sha>' \
  --policy-sha '<40-character-approved-policy-sha>' \
  --operation-id 'sectile-194-ready-20260915-1'
```

The matching Issue Review record is also the scope record for Ready. Later
phases pass it explicitly with `--scope-record`. PR-bound phases additionally
pass `--pr` and `--head-sha`:

```sh
node scripts/github-project-workflow.mjs transition \
  --issue 194 \
  --from 'Code Review' \
  --state 'Awaiting Merge' \
  --record 'https://github.com/sectile/sectile/pull/200#pullrequestreview-...' \
  --scope-record 'https://github.com/sectile/sectile/issues/194#issuecomment-...' \
  --source-sha '<accepted-source-sha>' \
  --policy-sha '<approved-policy-sha>' \
  --pr 200 \
  --head-sha '<current-pr-head-sha>' \
  --evidence-id 'code-review-200-v1' \
  --operation-id 'sectile-194-awaiting-merge-1'
```

`--evidence-id` identifies the structured Record ID when the evidence permalink
is a native PR review. GitHub CLI exposes native reviews with their submitted
commit and record body but not the numeric permalink identifier needed for a
direct URL lookup, so the controller resolves exactly one structured review with
that Record ID and verifies that its submitted commit equals `--head-sha`.

The command is a dry-run unless `--apply` is supplied. Apply is permitted only
after the same live checks and structured evidence validation succeed.

## Evidence validation

A heading or SHA substring is not approval. The controller parses the repository
v1 record schemas and requires their phase-specific structure.

Issue Review binds the exact repository, issue, reviewed source SHA, policy SHA,
accepted scope snapshot, evidence, decision, finding outcome, readiness, and
completion surface. Ready requires `Confirmed` plus `Ready`.

Checkpoint binds the target issue, inspected source SHA, policy revision, durable
state, and recovery section. A Blocked transition requires a concrete blocker.

Code Review binds the exact PR and current PR head, policy revision, accepted
scope reference, coverage, findings, and `Passed` decision. Code Review evidence
may be a PR comment or a native PR review; a changed head makes the prior review
historical.

Verification binds the issue/PR, exact verified source, policy revision, accepted
criteria snapshot, phase, conclusion, and artifact identity where publication is
required. Source-fixed and released-fixed results remain distinct. A
published-artifact completion surface reaches `Done` only from a `Published
artifact` Verification with `Fixed and released` and an exact artifact identity.

Evidence authors must be recognized by GitHub as an organization owner or member.
The controller records the real active GitHub account used for the transition and
requires that account to have repository `maintain` or `admin` access.

## Retry and recovery

Every transition has a stable `--operation-id`. The controller accepts the live
Workflow only when it is either the declared `--from` state or the requested
target. Any third state fails closed.

Apply writes the target Workflow, reads it back, and then publishes one
`Workflow Transition — v2` completion record on the issue. If execution stops
after the field write but before completion publication, retrying the same
operation sees the already-applied target, revalidates current evidence and SHAs,
and publishes the missing completion without writing the field a second time.

If comment publication returns an uncertain error, the controller searches the
issue for that operation ID before retrying publication. More than one completion
record for an operation is an error. An existing completion is accepted only when
its old/new states, evidence URLs, source/policy SHAs, and PR snapshot match the
same request.

Never use a new operation ID merely to bypass a failed or ambiguous prior
operation. Reconcile the existing operation first.

## Execution ownership is separate

Project membership, the Workflow value, transition records, and GitHub Actions
concurrency are metadata coordination. They do not establish exclusive ownership
of a source worktree or prove that another implementer has stopped writing.

Before automated product implementation begins or resumes, the orchestrator must
also acquire the approved execution-layer ownership/lease and confirm previous
writers/processes are no longer active. Losing that lease blocks source writes
even if the issue remains `In Progress`.

## Human authority and safeguards

The controller may prepare and validate metadata transitions. It does not merge a
PR, release a package, deploy, enable auto-merge, change branch protection or
rulesets, change repository/organization permissions, or modify recurring
schedules. Human maintainer authority for merge and release is unchanged.

Existing release and deep-verification workflows remain separate. A green
`project-workflow-test` check demonstrates the controller's repository tests for
that PR snapshot; it is not product verification and is not merge authorization.
