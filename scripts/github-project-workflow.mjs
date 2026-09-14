import process from 'node:process'
import { pathToFileURL } from 'node:url'

import {
  createGitCLI,
  createGitHubCLI,
  requireArray,
  requireInteger,
  requireObject,
  requireString,
} from './lib/github-cli.mjs'
import {
  MAINTAINER_ENROLLED_ISSUES,
  WORKFLOW_STATES,
  assertFullSHA,
  assertOperationID,
  assertWorkflowState,
  parseRecordBody,
  parseRecordURL,
  parseTransitionCompletion,
  recordIdentity,
  requireTransition,
  validateTransitionEvidence,
} from './lib/github-project-workflow.mjs'

export const PINNED_PROJECT = Object.freeze({
  owner: 'sectile',
  repository: 'sectile/sectile',
  number: 1,
  id: 'PVT_kwDOEv2i-c4Bjedw',
  title: 'Sectile Engineering',
  workflowField: Object.freeze({
    name: 'Workflow',
    id: 'PVTSSF_lADOEv2i-c4BjedwzhiSuVI',
    type: 'ProjectV2SingleSelectField',
  }),
})

function issueURL(issueNumber) {
  return `https://github.com/${PINNED_PROJECT.repository}/issues/${issueNumber}`
}

function projectNodes(repository) {
  const projects = requireObject(repository.projectsV2, 'repository.projectsV2')
  return requireArray(projects.nodes ?? projects.Nodes, 'repository.projectsV2.nodes')
}

export function parseProjectItems(payload) {
  const root = requireObject(payload, 'Project item-list response')
  const items = requireArray(root.items, 'Project item-list response.items')
  const totalCount = requireInteger(root.totalCount, 'Project item-list response.totalCount')
  if (totalCount !== items.length) {
    throw new Error(`Project item list is incomplete: received ${items.length} of ${totalCount}`)
  }

  const issues = new Map()
  for (const rawItem of items) {
    const item = requireObject(rawItem, 'Project item')
    const content = item.content
    if (!content || typeof content !== 'object' || Array.isArray(content)) continue
    if (content.type !== 'Issue' || content.repository !== PINNED_PROJECT.repository) continue
    const number = requireInteger(content.number, 'Project issue number')
    if (issues.has(number)) throw new Error(`Project contains duplicate item for issue #${number}`)
    issues.set(number, Object.freeze({
      number,
      itemId: requireString(item.id, `Project item #${number} id`),
      url: requireString(content.url, `Project issue #${number} URL`),
    }))
  }
  return issues
}

function workflowSearchQuery(state) {
  if (state === null) return 'no:field.workflow'
  return state.includes(' ') ? `field.workflow:"${state}"` : `field.workflow:${state}`
}

export async function readWorkflowValues(cli) {
  const states = [...WORKFLOW_STATES, null]
  const results = await Promise.all(states.map(async state => {
    const payload = await cli.json([
      'issue', 'list', '-R', PINNED_PROJECT.repository, '--state', 'all',
      '--search', workflowSearchQuery(state), '--limit', '1000', '--json', 'number',
    ])
    return { state, rows: requireArray(payload, `Issue search for ${state ?? 'unset'} Workflow`) }
  }))

  const values = new Map()
  for (const { state, rows } of results) {
    for (const row of rows) {
      const issue = requireObject(row, 'Issue search result')
      const number = requireInteger(issue.number, 'Issue search result number')
      if (values.has(number)) {
        throw new Error(`Issue #${number} matched multiple Workflow searches`)
      }
      values.set(number, state)
    }
  }
  return values
}

