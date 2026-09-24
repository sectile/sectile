const SHA_PATTERN = /^[0-9a-f]{40}$/u

export const WORKFLOW_STATES = Object.freeze([
  'Candidate',
  'Issue Review',
  'Ready',
  'In Progress',
  'Code Review',
  'Awaiting Merge',
  'Verification',
  'Awaiting Release',
  'Done',
  'Blocked',
  'Rejected',
  'Duplicate',
])

export const WORKFLOW_FIELD = Object.freeze({
  name: 'Workflow',
  description: 'Canonical Sectile engineering work-item lifecycle state.',
  data_type: 'single_select',
  visibility: 'all',
  options: Object.freeze([
    { name: 'Candidate', color: 'gray', priority: 1 },
    { name: 'Issue Review', color: 'blue', priority: 2 },
    { name: 'Ready', color: 'green', priority: 3 },
    { name: 'In Progress', color: 'yellow', priority: 4 },
    { name: 'Code Review', color: 'purple', priority: 5 },
    { name: 'Awaiting Merge', color: 'orange', priority: 6 },
    { name: 'Verification', color: 'blue', priority: 7 },
    { name: 'Awaiting Release', color: 'pink', priority: 8 },
    { name: 'Done', color: 'green', priority: 9 },
    { name: 'Blocked', color: 'red', priority: 10 },
    { name: 'Rejected', color: 'gray', priority: 11 },
    { name: 'Duplicate', color: 'gray', priority: 12 },
  ]),
})

export const MAINTAINER_ENROLLED_ISSUES = Object.freeze([
  119, 121, 124, 126, 128, 129, 131, 136, 137, 140, 170, 171, 173, 174,
  175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188,
  189, 190, 191, 192, 193, 194,
])

const TRANSITIONS = Object.freeze({
  Candidate: new Set(['Issue Review', 'Rejected', 'Duplicate']),
  'Issue Review': new Set(['Ready', 'Blocked', 'Rejected', 'Duplicate']),
  Ready: new Set(['In Progress', 'Blocked', 'Issue Review']),
  'In Progress': new Set(['Code Review', 'Blocked', 'Issue Review']),
  'Code Review': new Set(['Awaiting Merge', 'In Progress', 'Blocked']),
  'Awaiting Merge': new Set(['Code Review', 'Verification', 'Blocked']),
  Verification: new Set(['Awaiting Release', 'Done', 'Blocked']),
  'Awaiting Release': new Set(['Verification', 'Done', 'Blocked']),
  Blocked: new Set(['Issue Review']),
  Done: new Set(),
  Rejected: new Set(),
  Duplicate: new Set(),
})

export function assertWorkflowState(value) {
  if (!WORKFLOW_STATES.includes(value)) {
    throw new Error(`Unknown Workflow state: ${value}`)
  }
  return value
}

export function transitionAllowed(current, target) {
  assertWorkflowState(current)
  assertWorkflowState(target)
  return TRANSITIONS[current].has(target)
}

export function requireTransition(current, target) {
  if (!transitionAllowed(current, target)) {
    throw new Error(`Workflow transition is not allowed: ${current} -> ${target}`)
  }
}

export function assertFullSHA(value, label = 'SHA') {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) {
    throw new Error(`${label} must be a full 40-character lowercase Git SHA`)
  }
  return value
}

const RECORD_HEADINGS = Object.freeze({
  '## Issue Review — v1': 'Issue Review',
  '## Code Review — v1': 'Code Review',
  '## Verification — v1': 'Verification',
  '## Checkpoint — v1': 'Checkpoint',
})

const RECORD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}$/u
const OPERATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u

function cleanScalar(value) {
  let result = String(value ?? '').trim()
  if (result.startsWith('`') && result.endsWith('`') && result.length >= 2) {
    result = result.slice(1, -1).trim()
  }
  if (result.startsWith('**') && result.endsWith('**') && result.length >= 4) {
    result = result.slice(2, -2).trim()
  }
  return result
}

function parseFields(lines) {
  const fields = new Map()
  for (const line of lines) {
    const match = /^-\s+([^:]+):\s*(.*)$/u.exec(line.trim())
    if (!match) continue
    const label = match[1].trim()
    const value = cleanScalar(match[2])
    if (fields.has(label)) throw new Error(`Duplicate record field: ${label}`)
    fields.set(label, value)
  }
  return fields
}

