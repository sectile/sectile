# Contributing to Sectile

For work participating in the engineering pilot, read
[the work-item protocol](docs/engineering/workflow.md). These templates define
shared records. Automated implementation remains gated on separately configured
Project state, safeguards, and execution ownership.

## Reporting an issue

Use the **Issue report** template. Describe observed and expected behavior,
affected versions, and evidence. Automated auditors must include the actual
inspected full source SHA. External reporters who do not know a source SHA may
provide the package version and mark the source baseline unknown.

A new report enters review as a candidate. A reviewer establishes the root cause,
impact, bounded scope, acceptance criteria, dependencies, and evidence before
implementation is eligible. Do not assume priority alone authorizes work.

## Implementing a reviewed item

Confirm that the issue is Ready and inspect its accepted review record and
current dependencies. Follow root and relevant package AGENTS.md instructions.
Record the claim, baseline, and plan before editing. Commit and push the first
small real change, confirm its remote SHA, and open a Draft PR using the repository
PR template. Incomplete changes and failing checks may be checkpointed in Draft.

Keep the same work branch and PR across handoffs. Record next steps using the
[checkpoint template](docs/engineering/records.md#checkpoint-template).
Required implementation-close evidence is completed before requesting review.

## Reviewing and closing work

Use the [review and verification templates](docs/engineering/records.md), recording
exact source SHAs and applicable artifact identities. Keep self-checks distinct
from the separate review step. The human maintainer decides merge and release
in this pilot. Issues requiring published-artifact verification stay open until
that evidence is complete.