export function validatePinnedResources({ project, repository, fields }) {
  const projectInfo = requireObject(project, 'Project')
  if (projectInfo.number !== PINNED_PROJECT.number || projectInfo.id !== PINNED_PROJECT.id ||
      projectInfo.title !== PINNED_PROJECT.title || projectInfo.public !== true ||
      projectInfo.closed !== false || projectInfo.owner?.login !== PINNED_PROJECT.owner ||
      projectInfo.owner?.type !== 'Organization') {
    throw new Error('Pinned Project identity or visibility does not match live Project #1')
  }

  const linked = projectNodes(requireObject(repository, 'Repository'))
  if (!linked.some(candidate => candidate?.id === PINNED_PROJECT.id &&
      candidate?.number === PINNED_PROJECT.number && candidate?.title === PINNED_PROJECT.title &&
      candidate?.closed === false)) {
    throw new Error(`Repository ${PINNED_PROJECT.repository} is not linked to the pinned Project`)
  }

  const fieldRoot = requireObject(fields, 'Project field-list response')
  const fieldList = requireArray(fieldRoot.fields, 'Project field-list response.fields')
  const named = fieldList.filter(field => field?.name === PINNED_PROJECT.workflowField.name)
  if (named.length !== 1) throw new Error(`Expected exactly one Project Workflow field; observed ${named.length}`)
  const field = named[0]
  if (field.id !== PINNED_PROJECT.workflowField.id || field.type !== PINNED_PROJECT.workflowField.type) {
    throw new Error('Pinned Workflow Project field identity or type does not match live state')
  }

  return Object.freeze({ project: projectInfo, workflowField: field })
}

export async function inspectLive(cli = createGitHubCLI()) {
  await cli.text(['auth', 'status', '-h', 'github.com'])
  const [project, repository, fields, itemPayload, workflowValues] = await Promise.all([
    cli.json(['project', 'view', String(PINNED_PROJECT.number), '--owner', PINNED_PROJECT.owner, '--format', 'json']),
    cli.json(['repo', 'view', PINNED_PROJECT.repository, '--json', 'projectsV2']),
    cli.json(['project', 'field-list', String(PINNED_PROJECT.number), '--owner', PINNED_PROJECT.owner, '--format', 'json']),
    cli.json([
      'project', 'item-list', String(PINNED_PROJECT.number), '--owner', PINNED_PROJECT.owner,
      '--limit', '100', '--format', 'json',
    ]),
    readWorkflowValues(cli),
  ])
  validatePinnedResources({ project, repository, fields })
  const projectIssues = parseProjectItems(itemPayload)
  const issues = new Map()
  for (const number of MAINTAINER_ENROLLED_ISSUES) {
    if (!workflowValues.has(number)) {
      throw new Error(`Issue #${number} was not returned by any Workflow field search`)
    }
    const item = projectIssues.get(number)
    issues.set(number, Object.freeze({
      number,
      present: item !== undefined,
      itemId: item?.itemId ?? null,
      url: item?.url ?? issueURL(number),
      workflow: workflowValues.get(number),
    }))
  }

  return Object.freeze({
    project: Object.freeze({
      number: project.number,
      id: project.id,
      title: project.title,
      public: project.public,
      url: project.url,
    }),
    workflowField: PINNED_PROJECT.workflowField,
    issues,
  })
}

export function reconciliationPlan(state) {
  const issues = state?.issues
  if (!(issues instanceof Map)) throw new Error('Reconciliation state must contain an issue map')
  return MAINTAINER_ENROLLED_ISSUES.map(number => {
    const current = issues.get(number)
    if (!current) throw new Error(`Reconciliation state is missing enrolled issue #${number}`)
    if (!current.present) {
      return Object.freeze({
        issue: number,
        action: 'add-project-item',
        workflow: current.workflow === null ? 'initialize-after-add' : 'preserve-existing',
        value: current.workflow,
      })
    }
    if (current.workflow === null) {
      return Object.freeze({ issue: number, action: 'initialize-workflow', value: 'Candidate' })
    }
    return Object.freeze({ issue: number, action: 'preserve', value: current.workflow })
  })
}

async function addMissingItem(cli, number) {
  try {
    await cli.json([
      'project', 'item-add', String(PINNED_PROJECT.number), '--owner', PINNED_PROJECT.owner,
      '--url', issueURL(number), '--format', 'json',
    ])
  } catch (error) {
    const recovered = await inspectLive(cli)
    if (recovered.issues.get(number)?.present) return 'recovered-existing'
    throw error
  }
  return 'added'
}

async function setCandidate(cli, number) {
  await cli.json([
    'project', 'item-edit', String(PINNED_PROJECT.number), '--owner', PINNED_PROJECT.owner,
    '--url', issueURL(number), '--field', PINNED_PROJECT.workflowField.name,
    '--value', 'Candidate', '--format', 'json',
  ])
}

