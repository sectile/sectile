import assert from 'node:assert/strict'
import test from 'node:test'

import { createGitHubCLI } from './lib/github-cli.mjs'
import {
  PINNED_PROJECT,
  parseProjectItems,
  parseTransitionArgs,
  readWorkflowValues,
  reconciliationPlan,
  transitionDisposition,
  validatePinnedResources,
} from './github-project-workflow.mjs'
import {
  MAINTAINER_ENROLLED_ISSUES,
  WORKFLOW_FIELD,
  parseRecordBody,
  parseRecordURL,
  parseTransitionCompletion,
  requireTransition,
  transitionAllowed,
  validateCodeReviewRecord,
  validateIssueReviewRecord,
  validateTransitionEvidence,
  validateVerificationRecord,
} from './lib/github-project-workflow.mjs'

const SHA_A = 'a'.repeat(40)
const SHA_B = 'b'.repeat(40)
const SHA_C = 'c'.repeat(40)

function issueReviewBody({
  source = SHA_A,
  policy = SHA_B,
  outcome = 'Confirmed',
  readiness = 'Ready',
  surface = 'Published artifact + @sectile/chart',
} = {}) {
  return [
    '## Issue Review — v1',
    '- Record ID: review-194-v1',
    '- Work ID / Run ID: sectile-issue-194 / review-run-1',
    '- Reviewer / role: reviewer-bot / Issue Reviewer',
    '- Reviewed at: 2026-09-15T01:00:00+09:00',
    '- Repository / issue: sectile/sectile / #194',
    `- Reviewed source ref / full SHA: main / ${source}`,
    `- Template version / policy commit: v1 / ${policy}`,
    '- Issue body observed at: 2026-09-15T00:59:00+09:00',
    '',
    '### Accepted scope snapshot',
    'AC-1 through AC-9 from the reviewed issue snapshot.',
    '',
    '### Evidence and findings',
    'The root cause and affected surface were independently reviewed.',
    '',
    '### Decision and handoff',
    `- Finding outcome: ${outcome}`,
    `- Implementation readiness: ${readiness}`,
    '- Priority and rationale: P2 / bounded resource contract',
    '- Dependencies: None after checking',
    '- Regression / verification plan: deterministic production regression',
    `- Completion surface: ${surface}`,
    '- Recommended next action: implement the accepted criteria',
  ].join('\n')
}

function codeReviewBody({ head = SHA_C, policy = SHA_B, outcome = 'Passed' } = {}) {
  return [
    '## Code Review — v1',
    '- Record ID / Work ID / Run ID: code-review-200-v1 / sectile-issue-194 / code-review-run-1',
    '- Reviewer / role: reviewer-bot / Code Reviewer',
    '- Reviewed at: 2026-09-15T01:05:00+09:00',
    '- Repository / PR: sectile/sectile / #200',
    `- Reviewed PR head SHA: ${head}`,
    `- Reviewed base SHA: ${SHA_A}`,
    `- Tested target SHA: ${head}`,
    '- Worktree/instrumentation: clean',
    '- Accepted issue-review / scope snapshot: https://github.com/sectile/sectile/issues/194#issuecomment-1',
    `- Template version / policy commit: v1 / ${policy}`,
    '',
    '### Review coverage and evidence',
    'Reviewed the accepted criteria and exact head.',
    '',
    '### Findings',
    'No blocking findings within the stated coverage.',
    '',
    '### Decision',
    `- Outcome: ${outcome}`,
    `- Current head/base recheck: ${head} / ${SHA_A}`,
    '- Remaining risks: None within the stated coverage',
    '- Required next action: maintainer merge decision',
  ].join('\n')
}

function verificationBody({
  source = SHA_C,
  policy = SHA_B,
  phase = 'Implementation close',
  conclusion = 'Fixed on source',
  artifact = 'N/A — source verification',
} = {}) {
  return [
    '## Verification — v1',
    '- Record ID / Work ID / Run ID: verify-194-v1 / sectile-issue-194 / verify-run-1',
    '- Verifier / role: verifier-bot / Verifier',
    '- Verified at: 2026-09-15T01:10:00+09:00',
    '- Repository / issue / PR: sectile/sectile / #194 / #200',
    `- Phase: ${phase}`,
    `- Source full SHA: ${source}`,
    `- Package / version / artifact digest or integrity: ${artifact}`,
    '- Environment / tool versions: Node 24 / pnpm',
    '- Source state: clean snapshot',
    '- Accepted criteria snapshot: https://github.com/sectile/sectile/issues/194#issuecomment-1',
    `- Template version / policy commit: v1 / ${policy}`,
    '',
    '| Unit / criterion | Command or procedure | Exact target | Outcome | Durable evidence |',
    '| --- | --- | --- | --- | --- |',
    `| AC-1 | node --test | ${source} | Passed | log |`,
    '',
    '- Untested areas / residual risk: None within selected scope',
    `- Conclusion: ${conclusion}`,
    '- Recommended next action: advance the verified workflow state',
  ].join('\n')
}

