import process from 'node:process'
import { pathToFileURL } from 'node:url'

import {
  createGitHubCLI,
  requireArray,
  requireInteger,
  requireObject,
  requireString,
} from './lib/github-cli.mjs'
import {
  MAINTAINER_ENROLLED_ISSUES,
  WORKFLOW_STATES,
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

function parseArgs(argv) {
  const [command = 'inspect', ...rest] = argv
  const apply = rest.includes('--apply')
  const unknown = rest.filter(value => value !== '--apply')
  if (unknown.length > 0) throw new Error(`Unknown argument: ${unknown[0]}`)
  if (command !== 'reconcile' && apply) throw new Error('--apply is valid only with reconcile')
  return { command, apply }
}

async function main() {
  const { command, apply } = parseArgs(process.argv.slice(2))
  let result
  switch (command) {
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
      result = await reconcileLive({ apply })
      break
    default:
      throw new Error(`Unknown command: ${command}`)
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