export async function reconcileLive({ apply = false, cli = createGitHubCLI() } = {}) {
  const initial = await inspectLive(cli)
  const plan = reconciliationPlan(initial)
  if (!apply) {
    return { mode: 'plan', project: initial.project, workflowField: initial.workflowField, actions: plan }
  }

  const preserved = new Map(
    [...initial.issues.entries()]
      .filter(([, item]) => item.workflow !== null)
      .map(([number, item]) => [number, item.workflow]),
  )
  const actions = []
  for (const entry of plan) {
    if (entry.action !== 'add-project-item') continue
    actions.push({ issue: entry.issue, action: 'project-item', result: await addMissingItem(cli, entry.issue) })
  }

  const afterMembership = await inspectLive(cli)
  for (const number of MAINTAINER_ENROLLED_ISSUES) {
    const item = afterMembership.issues.get(number)
    if (!item?.present) throw new Error(`Issue #${number} is still missing from Project after membership reconciliation`)
    if (item.workflow !== null) {
      actions.push({ issue: number, action: 'workflow', result: 'preserved', value: item.workflow })
      continue
    }
    await setCandidate(cli, number)
    actions.push({ issue: number, action: 'workflow', result: 'initialized', value: 'Candidate' })
  }

  const finalState = await inspectLive(cli)
  for (const number of MAINTAINER_ENROLLED_ISSUES) {
    const item = finalState.issues.get(number)
    if (!item?.present) throw new Error(`Issue #${number} is missing after reconciliation read-back`)
    if (item.workflow === null) throw new Error(`Issue #${number} Workflow is unset after reconciliation read-back`)
  }
  for (const [number, value] of preserved) {
    if (finalState.issues.get(number)?.workflow !== value) {
      throw new Error(`Issue #${number} existing Workflow changed during reconciliation`)
    }
  }

  return {
    mode: 'apply',
    project: finalState.project,
    workflowField: finalState.workflowField,
    actions,
    enrolled: MAINTAINER_ENROLLED_ISSUES.length,
  }
}

const PR_REQUIRED_TARGETS = new Set([
  'Code Review', 'Awaiting Merge', 'Verification', 'Awaiting Release', 'Done',
])

function positiveInteger(value, label) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${label} must be a positive integer`)
  return number
}

export function parseTransitionArgs(argv) {
  const values = new Map()
  let apply = false
  const allowed = new Set([
    '--issue', '--from', '--state', '--record', '--scope-record', '--source-sha',
    '--policy-sha', '--operation-id', '--pr', '--head-sha', '--evidence-id',
  ])
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === '--apply') {
      if (apply) throw new Error('Duplicate argument: --apply')
      apply = true
      continue
    }
    if (!allowed.has(flag)) throw new Error(`Unknown transition argument: ${flag}`)
    if (values.has(flag)) throw new Error(`Duplicate transition argument: ${flag}`)
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`)
    values.set(flag, value)
    index += 1
  }

  const required = flag => {
    const value = values.get(flag)
    if (!value) throw new Error(`Missing required transition argument: ${flag}`)
    return value
  }
  const issue = positiveInteger(required('--issue'), '--issue')
  if (!MAINTAINER_ENROLLED_ISSUES.includes(issue)) throw new Error(`Issue #${issue} is not enrolled in this pilot`)
  const from = assertWorkflowState(required('--from'))
  const target = assertWorkflowState(required('--state'))
  requireTransition(from, target)
  const sourceSHA = assertFullSHA(required('--source-sha'), 'source-sha')
  const policySHA = assertFullSHA(required('--policy-sha'), 'policy-sha')
  const operationID = assertOperationID(required('--operation-id'))
  const recordURL = required('--record')
  const reviewTargets = new Set(['Issue Review', 'Ready', 'Rejected', 'Duplicate'])
  const scopeRecordURL = values.get('--scope-record') ?? (reviewTargets.has(target) ? recordURL : null)
  if (!scopeRecordURL) throw new Error('--scope-record is required after Issue Review')

  const pr = values.has('--pr') ? positiveInteger(values.get('--pr'), '--pr') : null
  const headSHA = values.has('--head-sha') ? assertFullSHA(values.get('--head-sha'), 'head-sha') : null
  if (PR_REQUIRED_TARGETS.has(target) && (pr === null || headSHA === null)) {
    throw new Error(`${target} requires --pr and --head-sha`)
  }
  if ((pr === null) !== (headSHA === null)) throw new Error('--pr and --head-sha must be supplied together')

  const recordLocation = parseRecordURL(recordURL)
  const scopeLocation = parseRecordURL(scopeRecordURL)
  for (const location of [recordLocation, scopeLocation]) {
    if (`${location.owner}/${location.repo}` !== PINNED_PROJECT.repository) {
      throw new Error('Evidence record must belong to sectile/sectile')
    }
  }
  if (scopeLocation.surface !== 'issue-comment' || scopeLocation.number !== issue) {
    throw new Error('scope-record must be a comment on the target issue')
  }
  if (recordLocation.surface === 'issue-comment' && recordLocation.number !== issue) {
    throw new Error('Issue evidence record belongs to a different issue')
  }
  if (recordLocation.surface !== 'issue-comment' && recordLocation.number !== pr) {
    throw new Error('PR evidence record belongs to a different pull request')
  }

  const evidenceID = values.get('--evidence-id') ?? null
  if (recordLocation.surface === 'pr-review' && !evidenceID) {
    throw new Error('--evidence-id is required for a native PR review permalink')
  }
  if (evidenceID !== null) assertOperationID(evidenceID)

  return {
    repository: PINNED_PROJECT.repository,
    issue,
    from,
    target,
    recordURL,
    scopeRecordURL,
    recordLocation,
    scopeLocation,
    sourceSHA,
    policySHA,
    operationID,
    pr,
    headSHA,
    evidenceID,
    mergeSHA: null,
    apply,
  }
}