function transitionRequest({
  from = 'Issue Review',
  target = 'Ready',
  recordURL = 'https://github.com/sectile/sectile/issues/194#issuecomment-1',
  scopeRecordURL = 'https://github.com/sectile/sectile/issues/194#issuecomment-1',
  pr = null,
  headSHA = null,
  mergeSHA = null,
} = {}) {
  return {
    repository: 'sectile/sectile',
    issue: 194,
    from,
    target,
    recordURL,
    scopeRecordURL,
    sourceSHA: SHA_A,
    policySHA: SHA_B,
    operationID: 'transition-194-1',
    pr,
    headSHA,
    mergeSHA,
  }
}

test('Workflow schema and transition graph retain the canonical lifecycle', () => {
  assert.deepEqual(WORKFLOW_FIELD.options.map(option => option.name), [
    'Candidate', 'Issue Review', 'Ready', 'In Progress', 'Code Review', 'Awaiting Merge',
    'Verification', 'Awaiting Release', 'Done', 'Blocked', 'Rejected', 'Duplicate',
  ])
  assert.equal(transitionAllowed('Candidate', 'Issue Review'), true)
  assert.equal(transitionAllowed('Candidate', 'Ready'), false)
  assert.equal(transitionAllowed('Issue Review', 'Ready'), true)
  assert.equal(transitionAllowed('Ready', 'In Progress'), true)
  assert.equal(transitionAllowed('Blocked', 'Issue Review'), true)
  assert.throws(() => requireTransition('In Progress', 'Done'), /not allowed/u)
})

test('record parser requires the canonical heading and structured v1 fields', () => {
  const record = parseRecordBody(issueReviewBody())
  assert.equal(record.kind, 'Issue Review')
  assert.equal(record.fields.get('Record ID'), 'review-194-v1')
  assert.match(record.sections.get('Accepted scope snapshot'), /AC-1/u)
  assert.throws(
    () => parseRecordBody(`Example:\n## Issue Review — v1\n- Record ID: quoted`),
    /Unsupported or non-canonical record heading/u,
  )
  assert.throws(
    () => validateIssueReviewRecord(parseRecordBody('## Issue Review — v1\n- Record ID: x'), {
      repository: 'sectile/sectile', issue: 194, sourceSHA: SHA_A, policySHA: SHA_B,
    }),
    /missing field/u,
  )
})

test('Issue Review validation binds exact issue, source and policy SHAs', () => {
  const record = parseRecordBody(issueReviewBody())
  const validated = validateIssueReviewRecord(record, {
    repository: 'sectile/sectile',
    issue: 194,
    sourceSHA: SHA_A,
    policySHA: SHA_B,
    requireReady: true,
  })
  assert.equal(validated.outcome, 'Confirmed')
  assert.equal(validated.completionSurface, 'published')
  assert.throws(
    () => validateIssueReviewRecord(record, {
      repository: 'sectile/sectile', issue: 194, sourceSHA: SHA_C, policySHA: SHA_B,
    }),
    /source SHA does not match/u,
  )
})

test('Code Review and Verification records bind exact PR snapshots', () => {
  const review = validateCodeReviewRecord(parseRecordBody(codeReviewBody()), {
    repository: 'sectile/sectile', pr: 200, headSHA: SHA_C, policySHA: SHA_B,
  })
  assert.equal(review.outcome, 'Passed')
  assert.throws(
    () => validateCodeReviewRecord(parseRecordBody(codeReviewBody({ head: SHA_A })), {
      repository: 'sectile/sectile', pr: 200, headSHA: SHA_C, policySHA: SHA_B,
    }),
    /head SHA does not match/u,
  )

  const verification = validateVerificationRecord(parseRecordBody(verificationBody()), {
    repository: 'sectile/sectile', issue: 194, pr: 200,
    expectedSourceSHA: SHA_C, policySHA: SHA_B,
    allowedPhases: ['Implementation close'], allowedConclusions: ['Fixed on source'],
  })
  assert.equal(verification.conclusion, 'Fixed on source')
})

