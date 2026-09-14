import { readFile } from 'node:fs/promises'
import process from 'node:process'

import { asGitHubList, createGitHubAPI } from './lib/github-api.mjs'
import {
  assertMaintainerPermission,
  commentIdFromRecordURL,
  compareWorkflowField,
  issueFieldPatch,
  parseWorkflowRequest,
  recordSupportsTarget,
  recordURLBelongsToIssue,
  requireTransition,
  validateRequestShape,
  workflowValue,
} from './lib/github-project-workflow.mjs'

const EXPECTED_REPOSITORY = 'sectile/sectile'
const PROJECT_TITLE = 'Sectile Engineering'
const TEMPLATE_MARKER = 'Template: sectile-issue-report/v1'

function token() {
  const value = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  if (!value) throw new Error('GH_TOKEN or GITHUB_TOKEN is required')
  return value
}

async function loadEvent() {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is required')
  return JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
}

function repositoryParts(event) {
  const fullName = event?.repository?.full_name || process.env.GITHUB_REPOSITORY
  if (fullName !== EXPECTED_REPOSITORY) {
    throw new Error(`Workflow is scoped to ${EXPECTED_REPOSITORY}; observed ${fullName ?? 'unknown'}`)
  }
  return { owner: 'sectile', repo: 'sectile' }
}

async function workflowField(api, owner) {
  const fields = asGitHubList(await api.request(`/orgs/${owner}/issue-fields`))
  const matches = fields.filter(field => field.name === 'Workflow')
  if (matches.length !== 1) throw new Error(`Expected one Workflow issue field; observed ${matches.length}`)
  const errors = compareWorkflowField(matches[0])
  if (errors.length > 0) throw new Error(`Workflow field schema mismatch: ${errors.join(', ')}`)
  return matches[0]
}

async function project(api, owner) {
  const projects = asGitHubList(await api.request(`/orgs/${owner}/projectsV2?per_page=100`))
  const matches = projects.filter(candidate => candidate.title === PROJECT_TITLE && candidate.state !== 'closed')
  if (matches.length !== 1) throw new Error(`Expected one open ${PROJECT_TITLE} project; observed ${matches.length}`)
  return matches[0]
}

async function ensureProjectItem(api, owner, projectNumber, issue) {
  const response = await api.requestResult(`/orgs/${owner}/projectsV2/${projectNumber}/items`, {
    method: 'POST',
    body: { type: 'Issue', id: Number(issue.id) },
    acceptedStatuses: [304],
  })
  if (response.status === 201) return 'added'
  if (response.status === 304) return 'existing'
  throw new Error(`Unexpected Project item status: ${response.status}`)
}

async function issueWorkflowValues(api, owner, repo, issueNumber) {
  return asGitHubList(
    await api.request(`/repos/${owner}/${repo}/issues/${issueNumber}/issue-field-values?per_page=100`),
  )
}

async function setWorkflow(api, owner, repo, issueNumber, field, state, expectedCurrent) {
  const before = workflowValue(
    await issueWorkflowValues(api, owner, repo, issueNumber),
    field.id,
  )
  if (before !== expectedCurrent) {
    throw new Error(
      `Workflow changed before mutation for #${issueNumber}: expected ${expectedCurrent ?? 'unset'}, observed ${before ?? 'unset'}`,
    )
  }

  await api.request(`/repos/${owner}/${repo}/issues/${issueNumber}/issue-field-values`, {
    method: 'POST',
    body: issueFieldPatch(field.id, state),
  })
  const observed = workflowValue(
    await issueWorkflowValues(api, owner, repo, issueNumber),
    field.id,
  )
  if (observed !== state) {
    throw new Error(`Workflow read-back mismatch for #${issueNumber}: expected ${state}, observed ${observed ?? 'unset'}`)
  }
}

async function initializeIssue(api, event) {
  const { owner, repo } = repositoryParts(event)
  const issue = event.issue
  if (!issue || issue.pull_request) return { result: 'ignored', reason: 'not an issue' }
  if (!issue.body?.includes(TEMPLATE_MARKER)) {
    return { result: 'ignored', reason: 'issue-report marker absent' }
  }

  const field = await workflowField(api, owner)
  const projectInfo = await project(api, owner)
  const itemResult = await ensureProjectItem(api, owner, projectInfo.number, issue)
  const current = workflowValue(
    await issueWorkflowValues(api, owner, repo, issue.number),
    field.id,
  )
  if (current !== null) {
    return { result: 'preserved', issue: issue.number, workflow: current, projectItem: itemResult }
  }
  await setWorkflow(api, owner, repo, issue.number, field, 'Candidate', null)
  return { result: 'initialized', issue: issue.number, workflow: 'Candidate', projectItem: itemResult }
}

async function requireMaintainer(api, owner, repo, login) {
  const access = await api.request(`/repos/${owner}/${repo}/collaborators/${login}/permission`)
  assertMaintainerPermission({ permission: access.permission, roleName: access.role_name })
}

async function requireCommit(api, owner, repo, sha, label) {
  if (!sha) return
  const commit = await api.request(`/repos/${owner}/${repo}/commits/${sha}`)
  if (commit.sha !== sha) throw new Error(`${label} did not resolve to the requested full SHA`)
}

async function requirePolicyAncestor(api, owner, repo, policySHA, defaultSHA) {
  if (!policySHA) return
  const comparison = await api.request(`/repos/${owner}/${repo}/compare/${policySHA}...${defaultSHA}`)
  if (!['ahead', 'identical'].includes(comparison.status)) {
    throw new Error(`policy-sha is not an ancestor of current default HEAD; compare status=${comparison.status}`)
  }
}