function assertTrustedEvidence(meta) {
  if (!meta?.author?.login) throw new Error('Evidence has no GitHub author identity')
  if (!['OWNER', 'MEMBER'].includes(meta.authorAssociation)) {
    throw new Error(`Evidence author is not an organization owner/member: ${meta.author.login}`)
  }
}

async function readIssue(cli, issue) {
  const payload = requireObject(await cli.json([
    'issue', 'view', String(issue), '-R', PINNED_PROJECT.repository,
    '--json', 'number,state,comments,url',
  ]), `Issue #${issue}`)
  if (payload.number !== issue) throw new Error(`Issue read-back mismatch for #${issue}`)
  requireArray(payload.comments, `Issue #${issue} comments`)
  return payload
}

async function readPullRequest(cli, pr) {
  const payload = requireObject(await cli.json([
    'pr', 'view', String(pr), '-R', PINNED_PROJECT.repository,
    '--json', 'number,headRefOid,baseRefOid,isDraft,state,mergedAt,mergeCommit,body,url,comments,reviews',
  ]), `PR #${pr}`)
  if (payload.number !== pr) throw new Error(`PR read-back mismatch for #${pr}`)
  requireArray(payload.comments, `PR #${pr} comments`)
  requireArray(payload.reviews, `PR #${pr} reviews`)
  return payload
}

async function resolveEvidenceRecord(cli, request, location, prPayload = null) {
  if (location.surface === 'issue-comment') {
    const issue = await readIssue(cli, location.number)
    const matches = issue.comments.filter(comment => comment?.url === location.url)
    if (matches.length !== 1) throw new Error(`Expected one issue evidence comment; observed ${matches.length}`)
    assertTrustedEvidence(matches[0])
    return {
      record: parseRecordBody(requireString(matches[0].body, 'Issue evidence body')),
      surface: location.surface,
      url: location.url,
      githubId: matches[0].id,
      author: matches[0].author.login,
      commitSHA: null,
    }
  }

  const pr = prPayload ?? await readPullRequest(cli, location.number)
  if (location.surface === 'pr-comment') {
    const matches = pr.comments.filter(comment => comment?.url === location.url)
    if (matches.length !== 1) throw new Error(`Expected one PR evidence comment; observed ${matches.length}`)
    assertTrustedEvidence(matches[0])
    return {
      record: parseRecordBody(requireString(matches[0].body, 'PR evidence body')),
      surface: location.surface,
      url: location.url,
      githubId: matches[0].id,
      author: matches[0].author.login,
      commitSHA: null,
    }
  }

  const candidates = []
  for (const review of pr.reviews) {
    if (!review?.body) continue
    let record
    try {
      record = parseRecordBody(review.body)
    } catch {
      continue
    }
    let identity
    try {
      identity = recordIdentity(record)
    } catch {
      continue
    }
    if (identity.recordId === request.evidenceID) candidates.push({ review, record })
  }
  if (candidates.length !== 1) {
    throw new Error(`Expected one native PR review with Record ID ${request.evidenceID}; observed ${candidates.length}`)
  }
  const { review, record } = candidates[0]
  assertTrustedEvidence(review)
  const commitSHA = assertFullSHA(review.commit?.oid, 'native review commit SHA')
  if (request.headSHA !== null && commitSHA !== request.headSHA) {
    throw new Error('Native PR review is historical for a different PR head')
  }
  return {
    record,
    surface: location.surface,
    url: location.url,
    githubId: review.id,
    author: review.author.login,
    commitSHA,
  }
}

