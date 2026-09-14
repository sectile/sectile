# GitHub Project integration

Work ID: `sectile-project-workflow-v1`.
Implementation baseline and adopted policy revision:
`7bd0e7bda6c50674ac9c5c1c38e00f4555686995`.

This integration supplies repository-owned setup and transition tooling. Merging
it does not itself register a GitHub App, create credentials, approve the setup
environment, run setup, or establish the separate execution lease required for
product implementation.

## Purpose and authority

The maintainer requested an organization-owned public `Sectile Engineering`
Project for `sectile/sectile` and one public organization Issue Field named
`Workflow`. The Issue Field is the canonical lifecycle authority shared with the
Project. Do not create a second Project-local Workflow or treat Project `Status`
as another work-authorization source.

Use [the work-item protocol](workflow.md), [record templates](records.md), and the
repository Issue/PR templates. Priority and area remain repository labels. Merge,
release, branch safeguards, product-work ownership, and technical validation keep
their existing owners.

## Workflow schema

`Workflow` is a public organization single-select Issue Field with these options,
in this order:

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

Normal forward transitions are deliberately narrow. Rework returns through the
specific earlier phase encoded in `scripts/lib/github-project-workflow.mjs`.
`Done`, `Rejected`, and `Duplicate` are terminal for this automation; a confirmed
same-root regression is handled through the repository protocol rather than a
silent field rewrite.

## Repository owners

- `scripts/lib/github-api.mjs`: JSON REST/GraphQL client with injectable transport.
- `scripts/lib/github-project-workflow.mjs`: schema, transition graph, request
  parser, provenance checks, and field helpers.
- `scripts/github-project-workflow.mjs`: idempotent setup/repair entrypoint.
- `scripts/github-project-workflow-event.mjs`: issue initialization and guarded
  transition entrypoint.
- `.github/workflows/project-workflow-setup.yml`: manually approved live setup.
- `.github/workflows/project-workflow.yml`: issue/opened and explicit transition
  requests after setup.
- `.github/workflows/project-workflow-test.yml`: unprivileged pull-request checks.

Existing release and deep-verification workflows remain separate. Metadata
serialization in `project-workflow.yml` is not the execution-layer ownership
lease required before automated product edits.

## GitHub App

Create one GitHub App dedicated to this integration and install it only on the
`sectile/sectile` repository. Give it only the permissions needed by the current
implementation:

Organization permissions:

- Issue Fields: Read and write.
- Projects: Read and write.

Repository permissions:

- Contents: Read.
- Issues: Read and write.
- Pull requests: Read.
- Metadata: Read (GitHub App metadata access; used for repository and collaborator
  permission checks).

Do not grant Contents write, Actions write, Workflows write, Administration,
Deployments, Packages, Pages, Secrets, or merge/release permissions for this
integration. If GitHub requires an additional permission for one documented API
operation, review that permission separately before expanding the App.

Configure these repository values after the App is installed:

- Actions variable `SECTILE_PROJECT_APP_CLIENT_ID`: the App client ID.
- Actions secret `SECTILE_PROJECT_APP_PRIVATE_KEY`: the App private key.

Never put the private key in an issue, PR, repository file, workflow input, chat,
or command output. Rotate it through GitHub if disclosure is suspected.

## Manual activation

Before live setup, create a repository Actions environment named
`github-project-setup` and require the desired human reviewer(s). The setup job
uses that environment, one non-canceling concurrency group, and the scoped App
installation token.

After this PR is merged and the App/variable/secret/environment exist:

1. Open Actions → `project-workflow-setup` → Run workflow.
2. The job first runs a read-only plan, then the idempotent apply command.
3. Inspect the output and the organization UI. Confirm one open public
   `Sectile Engineering` Project, one public organization `Workflow` field with
   the exact schema above, the repository link, and the Project field attachment.
4. Confirm all 34 maintainer-enrolled pilot issues are Project items. Setup sets
   `Candidate` only where Workflow is unset; any already-present Workflow value
   is preserved and reported.
5. Re-run setup once as a recovery/idempotency check if the first run was
   interrupted. It must reconcile existing resources rather than recreate them.