function parseSections(lines) {
  const sections = new Map()
  let current = null
  let content = []
  const flush = () => {
    if (current === null) return
    if (sections.has(current)) throw new Error(`Duplicate record section: ${current}`)
    sections.set(current, content.join('\n').trim())
  }
  for (const line of lines) {
    const match = /^###\s+(.+)$/u.exec(line.trim())
    if (match) {
      flush()
      current = match[1].trim()
      content = []
    } else if (current !== null) {
      content.push(line)
    }
  }
  flush()
  return sections
}

function requiredField(record, name) {
  if (!record.fields.has(name)) throw new Error(`${record.kind} record is missing field: ${name}`)
  const value = record.fields.get(name)
  if (!value) throw new Error(`${record.kind} record field is empty: ${name}`)
  return value
}

function requiredSection(record, name) {
  const value = record.sections.get(name)
  if (!value) throw new Error(`${record.kind} record is missing section content: ${name}`)
  return value
}

function splitField(record, name, count) {
  const value = requiredField(record, name)
  const parts = value.split(/\s+\/\s+/u).map(cleanScalar)
  if (parts.length !== count || parts.some(part => part.length === 0)) {
    throw new Error(`${record.kind} record field ${name} must contain ${count} slash-separated values`)
  }
  return parts
}

function concreteIdentifier(value, label) {
  const cleaned = cleanScalar(value)
  if (!RECORD_ID_PATTERN.test(cleaned) || /^(?:Pending|Unknown|N\/A)$/iu.test(cleaned)) {
    throw new Error(`${label} must be a concrete stable identifier`)
  }
  return cleaned
}