function requireEvidenceSurface(request, evidence) {
  const issueOnly = new Set(['Issue Review', 'Ready', 'In Progress', 'Blocked', 'Rejected', 'Duplicate'])
  if (issueOnly.has(request.target) && evidence.surface !== 'issue-comment') {
    throw new Error(`${request.target} evidence must be an issue comment`)
  }
  if ((request.target === 'Awaiting Merge' ||
      (request.target === 'Verification' && request.from === 'Awaiting Merge')) &&
      !['pr-comment', 'pr-review'].includes(evidence.surface)) {
    throw new Error(`${request.target} requires Code Review evidence on the pull request`)
  }
  if (['Code Review', 'Awaiting Release', 'Done'].includes(request.target) &&
      !['issue-comment', 'pr-comment'].includes(evidence.surface)) {
    throw new Error(`${request.target} requires Verification evidence in an issue or PR comment`)
  }
}

async function operatorIdentity(cli) {
  const auth = requireObject(await cli.json([
    'auth', 'status', '--active', '-h', 'github.com', '--json', 'hosts',
  ]), 'gh auth status')
  const rows = auth.hosts?.['github.com']
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.active !== true || rows[0]?.state !== 'success') {
    throw new Error('No single healthy active github.com account is available')
  }
  const login = requireString(rows[0].login, 'active GitHub login')
  const repo = requireObject(await cli.json([
    'repo', 'view', PINNED_PROJECT.repository, '--json', 'viewerPermission,defaultBranchRef',
  ]), 'Repository permission')
  if (!['ADMIN', 'MAINTAIN'].includes(repo.viewerPermission)) {
    throw new Error(`Workflow transition requires ADMIN or MAINTAIN permission; observed ${repo.viewerPermission ?? 'none'}`)
  }
  if (repo.defaultBranchRef?.name !== 'main') throw new Error('Pinned default branch is no longer main')
  return login
}

async function validateGitSnapshots(git, request) {
  await git.text(['fetch', '--quiet', 'origin', 'main'])
  const defaultSHA = assertFullSHA(
    (await git.text(['rev-parse', 'refs/remotes/origin/main'])).trim(),
    'current default HEAD',
  )
  for (const [label, sha] of [['source-sha', request.sourceSHA], ['policy-sha', request.policySHA]]) {
    const type = (await git.text(['cat-file', '-t', `${sha}^{commit}`])).trim()
    if (type !== 'commit') throw new Error(`${label} does not identify a Git commit`)
  }
  const mergeBase = assertFullSHA(
    (await git.text(['merge-base', request.policySHA, defaultSHA])).trim(),
    'policy/default merge base',
  )
  if (mergeBase !== request.policySHA) {
    throw new Error('policy-sha is not an ancestor of the current default HEAD')
  }
  return defaultSHA
}

function requirePRState(request, pr) {
  if (request.pr === null) return null
  if (pr.headRefOid !== request.headSHA) throw new Error('Current PR head does not match head-sha')
  if (!pr.body?.match(new RegExp(`(?:Refs?|references?)\\s+#${request.issue}\\b`, 'iu'))) {
    throw new Error(`PR #${request.pr} does not contain an ordinary reference to issue #${request.issue}`)
  }
  if (['Code Review', 'Awaiting Merge'].includes(request.target)) {
    if (pr.state !== 'OPEN' || pr.isDraft || pr.mergedAt !== null) {
      throw new Error(`PR #${request.pr} must be open, non-Draft, and unmerged for ${request.target}`)
    }
  }
  const mergedTargets = request.target === 'Awaiting Release' || request.target === 'Done' ||
    request.target === 'Verification'
  if (mergedTargets) {
    if (pr.state !== 'MERGED' || !pr.mergedAt) throw new Error(`PR #${request.pr} must be merged for ${request.target}`)
    request.mergeSHA = assertFullSHA(pr.mergeCommit?.oid, 'merged source SHA')
  }
  return request.mergeSHA
}

