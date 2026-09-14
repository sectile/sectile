<!-- Template: sectile-pr/v1.
Read docs/engineering/workflow.md. For the pilot, open this as a Draft immediately
after the first real checkpoint has been pushed and its remote SHA confirmed.
Replace placeholders. Incomplete work and failing checks may be saved in Draft;
record them honestly. This template does not itself make the PR a Draft.
Use ordinary issue references; avoid automatic issue-closing links/keywords when
release verification is required. Human authorization controls merge/release.
-->

## Work item and baseline
- Primary issue: {{Refs #number, or N/A + explicit maintainer-directed bootstrap request}}
- Work ID: {{stable across retries and hourly runs}}
- Accepted issue-review record: {{permalink, or N/A + maintainer-directed bootstrap scope}}
- Accepted scope / criteria revision: {{review record or saved scope snapshot}}
- Implementation start base: {{branch + full commit SHA}}
- Working branch: {{branch}}
- Template / policy revision: {{template version and approved policy commit}}

## Purpose and approach
{{What this change is intended to fix, why this approach, relevant ownership and
representation decisions, and what is explicitly out of scope.}}

## Current implementation
- Completed: {{actual completed work}}
- Remaining: {{specific unfinished work}}
- Known failures / blockers: {{facts, or None after a stated check}}
- Compatibility / public API / resource impact: {{applicable impact}}

## Checkpoint and recovery
- Latest durable checkpoint record: {{permalink, or Pending until the first record is posted}}
- Last remotely confirmed saved SHA: {{full SHA}}
- Remote confirmation time: {{ISO-8601 timestamp with timezone}}
- Next concrete step: {{one actionable resumption step}}

<!-- This is a summary. Preserve checkpoint and review history in separate records.
A saved SHA does not imply successful verification. Re-read the live PR head before
acting. Local paths alone do not establish durable evidence. -->

## Verification evidence
- Selected rigor: {{Light / Standard / Strict; rationale}}
- Required validation scope: {{selected artifacts/units and why}}
- Latest verification record: {{permalink, or Not run + reason}}

| Criterion / risk | Check or artifact | Exact tested SHA / artifact identity | Result | Evidence |
| --- | --- | --- | --- | --- |
| AC-1 | {{check}} | {{identity or Not run}} | {{Passed / Failed / Partial / Incomplete / Not run / N/A + reason}} | {{durable link or Pending + reason}} |

- Skipped / not-yet-run checks and residual risk: {{specific gap}}
- Baseline failures versus changes introduced here: {{evidence, or Unknown}}

## Ready-for-review gate
<!-- Leave boxes unchecked until the evidence exists for the current PR snapshot.
Only applicable checks are required; an N/A requires a concrete rationale. -->
- [ ] The accepted scope is implemented; material scope changes have been reviewed.
- [ ] Required implementation-close validation is complete and linked to exact snapshots.
- [ ] Required failed, interrupted, and missing checks are resolved; an inapplicable check has a specific N/A rationale.
- [ ] Remaining risk and any limitations are explicit.
- [ ] Current PR head and relevant base changes have been reconciled with the evidence.
- [ ] A separate code-review pass is requested; implementation self-checks are not counted as independent approval.

## Merge, release, and completion
- Release verification requirement: {{Required + package/artifact / N/A + reason / Pending}}
- Merge / release authority: Human maintainer for this pilot.
- Issue closure: {{after the applicable verification gate; do not imply merge alone resolves a published defect}}