function issueReference(value, label) {
  const match = /^#(\d+)$/u.exec(cleanScalar(value))
  const number = match ? Number(match[1]) : NaN
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${label} must be an issue reference`)
  return number
}

function completionSurface(value) {
  const cleaned = cleanScalar(value)
  if (/^Source-only\b/iu.test(cleaned)) return 'source'
  if (/^Published artifact\b/iu.test(cleaned)) return 'published'
  throw new Error(`Unknown completion surface: ${cleaned}`)
}

export function assertOperationID(value) {
  if (typeof value !== 'string' || !OPERATION_ID_PATTERN.test(value)) {
    throw new Error('operation-id must be a stable 1-128 character identifier')
  }
  return value
}

export function parseRecordBody(body) {
  if (typeof body !== 'string' || body.trim().length === 0) throw new Error('Record body is empty')
  const lines = body.split(/\r?\n/u)
  const heading = lines.find(line => line.trim().length > 0)?.trim()
  const kind = RECORD_HEADINGS[heading]
  if (!kind) throw new Error(`Unsupported or non-canonical record heading: ${heading ?? 'missing'}`)
  return Object.freeze({
    kind,
    heading,
    body,
    fields: parseFields(lines),
    sections: parseSections(lines),
  })
}

export function parseRecordURL(recordURL) {
  let url
  try {
    url = new URL(recordURL)
  } catch {
    throw new Error('record must be an absolute URL')
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
    throw new Error('record must be a github.com HTTPS URL')
  }
  const path = /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)$/u.exec(url.pathname)
  if (!path) throw new Error('record URL must identify a GitHub issue or pull request')
  const number = Number(path[4])
  const issueComment = /^#issuecomment-(\d+)$/u.exec(url.hash)
  const review = /^#pullrequestreview-(\d+)$/u.exec(url.hash)
  if (path[3] === 'issues' && issueComment) {
    return Object.freeze({
      owner: path[1], repo: path[2], surface: 'issue-comment', number,
      databaseId: Number(issueComment[1]), url: url.href,
    })
  }
  if (path[3] === 'pull' && issueComment) {
    return Object.freeze({
      owner: path[1], repo: path[2], surface: 'pr-comment', number,
      databaseId: Number(issueComment[1]), url: url.href,
    })
  }
  if (path[3] === 'pull' && review) {
    return Object.freeze({
      owner: path[1], repo: path[2], surface: 'pr-review', number,
      databaseId: Number(review[1]), url: url.href,
    })
  }
  throw new Error('record URL must identify an issue comment, PR comment, or PR review')
}

export function parseTransitionCompletion(body) {
  if (typeof body !== 'string') return null
  const lines = body.split(/\r?\n/u)
  const heading = lines.find(line => line.trim().length > 0)?.trim()
  if (heading !== '## Workflow Transition — v2') return null
  const fields = parseFields(lines)
  const operationId = fields.get('Operation ID')
  const previous = fields.get('Previous')
  const current = fields.get('Current')
  if (!operationId || !previous || !current) throw new Error('Workflow Transition — v2 record is incomplete')
  assertOperationID(operationId)
  assertWorkflowState(previous)
  assertWorkflowState(current)
  return Object.freeze({
    operationId,
    actor: fields.get('Actor') ?? null,
    previous,
    current,
    evidence: fields.get('Evidence record') ?? null,
    scopeReview: fields.get('Scope review') ?? null,
    sourceSHA: fields.get('Source SHA') ?? null,
    policySHA: fields.get('Policy SHA') ?? null,
    defaultSHA: fields.get('Current default HEAD at transition') ?? null,
    pr: fields.get('PR') ?? null,
    prHeadSHA: fields.get('PR head SHA') ?? null,
    mergedSourceSHA: fields.get('Merged source SHA') ?? null,
    recovery: fields.get('Recovery') ?? null,
  })
}

export function recordIdentity(record) {
  let recordId
  let workId
  let runId
  if (record.kind === 'Issue Review') {
    recordId = concreteIdentifier(requiredField(record, 'Record ID'), 'Record ID')
    ;[workId, runId] = splitField(record, 'Work ID / Run ID', 2)
  } else {
    ;[recordId, workId, runId] = splitField(record, 'Record ID / Work ID / Run ID', 3)
  }
  return Object.freeze({
    recordId: concreteIdentifier(recordId, 'Record ID'),
    workId: concreteIdentifier(workId, 'Work ID'),
    runId: concreteIdentifier(runId, 'Run ID'),
  })
}

function recordActor(record) {
  const label = record.kind === 'Issue Review'
    ? 'Reviewer / role'
    : record.kind === 'Code Review'
      ? 'Reviewer / role'
      : record.kind === 'Verification'
        ? 'Verifier / role'
        : 'Actor / role'
  const [actor, role] = splitField(record, label, 2)
  if (!actor || /^(?:Pending|Unknown|N\/A)$/iu.test(actor)) {
    throw new Error(`${record.kind} record actor must be concrete`)
  }
  return Object.freeze({ actor, role })
}

function policySHA(record) {
  const [, sha] = splitField(record, 'Template version / policy commit', 2)
  return assertFullSHA(sha, 'record policy SHA')
}

export function validateIssueReviewRecord(record, {
  repository,
  issue,
  sourceSHA,
  policySHA: expectedPolicySHA,
  requireReady = false,
} = {}) {
  if (record.kind !== 'Issue Review') throw new Error('Expected an Issue Review — v1 record')
  const identity = recordIdentity(record)
  const actor = recordActor(record)
  if (actor.role !== 'Issue Reviewer') throw new Error(`Issue Review role must be Issue Reviewer; observed ${actor.role}`)
  const [recordRepository, issueRef] = splitField(record, 'Repository / issue', 2)
  if (recordRepository !== repository || issueReference(issueRef, 'Issue Review issue') !== issue) {
    throw new Error('Issue Review repository or issue does not match the transition target')
  }
  const [, reviewedSHA] = splitField(record, 'Reviewed source ref / full SHA', 2)
  if (assertFullSHA(reviewedSHA, 'Issue Review source SHA') !== sourceSHA) {
    throw new Error('Issue Review source SHA does not match source-sha')
  }
  if (policySHA(record) !== expectedPolicySHA) throw new Error('Issue Review policy SHA does not match policy-sha')
  requiredSection(record, 'Accepted scope snapshot')
  requiredSection(record, 'Evidence and findings')
  requiredSection(record, 'Decision and handoff')
  const outcome = requiredField(record, 'Finding outcome')
  const readiness = requiredField(record, 'Implementation readiness')
  const surface = completionSurface(requiredField(record, 'Completion surface'))
  if (requireReady && (outcome !== 'Confirmed' || !/^Ready\b/u.test(readiness))) {
    throw new Error(`Issue Review does not authorize Ready: outcome=${outcome}, readiness=${readiness}`)
  }
  return Object.freeze({ identity, actor, outcome, readiness, completionSurface: surface })
}

export function validateCheckpointRecord(record, {
  repository,
  issue,
  sourceSHA,
  policySHA: expectedPolicySHA,
  requireBlocker = false,
} = {}) {
  if (record.kind !== 'Checkpoint') throw new Error('Expected a Checkpoint — v1 record')
  const identity = recordIdentity(record)
  const actor = recordActor(record)
  const [recordRepository, issueRef] = splitField(record, 'Repository / issue / PR / branch', 4)
  if (recordRepository !== repository || issueReference(issueRef, 'Checkpoint issue') !== issue) {
    throw new Error('Checkpoint repository or issue does not match the transition target')
  }
  if (assertFullSHA(requiredField(record, 'Inspected source SHA'), 'Checkpoint source SHA') !== sourceSHA) {
    throw new Error('Checkpoint source SHA does not match source-sha')
  }
  if (policySHA(record) !== expectedPolicySHA) throw new Error('Checkpoint policy SHA does not match policy-sha')
  requiredSection(record, 'Durable state')
  requiredSection(record, 'Progress and recovery')
  if (requireBlocker) {
    const blockers = requiredField(record, 'Dependencies / blockers')
    if (/^(?:None|N\/A)(?:\b|\s|$)/iu.test(blockers)) throw new Error('Blocked transition requires a concrete blocker')
  }
  return Object.freeze({ identity, actor })
}

export function validateCodeReviewRecord(record, {
  repository,
  pr,
  headSHA,
  policySHA: expectedPolicySHA,
  requirePassed = true,
} = {}) {
  if (record.kind !== 'Code Review') throw new Error('Expected a Code Review — v1 record')
  const identity = recordIdentity(record)
  const actor = recordActor(record)
  if (actor.role !== 'Code Reviewer') throw new Error(`Code Review role must be Code Reviewer; observed ${actor.role}`)
  const [recordRepository, prRef] = splitField(record, 'Repository / PR', 2)
  if (recordRepository !== repository || issueReference(prRef, 'Code Review PR') !== pr) {
    throw new Error('Code Review repository or PR does not match the transition target')
  }
  if (assertFullSHA(requiredField(record, 'Reviewed PR head SHA'), 'Code Review head SHA') !== headSHA) {
    throw new Error('Code Review head SHA does not match head-sha')
  }
  assertFullSHA(requiredField(record, 'Reviewed base SHA'), 'Code Review base SHA')
  if (policySHA(record) !== expectedPolicySHA) throw new Error('Code Review policy SHA does not match policy-sha')
  const scope = requiredField(record, 'Accepted issue-review / scope snapshot')
  if (/^(?:Pending|Unknown|N\/A)$/iu.test(scope)) throw new Error('Code Review requires an accepted scope snapshot')
  requiredSection(record, 'Review coverage and evidence')
  requiredSection(record, 'Findings')
  requiredSection(record, 'Decision')
  const outcome = requiredField(record, 'Outcome')
  if (requirePassed && outcome !== 'Passed') throw new Error(`Code Review outcome is not Passed: ${outcome}`)
  return Object.freeze({ identity, actor, outcome })
}

export function validateVerificationRecord(record, {
  repository,
  issue,
  pr,
  expectedSourceSHA,
  policySHA: expectedPolicySHA,
  allowedPhases,
  allowedConclusions,
  requireArtifact = false,
} = {}) {
  if (record.kind !== 'Verification') throw new Error('Expected a Verification — v1 record')
  const identity = recordIdentity(record)
  const actor = recordActor(record)
  if (actor.role !== 'Verifier') throw new Error(`Verification role must be Verifier; observed ${actor.role}`)
  const refs = splitField(record, 'Repository / issue / PR', 3)
  if (refs[0] !== repository || issueReference(refs[1], 'Verification issue') !== issue ||
      (pr !== null && issueReference(refs[2], 'Verification PR') !== pr)) {
    throw new Error('Verification repository, issue, or PR does not match the transition target')
  }
  const source = assertFullSHA(requiredField(record, 'Source full SHA'), 'Verification source SHA')
  if (expectedSourceSHA !== null && source !== expectedSourceSHA) {
    throw new Error('Verification source SHA does not match the expected source snapshot')
  }
  if (policySHA(record) !== expectedPolicySHA) throw new Error('Verification policy SHA does not match policy-sha')
  const criteria = requiredField(record, 'Accepted criteria snapshot')
  if (/^(?:Pending|Unknown|N\/A)$/iu.test(criteria)) throw new Error('Verification requires an accepted criteria snapshot')
  const phase = requiredField(record, 'Phase')
  const conclusion = requiredField(record, 'Conclusion')
  if (allowedPhases && !allowedPhases.includes(phase)) throw new Error(`Verification phase is not allowed here: ${phase}`)
  if (allowedConclusions && !allowedConclusions.includes(conclusion)) {
    throw new Error(`Verification conclusion is not allowed here: ${conclusion}`)
  }
  if (requireArtifact) {
    const artifact = requiredField(record, 'Package / version / artifact digest or integrity')
    if (/^(?:N\/A|Unknown|Pending)(?:\b|\s|$)/iu.test(artifact)) {
      throw new Error('Released completion requires an exact published artifact identity')
    }
  }
  return Object.freeze({ identity, actor, phase, conclusion, sourceSHA: source })
}

export function validateTransitionEvidence(record, scopeReview, request) {
  const common = {
    repository: request.repository,
    issue: request.issue,
    sourceSHA: request.sourceSHA,
    policySHA: request.policySHA,
  }
  const scope = validateIssueReviewRecord(scopeReview, {
    ...common,
    requireReady: !['Issue Review', 'Rejected', 'Duplicate'].includes(request.target),
  })

  switch (request.target) {
    case 'Issue Review':
      validateIssueReviewRecord(record, common)
      break
    case 'Ready':
      validateIssueReviewRecord(record, { ...common, requireReady: true })
      break
    case 'In Progress':
      validateCheckpointRecord(record, common)
      break
    case 'Code Review':
      validateVerificationRecord(record, {
        repository: request.repository,
        issue: request.issue,
        pr: request.pr,
        expectedSourceSHA: request.headSHA,
        policySHA: request.policySHA,
        allowedPhases: ['Implementation close'],
        allowedConclusions: ['Fixed on source'],
      })
      break
    case 'Awaiting Merge':
      validateCodeReviewRecord(record, {
        repository: request.repository,
        pr: request.pr,
        headSHA: request.headSHA,
        policySHA: request.policySHA,
      })
      break
    case 'Verification':
      if (request.from === 'Awaiting Merge') {
        validateCodeReviewRecord(record, {
          repository: request.repository,
          pr: request.pr,
          headSHA: request.headSHA,
          policySHA: request.policySHA,
        })
      } else {
        validateVerificationRecord(record, {
          repository: request.repository,
          issue: request.issue,
          pr: request.pr,
          expectedSourceSHA: request.mergeSHA,
          policySHA: request.policySHA,
          allowedPhases: ['Post-merge', 'Published artifact'],
          allowedConclusions: ['Not fixed', 'Incomplete'],
        })
      }
      break
    case 'Awaiting Release':
      if (scope.completionSurface !== 'published') {
        throw new Error('Awaiting Release is valid only for a published-artifact completion surface')
      }
      validateVerificationRecord(record, {
        repository: request.repository,
        issue: request.issue,
        pr: request.pr,
        expectedSourceSHA: request.mergeSHA,
        policySHA: request.policySHA,
        allowedPhases: ['Post-merge'],
        allowedConclusions: ['Fixed on source', 'Awaiting release'],
      })
      break
    case 'Done':
      validateVerificationRecord(record, {
        repository: request.repository,
        issue: request.issue,
        pr: request.pr,
        expectedSourceSHA: request.mergeSHA,
        policySHA: request.policySHA,
        allowedPhases: scope.completionSurface === 'published'
          ? ['Published artifact']
          : ['Post-merge', 'Implementation close'],
        allowedConclusions: scope.completionSurface === 'published'
          ? ['Fixed and released']
          : ['Fixed on source'],
        requireArtifact: scope.completionSurface === 'published',
      })
      break
    case 'Blocked':
      validateCheckpointRecord(record, { ...common, requireBlocker: true })
      break
    case 'Rejected': {
      const review = validateIssueReviewRecord(record, common)
      if (review.outcome !== 'Rejected') throw new Error(`Rejected transition requires Finding outcome: Rejected; observed ${review.outcome}`)
      break
    }
    case 'Duplicate': {
      const review = validateIssueReviewRecord(record, common)
      if (review.outcome !== 'Duplicate') throw new Error(`Duplicate transition requires Finding outcome: Duplicate; observed ${review.outcome}`)
      break
    }
    default:
      throw new Error(`No evidence rule for Workflow target: ${request.target}`)
  }
  return scope
}