async function transitionCompletions(cli, request) {
  const issue = await readIssue(cli, request.issue)
  const matches = []
  for (const comment of issue.comments) {
    const completion = parseTransitionCompletion(comment?.body)
    if (completion?.operationId === request.operationID) matches.push({ completion, comment })
  }
  if (matches.length > 1) throw new Error(`Duplicate completion records for operation ${request.operationID}`)
  return matches[0] ?? null
}

function validateCompletionRequest(completion, request) {
  if (completion.previous !== request.from || completion.current !== request.target ||
      completion.evidence !== request.recordURL || completion.scopeReview !== request.scopeRecordURL ||
      completion.sourceSHA !== request.sourceSHA || completion.policySHA !== request.policySHA) {
    throw new Error(`operation-id ${request.operationID} is already bound to a different transition`)
  }
  const expectedPR = request.pr === null ? 'N/A' : `#${request.pr}`
  const expectedHead = request.headSHA ?? 'N/A'
  if (completion.pr !== expectedPR || completion.prHeadSHA !== expectedHead) {
    throw new Error(`operation-id ${request.operationID} is already bound to a different PR snapshot`)
  }
}

function completionBody(request, {
  actor,
  defaultSHA,
  evidence,
  scope,
  recovery,
}) {
  const evidenceIdentity = recordIdentity(evidence.record)
  const scopeIdentity = recordIdentity(scope.record)
  return [
    '## Workflow Transition — v2',
    `- Operation ID: ${request.operationID}`,
    `- Actor: @${actor} / Loki operator`,
    `- Previous: ${request.from}`,
    `- Current: ${request.target}`,
    `- Evidence record: ${request.recordURL}`,
    `- Evidence Record ID: ${evidenceIdentity.recordId}`,
    `- Scope review: ${request.scopeRecordURL}`,
    `- Scope Work ID: ${scopeIdentity.workId}`,
    `- Scope Run ID: ${scopeIdentity.runId}`,
    `- Source SHA: ${request.sourceSHA}`,
    `- Policy SHA: ${request.policySHA}`,
    `- Current default HEAD at transition: ${defaultSHA}`,
    `- PR: ${request.pr === null ? 'N/A' : `#${request.pr}`}`,
    `- PR head SHA: ${request.headSHA ?? 'N/A'}`,
    `- Merged source SHA: ${request.mergeSHA ?? 'N/A'}`,
    `- Recovery: ${recovery}`,
    '',
    'The canonical issue-level Workflow field was read back after mutation or recovery. This record is metadata evidence, not merge or release authorization.',
  ].join('\n')
}

async function publishCompletion(cli, request, context) {
  const body = completionBody(request, context)
  try {
    await cli.text([
      'issue', 'comment', String(request.issue), '-R', PINNED_PROJECT.repository, '--body', body,
    ])
  } catch (error) {
    const recovered = await transitionCompletions(cli, request)
    if (recovered) {
      validateCompletionRequest(recovered.completion, request)
      return recovered
    }
    throw error
  }
  const readBack = await transitionCompletions(cli, request)
  if (!readBack) throw new Error('Workflow transition completion comment was not found after publication')
  validateCompletionRequest(readBack.completion, request)
  return readBack
}

async function setWorkflowValue(cli, issue, value) {
  await cli.json([
    'project', 'item-edit', String(PINNED_PROJECT.number), '--owner', PINNED_PROJECT.owner,
    '--url', issueURL(issue), '--field', PINNED_PROJECT.workflowField.name,
    '--value', value, '--format', 'json',
  ])
}

export function transitionDisposition(current, request, completion = null) {
  assertWorkflowState(current)
  if (completion !== null) {
    validateCompletionRequest(completion, request)
    if (current !== request.target) {
      throw new Error(`Operation ${request.operationID} is recorded complete but Workflow is ${current}`)
    }
    return 'already-complete'
  }
  if (current === request.from) return 'mutate-workflow'
  if (current === request.target) return 'recover-completion'
  throw new Error(`Workflow changed: expected ${request.from} or recovered ${request.target}, observed ${current}`)
}