test('published completion cannot reach Done with source-only verification', () => {
  const scope = parseRecordBody(issueReviewBody())
  const request = transitionRequest({
    from: 'Awaiting Release', target: 'Done', pr: 200, headSHA: SHA_C, mergeSHA: SHA_C,
    recordURL: 'https://github.com/sectile/sectile/pull/200#issuecomment-2',
  })
  assert.throws(
    () => validateTransitionEvidence(
      parseRecordBody(verificationBody({
        source: SHA_C, phase: 'Post-merge', conclusion: 'Fixed on source',
      })),
      scope,
      request,
    ),
    /Verification phase is not allowed here/u,
  )
  assert.doesNotThrow(() => validateTransitionEvidence(
    parseRecordBody(verificationBody({
      source: SHA_C,
      phase: 'Published artifact',
      conclusion: 'Fixed and released',
      artifact: '@sectile/chart 0.15.5 / sha512-example',
    })),
    scope,
    request,
  ))
})

test('record URLs distinguish issue comments, PR comments and native reviews', () => {
  assert.equal(
    parseRecordURL('https://github.com/sectile/sectile/issues/194#issuecomment-1').surface,
    'issue-comment',
  )
  assert.equal(
    parseRecordURL('https://github.com/sectile/sectile/pull/200#issuecomment-2').surface,
    'pr-comment',
  )
  assert.equal(
    parseRecordURL('https://github.com/sectile/sectile/pull/200#pullrequestreview-3').surface,
    'pr-review',
  )
  assert.throws(() => parseRecordURL('https://example.com/anything'), /github.com HTTPS URL/u)
})

test('transition arguments require stable operation and PR identities for review phases', () => {
  const request = parseTransitionArgs([
    '--issue', '194', '--from', 'Issue Review', '--state', 'Ready',
    '--record', 'https://github.com/sectile/sectile/issues/194#issuecomment-1',
    '--source-sha', SHA_A, '--policy-sha', SHA_B, '--operation-id', 'transition-194-ready-1',
  ])
  assert.equal(request.issue, 194)
  assert.equal(request.scopeRecordURL, request.recordURL)
  assert.equal(request.apply, false)
  assert.throws(
    () => parseTransitionArgs([
      '--issue', '194', '--from', 'In Progress', '--state', 'Code Review',
      '--record', 'https://github.com/sectile/sectile/issues/194#issuecomment-2',
      '--scope-record', 'https://github.com/sectile/sectile/issues/194#issuecomment-1',
      '--source-sha', SHA_A, '--policy-sha', SHA_B, '--operation-id', 'transition-194-review-1',
    ]),
    /requires --pr and --head-sha/u,
  )
})

test('retry disposition reconciles an applied target without mutating twice', () => {
  const request = transitionRequest({ from: 'Ready', target: 'In Progress' })
  assert.equal(transitionDisposition('Ready', request), 'mutate-workflow')
  assert.equal(transitionDisposition('In Progress', request), 'recover-completion')
  const completion = {
    operationId: request.operationID,
    previous: request.from,
    current: request.target,
    evidence: request.recordURL,
    scopeReview: request.scopeRecordURL,
    sourceSHA: request.sourceSHA,
    policySHA: request.policySHA,
    pr: 'N/A',
    prHeadSHA: 'N/A',
  }
  assert.equal(transitionDisposition('In Progress', request, completion), 'already-complete')
  assert.throws(() => transitionDisposition('Blocked', request), /Workflow changed/u)
})

test('transition completion parser rejects incomplete operation records', () => {
  const completion = parseTransitionCompletion([
    '## Workflow Transition — v2',
    '- Operation ID: transition-194-ready-1',
    '- Actor: @jinyongp / Loki operator',
    '- Previous: Issue Review',
    '- Current: Ready',
    '- Evidence record: https://github.com/sectile/sectile/issues/194#issuecomment-1',
    '- Scope review: https://github.com/sectile/sectile/issues/194#issuecomment-1',
    `- Source SHA: ${SHA_A}`,
    `- Policy SHA: ${SHA_B}`,
    '- PR: N/A',
    '- PR head SHA: N/A',
  ].join('\n'))
  assert.equal(completion.operationId, 'transition-194-ready-1')
  assert.throws(
    () => parseTransitionCompletion('## Workflow Transition — v2\n- Operation ID: x'),
    /incomplete/u,
  )
})