async function requireRecord(api, owner, repo, issueNumber, request) {
  if (!request.record) return null
  if (!recordURLBelongsToIssue(request.record, owner, repo, issueNumber)) {
    throw new Error('record URL must identify a comment on the same issue')
  }
  const commentId = commentIdFromRecordURL(request.record)
  const comment = await api.request(`/repos/${owner}/${repo}/issues/comments/${commentId}`)
  if (!comment.issue_url?.endsWith(`/issues/${issueNumber}`)) {
    throw new Error('record comment belongs to a different issue')
  }
  if (!recordSupportsTarget(comment.body, request)) {
    throw new Error(`record does not contain the provenance/evidence required for ${request.state}`)
  }
  return comment
}

async function requirePR(api, owner, repo, issueNumber, request) {
  if (request.pr === null) return null
  const pr = await api.request(`/repos/${owner}/${repo}/pulls/${request.pr}`)
  if (pr.head?.sha !== request.headSHA) throw new Error('PR head does not match head-sha')
  if (pr.base?.repo?.full_name !== `${owner}/${repo}`) throw new Error('PR base repository is not the scoped repository')
  if (!pr.body?.match(new RegExp(`(?:Refs?|references?)\\s+#${issueNumber}\\b`, 'iu'))) {
    throw new Error(`PR #${request.pr} does not contain an ordinary reference to issue #${issueNumber}`)
  }
  if (['Code Review', 'Awaiting Merge'].includes(request.state) && pr.draft) {
    throw new Error(`PR #${request.pr} is still Draft`)
  }
  if (request.state === 'Awaiting Merge' && pr.merged) {
    throw new Error(`PR #${request.pr} is already merged; use Verification`)
  }
  if (request.state === 'Verification' && !pr.merged) {
    throw new Error(`PR #${request.pr} is not merged`)
  }
  return pr
}

async function applyRequest(api, event) {
  const { owner, repo } = repositoryParts(event)
  const issue = event.issue
  const comment = event.comment
  if (!issue || issue.pull_request || !comment) {
    return { result: 'ignored', reason: 'not an issue comment' }
  }

  const request = parseWorkflowRequest(comment.body)
  if (request === null) return { result: 'ignored', reason: 'not a workflow request' }
  const shapeErrors = validateRequestShape(request)
  if (shapeErrors.length > 0) throw new Error(`Invalid workflow request: ${shapeErrors.join(', ')}`)

  await requireMaintainer(api, owner, repo, comment.user?.login)
  const field = await workflowField(api, owner)
  const projectInfo = await project(api, owner)
  await ensureProjectItem(api, owner, projectInfo.number, issue)

  const current = workflowValue(
    await issueWorkflowValues(api, owner, repo, issue.number),
    field.id,
  )
  if (current === null) throw new Error('Workflow is unset; initialize the issue before transition')
  requireTransition(current, request.state)

  const repository = await api.request(`/repos/${owner}/${repo}`)
  const defaultRef = await api.request(`/repos/${owner}/${repo}/branches/${repository.default_branch}`)
  const defaultSHA = defaultRef.commit?.sha
  if (!defaultSHA) throw new Error('Could not resolve current default branch HEAD')

  await requireCommit(api, owner, repo, request.sourceSHA, 'source-sha')
  await requireCommit(api, owner, repo, request.policySHA, 'policy-sha')
  await requirePolicyAncestor(api, owner, repo, request.policySHA, defaultSHA)
  await requireRecord(api, owner, repo, issue.number, request)
  const pr = await requirePR(api, owner, repo, issue.number, request)

  await setWorkflow(api, owner, repo, issue.number, field, request.state, current)
  const resultBody = [
    '## Workflow transition — v1',
    `- Request comment: ${comment.html_url}`,
    `- Actor: @${comment.user.login}`,
    `- Previous: ${current}`,
    `- Current: ${request.state}`,
    `- Record: ${request.record ?? 'N/A'}`,
    `- Source SHA: ${request.sourceSHA ?? 'N/A'}`,
    `- Policy SHA: ${request.policySHA ?? 'N/A'}`,
    `- Current default HEAD at transition: ${defaultSHA}`,
    `- PR: ${pr ? `#${pr.number} @ ${pr.head.sha}` : 'N/A'}`,
    '',
    'The issue-level Workflow field was read back after mutation. This record is not an implementation or merge authorization by itself.',
  ].join('\n')
  const resultComment = await api.request(`/repos/${owner}/${repo}/issues/${issue.number}/comments`, {
    method: 'POST',
    body: { body: resultBody },
  })

  return {
    result: 'transitioned',
    issue: issue.number,
    previous: current,
    current: request.state,
    resultRecord: resultComment.html_url,
  }
}

const event = await loadEvent()
const api = createGitHubAPI(token())
let result
switch (process.env.GITHUB_EVENT_NAME) {
  case 'issues':
    if (event.action !== 'opened') {
      result = { result: 'ignored', reason: `issues.${event.action}` }
    } else {
      result = await initializeIssue(api, event)
    }
    break
  case 'issue_comment':
    if (event.action !== 'created') {
      result = { result: 'ignored', reason: `issue_comment.${event.action}` }
    } else {
      result = await applyRequest(api, event)
    }
    break
  default:
    throw new Error(`Unsupported event: ${process.env.GITHUB_EVENT_NAME ?? 'unknown'}`)
}
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