export async function transitionLive(request, {
  cli = createGitHubCLI(),
  git = createGitCLI(),
} = {}) {
  const actor = await operatorIdentity(cli)
  const state = await inspectLive(cli)
  const item = state.issues.get(request.issue)
  if (!item?.present) throw new Error(`Issue #${request.issue} is not a Project item`)
  if (item.workflow === null) throw new Error(`Issue #${request.issue} Workflow is unset`)

  const existingCompletion = await transitionCompletions(cli, request)
  const disposition = transitionDisposition(
    item.workflow,
    request,
    existingCompletion?.completion ?? null,
  )
  if (disposition === 'already-complete') {
    return {
      mode: request.apply ? 'apply' : 'plan',
      result: 'already-complete',
      issue: request.issue,
      current: item.workflow,
      operationID: request.operationID,
      completion: existingCompletion.comment.url,
    }
  }

  const pr = request.pr === null ? null : await readPullRequest(cli, request.pr)
  requirePRState(request, pr)
  const scope = await resolveEvidenceRecord(cli, request, request.scopeLocation, pr)
  if (scope.surface !== 'issue-comment') throw new Error('Scope review must be an issue comment')
  const evidence = request.recordURL === request.scopeRecordURL
    ? scope
    : await resolveEvidenceRecord(cli, request, request.recordLocation, pr)
  requireEvidenceSurface(request, evidence)
  const defaultSHA = await validateGitSnapshots(git, request)
  validateTransitionEvidence(evidence.record, scope.record, request)

  const action = disposition
  if (!request.apply) {
    return {
      mode: 'plan',
      action,
      issue: request.issue,
      previous: request.from,
      target: request.target,
      operationID: request.operationID,
      actor,
      evidence: { url: evidence.url, surface: evidence.surface, author: evidence.author },
      scopeReview: request.scopeRecordURL,
      currentDefaultHEAD: defaultSHA,
      pr: request.pr,
      prHeadSHA: request.headSHA,
      mergedSourceSHA: request.mergeSHA,
    }
  }

  let recovery = 'normal'
  if (item.workflow === request.from) {
    await setWorkflowValue(cli, request.issue, request.target)
    const afterMutation = await inspectLive(cli)
    if (afterMutation.issues.get(request.issue)?.workflow !== request.target) {
      throw new Error(`Workflow read-back mismatch after transition to ${request.target}`)
    }
  } else {
    recovery = 'reconciled-existing-target'
  }

  const completion = await publishCompletion(cli, request, {
    actor,
    defaultSHA,
    evidence,
    scope,
    recovery,
  })
  return {
    mode: 'apply',
    result: recovery === 'normal' ? 'transitioned' : 'recovered',
    issue: request.issue,
    previous: request.from,
    current: request.target,
    operationID: request.operationID,
    completion: completion.comment.url,
    currentDefaultHEAD: defaultSHA,
    pr: request.pr,
    prHeadSHA: request.headSHA,
    mergedSourceSHA: request.mergeSHA,
  }
}

function parseArgs(argv) {
  const [command = 'inspect', ...rest] = argv
  if (command === 'transition') {
    return { command, transition: parseTransitionArgs(rest) }
  }
  const apply = rest.includes('--apply')
  const unknown = rest.filter(value => value !== '--apply')
  if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown[0]}`)
  if (command !== 'reconcile' && apply) throw new Error('--apply is valid only with reconcile')
  return { command, apply }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  let result
  switch (parsed.command) {
    case 'inspect': {
      const state = await inspectLive()
      result = {
        project: state.project,
        workflowField: state.workflowField,
        enrolledPresent: MAINTAINER_ENROLLED_ISSUES.filter(number => state.issues.get(number)?.present),
        enrolledMissing: MAINTAINER_ENROLLED_ISSUES.filter(number => !state.issues.get(number)?.present),
      }
      break
    }
    case 'reconcile':
      result = await reconcileLive({ apply: parsed.apply })
      break
    case 'transition':
      result = await transitionLive(parsed.transition)
      break
    default:
      throw new Error(`Unknown command: ${parsed.command}`)
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