An incompatible existing Project or Workflow schema fails closed for human
reconciliation. The setup code never deletes, renames, or silently rewrites an
incompatible organization resource.

## Runtime transition requests

A maintainer with repository `maintain` or `admin` role requests a transition by
posting a new issue comment. The first line and fields are data parsed by Node;
they are never interpolated into a shell command.

Issue Review example:

```text
/sectile-workflow
state: Issue Review
record: https://github.com/sectile/sectile/issues/194#issuecomment-123456
```

Ready example:

```text
/sectile-workflow
state: Ready
record: https://github.com/sectile/sectile/issues/194#issuecomment-123456
source-sha: 0123456789abcdef0123456789abcdef01234567
policy-sha: 89abcdef0123456789abcdef0123456789abcdef
```

Code Review / Awaiting Merge / Verification also include the exact PR identity:

```text
pr: 201
head-sha: fedcba9876543210fedcba9876543210fedcba98
```

The handler re-reads the actor permission, canonical Workflow schema, current
field value, current default HEAD, exact commit SHAs, same-issue evidence comment,
and applicable PR state. It verifies that the policy SHA is an ancestor of the
current default HEAD and that the requested transition is allowed. When a PR is
required, its current head must equal `head-sha` and its body must contain an
ordinary `Refs #N`-style reference to the issue. Draft/merged state is checked for
the applicable phases.

After the field write, the handler reads the Issue Field back. It then appends one
`Workflow transition — v1` result record with the request, actor, old/new state,
record, exact SHAs, observed default HEAD, and PR identity. A failed check leaves
the Workflow unchanged and the Actions run failed for inspection.

The evidence parser is intentionally conservative. A well-formed request does
not substitute for a qualifying Issue Review, Code Review, or Verification
record. If a new record schema is adopted, update and review this integration
rather than weakening checks ad hoc.

## Existing issues and recovery

The setup command knows only the 34 issues explicitly enrolled by the maintainer
under `sectile-backlog-20260914`. It does not discover or rewrite unrelated
historical issues. Newly opened issues are auto-added only when their body carries
the approved `sectile-issue-report/v1` marker, and receive `Candidate` only if
Workflow is unset.

Routine Workflow writes use the issue-field POST operation so unrelated Issue
Field values are preserved. Writes are followed by GET read-back. Project item
and Workflow mutation is serialized per issue by Actions concurrency, but this
only protects this metadata workflow. It does not prove another implementation
worker has stopped writing code.

If an Actions run is interrupted, inspect its last API action/result, current
Project membership, current Workflow value, and the durable issue record before
retrying. Never infer success from the presence of a filled template or from an
expired runner.

## Acceptance criteria and status

- AC-1: Setup discovers or creates the scoped Project and public organization
  Workflow field, attaches the real field, links the repository, and reports
  actual returned identities. Implementation: present; live activation Pending.
- AC-2: Enrolled issue identity/evidence/unrelated metadata is preserved and
  Candidate initializes only unset Workflow. Implementation: present; live
  read-back Pending.
- AC-3: Transition requests check actual issue state, same-issue evidence,
  source/policy SHAs, current default branch, transition graph, and required PR
  identity/state before a write. Implementation: present.
- AC-4: Untrusted issue/PR strings are treated as data; App token has no intended
  code-write, merge, release, deployment, secret, or repository-admin authority.
  Implementation: present in code/workflow; App registration review Pending.
- AC-5: Setup is idempotent and routine writes use read-back plus per-issue
  serialization. This is explicitly not a product execution lease. Implementation:
  present; interruption/retry live evidence Pending.
- AC-6: Targeted static/unit checks exist for schema, transition, malformed input,
  provenance, role mapping, and field preservation. Live App/Project end-to-end
  validation remains Pending until human activation.
- AC-7: Permissions, configuration names, activation, request syntax, and recovery
  are documented here. Implementation: present.

## Deferred human decisions

This work does not merge itself, register/install the App, write credentials,
approve an Actions environment, change organization visibility/settings, change
branch protection, enable auto-merge, publish, deploy, release, or establish the
exclusive product-work lease. Human review and activation are required before
this integration can become the canonical live gate.
