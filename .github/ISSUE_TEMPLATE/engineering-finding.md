---
name: Engineering finding
about: Record an evidence-backed candidate for review before implementation.
---
<!-- Template: sectile-finding/v1. Remove instructions and replace placeholders.
Read docs/engineering/workflow.md. Submission records a candidate; it does not
approve implementation. Use Pending / Unknown / Not run / N/A with a reason.
Automation must record the actual full source commit SHA. External reporters may
provide a package version; a reviewer resolves the source baseline later.
Apply only existing, verified repository labels through the creation operation.
Keep sensitive evidence in the approved restricted channel, not this public body.
-->

> Pending issue review; implementation is not authorized by this report.
> Consult the configured Workflow and the latest qualifying review before work.

## Summary
{{Describe one root cause or a clearly bounded candidate.}}

## Baseline and affected surface
- Repository: sectile/sectile
- Reported package(s) and version(s): {{exact versions, or Unknown + reason}}
- Source ref and full commit SHA: {{actual baseline, or Unknown + reason}}
- Source / installed artifact: {{what was actually inspected or executed}}
- Affected paths, exports, and callers: {{specific surface}}
- Environment: {{runtime, package manager, OS/browser, relevant configuration}}
- Report origin: {{person or automation role; run ID when automated}}
- Template / policy revision: {{template version and approved policy commit}}

## Observed and expected behavior
**Observed:** {{facts actually observed; separate untested predictions}}

**Expected:** {{expected behavior and the contract that establishes it}}

## Evidence and reproduction
{{Minimal input, actual call path, commands, observed output, and stable evidence
links. Use commit-pinned source links. If execution is impractical, provide the
specific static proof and state what was not executed.}}

| Target | Exact source SHA or package/artifact identity | Result | Evidence |
| --- | --- | --- | --- |
| Inspected source | {{identity}} | {{result}} | {{link or concise evidence}} |
| Latest applicable published artifact | {{identity or Unknown + reason}} | {{result or Not run + reason}} | {{evidence or N/A + reason}} |

## Root cause and uncertainty
- Established facts: {{evidence-backed facts}}
- Suspected mechanism: {{hypothesis, or Confirmed + evidence}}
- Counterexamples / falsification attempted: {{attempt and outcome}}
- Unresolved questions: {{questions, or None after a stated check}}

## Impact and classification
- Impact and reachability: {{who is affected and under what conditions}}
- Proposed priority and rationale: {{existing priority convention; tentative if unreviewed}}
- Kind / area / cross-cutting concerns: {{proposed classification}}
- Security disclosure handling: {{Public-safe / Restricted follow-up + safe reference / N/A}}

## Related work and dependencies
{{List searches and relevant open/closed issues or PRs. Distinguish Duplicate,
Relates to, Blocked by, and Blocks using technical evidence. Use None found only
after searching. A similar symptom alone does not establish a duplicate.}}

## Proposed scope and acceptance criteria
<!-- This section is a proposal until a separate issue-review record accepts it. -->
- Suggested direction: {{direction, or Pending + reason}}
- In scope / out of scope: {{boundaries, or Pending + reason}}
- AC-1: {{observable outcome, or Pending + reason}}
- Regression / verification direction: {{what would prove AC-1}}
- Risk-specific evidence: {{performance, lifecycle, public API, packaging, etc., only if applicable}}
- Completion surface: {{source-only / published artifact / Pending + reason}}

## Review and handoff references
- Issue-review record: Pending — not yet independently reviewed.
- Open questions for the reviewer: {{concrete next questions}}

<!-- Current Workflow is maintained in the configured issue field. This body is
not an independent authorization source. Once reviewed, replace the initial
pending-review notice with a link to that record; do not copy mutable state here.
Do not pre-check review approvals. -->
