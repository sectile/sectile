# GitHub Project integration

Work ID: `sectile-project-workflow-v1`.
Implementation baseline: `7bd0e7bda6c50674ac9c5c1c38e00f4555686995`.
Status: implementation checkpoint; no GitHub App, Project, field, secret, or live
workflow has been installed by adding this document.

## Approved purpose

The maintainer requested an organization-owned `Sectile Engineering` Project for
`sectile/sectile`, public organization Issue fields shared with that Project, and
a GitHub App + GitHub Actions path for applying evidenced Workflow transitions.
Use [the work-item protocol](workflow.md), [record templates](records.md), and the
repository Issue report and PR templates. Product implementation, merge, release,
and execution ownership remain governed by the existing protocol.

## Implementation boundary

The repository root owns this cross-service control path. Reusable logic belongs
under `scripts/lib/`, a root command invokes it, and root tooling tests exercise
the production logic with a deterministic fake API. Existing release/deep-test
workflows have distinct responsibilities and must remain unchanged. New Actions
entrypoints separate privileged manual setup from normal metadata updates and
unprivileged pull-request tests.

Use the documented organization Issue Fields REST API for schema and values, and
Projects GraphQL mutations for Project creation/linking and attaching existing
organization fields. Never create a second Project-local Workflow authority.
Runtime field writes must preserve unrelated values, confirm the result by
reading it back, and preserve a durable intent/result record. Unknown schemas,
actors, evidence, or current states fail closed rather than guess.

## Acceptance criteria

- AC-1: Explicit manual setup can discover or create the scoped organization
  Project and public Issue fields, share those actual fields with the Project,
  and report the real returned IDs/URL. Existing incompatible fields/projects
  require reconciliation rather than destructive recreation.
- AC-2: Existing enrolled issues retain their identities, evidence, current
  review outcomes, and unrelated metadata. Initial Candidate assignment applies
  only where canonical Workflow is unset, without resetting reviewed work.
- AC-3: An authorized issue-comment request can apply only a valid protocol
  transition after checking the actual issue, referenced evidence, source/policy
  SHAs, scope snapshot, and applicable PR state. Priority never grants readiness.
- AC-4: No untrusted PR checkout or issue text is executed with the App token.
  Runtime tokens have no code-write, merge, publication, deployment, secret, or
  repository-administration authority. Setup privileges are separated from
  routine value writes and manually approved.
- AC-5: Retries reconcile actual remote state and recorded intent rather than
  duplicate records or silently overwrite concurrent changes. Workflow mutation
  serialization must not be described as a product-worker execution lease.
- AC-6: Targeted tests cover schema mismatch, unauthorized/malformed requests,
  stale source/PR/scope evidence, field preservation, partial failure recovery,
  and accepted transitions. Live installation tests remain explicitly Pending
  until the maintainer supplies an App installation and secrets in GitHub.
- AC-7: Publish exact setup steps, required App permissions, configuration names,
  request examples, recovery behavior, and remaining human activation steps.

## Deferred activation

This PR will not merge itself, register/install an App, write credentials, make
organization resources public, change branch protection, enroll unrelated work,
change ChatGPT schedules, or enable product implementation. Those live setup
operations need the corresponding human-controlled configuration and approval.
Do not paste an App private key into an issue, PR, or chat.

## Checkpoint

Completed: approved scope, ownership, and acceptance criteria recorded.
Remaining: setup and runtime commands, Actions, deterministic tests, complete
operator guide, and read-back verification of committed artifacts.
Verification: Not run; this first checkpoint is documentation only.
First next action: implement the shared API/schema and transition-validation
owner, then wire the privileged and unprivileged Actions entrypoints.
