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

export function normalizeIssueField(field) {
  return {
    name: field?.name,
    description: field?.description ?? '',
    data_type: field?.data_type,
    visibility: field?.visibility ?? null,
    options: Array.isArray(field?.options)
      ? field.options.map(option => ({
          id: option.id,
          name: option.name,
          description: option.description ?? '',
          color: option.color,
          priority: option.priority,
        }))
      : [],
  }
}

export function compareWorkflowField(actual) {
  const field = normalizeIssueField(actual)
  const errors = []
  if (field.name !== WORKFLOW_FIELD.name) errors.push(`name=${field.name ?? 'missing'}`)
  if (field.data_type !== WORKFLOW_FIELD.data_type) {
    errors.push(`data_type=${field.data_type ?? 'missing'}`)
  }
  if (field.visibility !== null && field.visibility !== WORKFLOW_FIELD.visibility) {
    errors.push(`visibility=${field.visibility}`)
  }

  const actualNames = field.options.map(option => option.name)
  const expectedNames = WORKFLOW_FIELD.options.map(option => option.name)
  if (actualNames.length !== expectedNames.length ||
      actualNames.some((name, index) => name !== expectedNames[index])) {
    errors.push(`options=${JSON.stringify(actualNames)}`)
  }
  return errors
}

export function workflowFieldCreateBody() {
  return {
    name: WORKFLOW_FIELD.name,
    description: WORKFLOW_FIELD.description,
    data_type: WORKFLOW_FIELD.data_type,
    visibility: WORKFLOW_FIELD.visibility,
    options: WORKFLOW_FIELD.options.map(option => ({ ...option })),
  }
}

export function issueFieldPatch(fieldId, value) {
  const numericId = Number(fieldId)
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    throw new Error('Issue field ID must be a positive integer')
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Issue field value must be a non-empty string')
  }
  return { issue_field_values: [{ field_id: numericId, value }] }
}

export function parseWorkflowRequest(body) {
  if (typeof body !== 'string') return null
  const lines = body.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
  if (lines[0] !== '/sectile-workflow') return null

  const fields = new Map()
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(':')
    if (separator <= 0) throw new Error(`Malformed workflow request line: ${line}`)
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (!value) throw new Error(`Workflow request value is empty: ${key}`)
    if (fields.has(key)) throw new Error(`Duplicate workflow request field: ${key}`)
    fields.set(key, value)
  }

  const allowed = new Set(['state', 'record', 'source-sha', 'policy-sha', 'pr', 'head-sha'])
  for (const key of fields.keys()) {
    if (!allowed.has(key)) throw new Error(`Unknown workflow request field: ${key}`)
  }

  const state = assertWorkflowState(fields.get('state'))
  const request = {
    state,
    record: fields.get('record') ?? null,
    sourceSHA: fields.get('source-sha') ?? null,
    policySHA: fields.get('policy-sha') ?? null,
    pr: fields.has('pr') ? Number(fields.get('pr')) : null,
    headSHA: fields.get('head-sha') ?? null,
  }

  if (request.sourceSHA !== null) assertFullSHA(request.sourceSHA, 'source-sha')
  if (request.policySHA !== null) assertFullSHA(request.policySHA, 'policy-sha')
  if (request.headSHA !== null) assertFullSHA(request.headSHA, 'head-sha')
  if (request.pr !== null && (!Number.isSafeInteger(request.pr) || request.pr <= 0)) {
    throw new Error('pr must be a positive integer')
  }
  if (request.record !== null) {
    let url
    try {
      url = new URL(request.record)
    } catch {
      throw new Error('record must be an absolute URL')
    }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
      throw new Error('record must be a github.com HTTPS URL')
    }
  }
  return request
}

export function validateRequestShape(request) {
  const errors = []
  const requireRecord = !['Candidate'].includes(request.state)
  if (requireRecord && request.record === null) errors.push('record is required')

  if (['Ready', 'In Progress', 'Code Review', 'Awaiting Merge', 'Verification',
    'Awaiting Release', 'Done'].includes(request.state)) {
    if (request.sourceSHA === null) errors.push('source-sha is required')
    if (request.policySHA === null) errors.push('policy-sha is required')
  }

  if (['Code Review', 'Awaiting Merge', 'Verification'].includes(request.state)) {
    if (request.pr === null) errors.push('pr is required')
    if (request.headSHA === null) errors.push('head-sha is required')
  }
  return errors
}

export function recordURLBelongsToIssue(recordURL, owner, repo, issueNumber) {
  if (typeof recordURL !== 'string') return false
  try {
    const url = new URL(recordURL)
    return url.protocol === 'https:' && url.hostname === 'github.com' &&
      url.pathname === `/${owner}/${repo}/issues/${issueNumber}` &&
      /^#issuecomment-\d+$/u.test(url.hash)
  } catch {
    return false
  }
}

export function commentIdFromRecordURL(recordURL) {
  const match = /#issuecomment-(\d+)$/u.exec(new URL(recordURL).hash)
  if (!match) throw new Error('Record URL does not identify an issue comment')
  return Number(match[1])
}

export function recordSupportsTarget(recordBody, request) {
  if (typeof recordBody !== 'string') return false
  if (request.sourceSHA !== null && !recordBody.includes(request.sourceSHA)) return false
  if (request.policySHA !== null && !recordBody.includes(request.policySHA)) return false
  if (request.headSHA !== null && !recordBody.includes(request.headSHA)) return false

  switch (request.state) {
    case 'Issue Review':
      return recordBody.includes('Issue Review')
    case 'Ready':
      return recordBody.includes('Issue Review') &&
        (recordBody.includes('Implementation readiness: Ready') ||
         recordBody.includes('Technical qualification: **Passed**'))
    case 'In Progress':
      return recordBody.includes('Checkpoint') || recordBody.includes('claim')
    case 'Code Review':
      return recordBody.includes('Checkpoint') && recordBody.includes('Ready')
    case 'Awaiting Merge':
      return recordBody.includes('Code Review') &&
        (recordBody.includes('Outcome: Passed') || recordBody.includes('recommendation: Passed'))
    case 'Verification':
      return recordBody.includes('Verification') || recordBody.includes('merged')
    case 'Awaiting Release':
      return recordBody.includes('Verification') &&
        (recordBody.includes('Awaiting release') || recordBody.includes('Fixed on source'))
    case 'Done':
      return recordBody.includes('Verification') && recordBody.includes('Fixed and released')
    case 'Blocked':
      return recordBody.includes('Blocked') || recordBody.includes('blocker')
    case 'Rejected':
      return recordBody.includes('Rejected')
    case 'Duplicate':
      return recordBody.includes('Duplicate')
    case 'Candidate':
      return true
    default:
      return false
  }
}

export function workflowValue(values, fieldId) {
  const entry = (values ?? []).find(value => Number(value.issue_field_id) === Number(fieldId))
  if (!entry) return null
  return entry.single_select_option?.name ?? entry.value ?? null
}

export function assertMaintainerPermission({ permission, roleName } = {}) {
  const allowed = permission === 'admin' || roleName === 'admin' || roleName === 'maintain'
  if (!allowed) {
    throw new Error(
      `Workflow mutation requires admin/maintain role; observed permission=${permission ?? 'none'}, role=${roleName ?? 'none'}`,
    )
  }
}
