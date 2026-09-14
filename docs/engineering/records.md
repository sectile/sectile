# Review, verification, and checkpoint records

Schema family: sectile-records/v1. Copy only the matching section.
Replace placeholders and retain relevant headings. State N/A with a reason for
inapplicable fields. Record actual evidence rather than a narrative of intent.
Current Workflow is updated separately after evidence is saved and validated.

## Issue review template

```markdown
## Issue Review — v1
- Record ID: {{stable identifier for this publication, reused on retry}}
- Work ID / Run ID: {{stable work identifier}} / {{execution identifier}}
- Reviewer / role: {{actual actor}} / Issue Reviewer
- Reviewed at: {{ISO-8601 with timezone}}
- Repository / issue: {{repository}} / #{{issue}}
- Reviewed source ref / full SHA: {{ref}} / {{SHA}}
- Template version / policy commit: {{version}} / {{SHA}}
- Issue body observed at: {{updated_at or snapshot evidence}}

### Accepted scope snapshot
{{Copy the bounded scope and identified acceptance criteria actually evaluated.
A recoverable immutable snapshot reference may replace the copy.}}

### Evidence and findings
{{Reproduction or decisive static proof; root cause; impact/reachability;
deduplication results; actual checks and outputs; counterexamples considered;
known gaps; source-versus-published status.}}

### Decision and handoff
- Finding outcome: {{Confirmed / Needs evidence / Rejected / Duplicate}}
- Implementation readiness: {{Ready / Not ready + reasons}}
- Priority and rationale: {{classification}}
- Dependencies: {{evidence-backed blockers, or None after checking}}
- Regression / verification plan: {{acceptance-criterion mapping}}
- Completion surface: {{Source-only / Published artifact + exact scope}}
- Recommended next action: {{specific action}}
```

## Code review template

```markdown
## Code Review — v1
- Record ID / Work ID / Run ID: {{identifiers}}
- Reviewer / role: {{actual actor}} / Code Reviewer
- Reviewed at: {{ISO-8601 with timezone}}
- Repository / PR: {{repository}} / #{{PR}}
- Reviewed PR head SHA: {{full SHA}}
- Reviewed base SHA: {{full SHA}}
- Tested target SHA: {{full SHA or Not run + reason}}
- Worktree/instrumentation: {{clean, or preserved patch + digest}}
- Accepted issue-review / scope snapshot: {{permalink}}
- Template version / policy commit: {{version}} / {{full SHA}}

### Review coverage and evidence
{{Files, paths, contracts, acceptance criteria, regression/resource/performance
considerations, actual commands/results, and gaps. Cite durable evidence.}}

### Findings
{{Actionable findings with commit-pinned source references, or no blocking
findings within the explicitly described coverage.}}

### Decision
- Outcome: {{Passed / Changes required / Incomplete / Blocked}}
- Current head/base recheck: {{observed SHAs and time; explain any change}}
- Remaining risks: {{risks or None within the stated coverage}}
- Required next action: {{action}}
```

Submit a GitHub PR review against the reviewed commit when supported. A comment
can preserve evidence when review submission is unavailable, but must not be
represented as a native GitHub approval. An implementation self-check never
counts as the separate code-review requirement.

## Verification template

```markdown
## Verification — v1
- Record ID / Work ID / Run ID: {{identifiers}}
- Verifier / role: {{actual actor}} / Verifier
- Verified at: {{ISO-8601 with timezone}}
- Repository / issue / PR: {{references}}
- Phase: {{Implementation close / Post-merge / Published artifact}}
- Source full SHA: {{actual SHA or N/A + justified artifact mapping}}
- Package / version / artifact digest or integrity: {{exact identity or N/A}}
- Environment / tool versions: {{actual environment}}
- Source state: {{clean snapshot, or preserved patch + digest}}
- Accepted criteria snapshot: {{permalink}}
- Template version / policy commit: {{version}} / {{full SHA}}

| Unit / criterion | Command or procedure | Exact target | Outcome | Durable evidence |
| --- | --- | --- | --- | --- |
| {{ID}} | {{command}} | {{SHA/artifact}} | {{Passed / Failed / Incomplete / Not run / N/A + reason}} | {{evidence}} |

- Untested areas / residual risk: {{specific gaps}}
- Conclusion: {{Fixed on source / Awaiting release / Fixed and released / Not fixed / Incomplete}}
- Recommended next action: {{action; completion remains subject to policy gates}}
```

## Checkpoint template

```markdown
## Checkpoint — v1
- Record ID / Work ID / Run ID: {{identifiers}}
- Actor / role: {{actual actor}} / {{role}}
- Recorded at: {{ISO-8601 with timezone}}
- Repository / issue / PR / branch: {{references, or N/A + reason}}
- Inspected source SHA: {{full SHA}}
- Template version / policy commit: {{version}} / {{full SHA}}
- Previous durable checkpoint: {{permalink or None — first checkpoint}}

### Durable state
- Last remotely confirmed saved SHA: {{full SHA; N/A for read-only work}}
- Remote confirmation: {{remote ref and observation time, or N/A}}
- Latest completed verification: {{exact SHA/artifact + result + record, or Not run}}
- Unsaved or local-only changes: {{explicit contents and limits, or None}}
- Evidence / patch / log location and retention: {{durable reference or explicit local-only gap}}

### Progress and recovery
- Completed facts/work: {{completed units; audited area and coverage for auditors}}
- Incomplete work / known failures: {{specific state}}
- Interrupted checks: {{unit ID + actual state; never infer success}}
- First next action: {{one concrete action from this checkpoint}}
- Remaining plan: {{bounded remaining units}}
- Dependencies / blockers: {{facts}}
- Write ownership / running processes: {{observed state; recheck before takeover}}
- Recommended next audit area: {{auditors only, otherwise N/A}}
```

Use checkpoints at meaningful durable boundaries, including before expensive
verification and at handoff. Do not produce one comment per trivial operation.
A mutable summary may point to the latest checkpoint, while prior checkpoint
records remain available. Read-only auditors/reviewers preserve their evidence
and next steps without creating meaningless commits.