test('GitHub CLI transport fails closed on malformed process and JSON results', async () => {
  const malformedProcess = createGitHubCLI(async () => ({ stdout: '{}'}))
  await assert.rejects(() => malformedProcess.json(['project', 'view', '1']), /invalid process result/u)

  const malformedJSON = createGitHubCLI(async () => ({ stdout: 'not-json', stderr: '' }))
  await assert.rejects(() => malformedJSON.json(['project', 'view', '1']), /invalid JSON/u)
})

test('pinned Project validation rejects title or field identity drift', () => {
  const project = {
    number: PINNED_PROJECT.number,
    id: PINNED_PROJECT.id,
    title: PINNED_PROJECT.title,
    public: true,
    closed: false,
    owner: { login: 'sectile', type: 'Organization' },
  }
  const repository = {
    projectsV2: {
      Nodes: [{
        id: PINNED_PROJECT.id,
        number: PINNED_PROJECT.number,
        title: PINNED_PROJECT.title,
        closed: false,
      }],
    },
  }
  const fields = {
    fields: [{
      id: PINNED_PROJECT.workflowField.id,
      name: PINNED_PROJECT.workflowField.name,
      type: PINNED_PROJECT.workflowField.type,
    }],
  }

  assert.doesNotThrow(() => validatePinnedResources({ project, repository, fields }))
  assert.throws(
    () => validatePinnedResources({ project: { ...project, title: 'Other' }, repository, fields }),
    /Pinned Project identity/u,
  )
  assert.throws(
    () => validatePinnedResources({
      project,
      repository,
      fields: { fields: [{ ...fields.fields[0], id: 'PVTSSF_other' }] },
    }),
    /Pinned Workflow Project field identity/u,
  )
})

test('Project membership and Workflow state produce preservation-first reconciliation', () => {
  const members = parseProjectItems({
    totalCount: 2,
    items: [
      {
        id: 'PVTI_one',
        content: {
          type: 'Issue', repository: 'sectile/sectile', number: 119,
          url: 'https://github.com/sectile/sectile/issues/119',
        },
      },
      {
        id: 'PVTI_two',
        content: {
          type: 'Issue', repository: 'sectile/sectile', number: 121,
          url: 'https://github.com/sectile/sectile/issues/121',
        },
      },
    ],
  })
  const issues = new Map(MAINTAINER_ENROLLED_ISSUES.map(number => [number, {
    number,
    present: members.has(number),
    workflow: null,
  }]))
  issues.set(119, { number: 119, present: true, workflow: 'Issue Review' })
  issues.set(124, { number: 124, present: false, workflow: 'Ready' })
  const plan = reconciliationPlan({ issues })

  assert.deepEqual(plan.find(entry => entry.issue === 119), {
    issue: 119,
    action: 'preserve',
    value: 'Issue Review',
  })
  assert.deepEqual(plan.find(entry => entry.issue === 121), {
    issue: 121,
    action: 'initialize-workflow',
    value: 'Candidate',
  })
  assert.deepEqual(plan.find(entry => entry.issue === 124), {
    issue: 124,
    action: 'add-project-item',
    workflow: 'preserve-existing',
    value: 'Ready',
  })
})

test('Workflow search reads issue-level values independently of Project membership', async () => {
  const cli = {
    json: async args => {
      const search = args[args.indexOf('--search') + 1]
      if (search === 'field.workflow:Candidate') return [{ number: 119 }]
      if (search === 'field.workflow:"Issue Review"') return [{ number: 121 }]
      if (search === 'no:field.workflow') return [{ number: 124 }]
      return []
    },
  }
  const values = await readWorkflowValues(cli)
  assert.equal(values.get(119), 'Candidate')
  assert.equal(values.get(121), 'Issue Review')
  assert.equal(values.get(124), null)
})

test('Project membership parser rejects incomplete and duplicate issue lists', () => {
  assert.throws(
    () => parseProjectItems({ totalCount: 2, items: [] }),
    /Project item list is incomplete/u,
  )
  const item = {
    id: 'PVTI_one',
    content: {
      type: 'Issue', repository: 'sectile/sectile', number: 119,
      url: 'https://github.com/sectile/sectile/issues/119',
    },
  }
  assert.throws(
    () => parseProjectItems({ totalCount: 2, items: [item, { ...item, id: 'PVTI_two' }] }),
    /duplicate item/u,
  )
})
