import process from 'node:process'

import {
  MAINTAINER_ENROLLED_ISSUES,
  compareWorkflowField,
  issueFieldPatch,
  workflowFieldCreateBody,
  workflowValue,
} from './lib/github-project-workflow.mjs'
import { asGitHubList, createGitHubAPI } from './lib/github-api.mjs'

const DEFAULT_PROJECT_TITLE = 'Sectile Engineering'

function parseArgs(argv) {
  const [command = 'plan', ...rest] = argv
  const flags = new Set(rest)
  return { command, apply: flags.has('--apply') }
}

function repositoryParts() {
  const repository = process.env.GITHUB_REPOSITORY || 'sectile/sectile'
  const [owner, repo, extra] = repository.split('/')
  if (!owner || !repo || extra) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`)
  return { owner, repo }
}

function token() {
  const value = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  if (!value) throw new Error('GH_TOKEN or GITHUB_TOKEN is required')
  return value
}

async function readWorkflowField(api, owner, fieldId) {
  const field = await api.request(`/orgs/${owner}/issue-fields/${fieldId}`)
  const errors = compareWorkflowField(field)
  if (errors.length > 0) {
    throw new Error(`Workflow field is incompatible: ${errors.join(', ')}`)
  }
  return field
}

async function ensureWorkflowField(api, owner, apply, actions) {
  const fields = asGitHubList(await api.request(`/orgs/${owner}/issue-fields`))
  const matches = fields.filter(field => field.name === 'Workflow')
  if (matches.length > 1) throw new Error('Multiple organization Issue Fields are named Workflow')
  if (matches.length === 1) {
    const field = await readWorkflowField(api, owner, matches[0].id)
    actions.push({ action: 'workflow-field', result: 'existing', id: field.id })
    return field
  }

  if (!apply) {
    actions.push({ action: 'workflow-field', result: 'would-create' })
    return null
  }
  const created = await api.request(`/orgs/${owner}/issue-fields`, {
    method: 'POST',
    body: workflowFieldCreateBody(),
  })
  const field = await readWorkflowField(api, owner, created.id)
  actions.push({ action: 'workflow-field', result: 'created', id: field.id })
  return field
}

async function organizationId(api, owner) {
  const data = await api.graphql(
    'query($login:String!){organization(login:$login){id}}',
    { login: owner },
  )
  if (!data?.organization?.id) throw new Error(`Organization not found: ${owner}`)
  return data.organization.id
}

async function repositoryProjectInfo(api, owner, repo) {
  const data = await api.graphql(
    'query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){id projectsV2(first:100){nodes{id}}}}',
    { owner, repo },
  )
  if (!data?.repository?.id) throw new Error(`Repository not found: ${owner}/${repo}`)
  return data.repository
}

async function ensureProject(api, owner, repo, apply, actions) {
  const title = process.env.SECTILE_PROJECT_TITLE || DEFAULT_PROJECT_TITLE
  const projects = asGitHubList(await api.request(`/orgs/${owner}/projectsV2?per_page=100`))
  const matches = projects.filter(project => project.title === title && project.state !== 'closed')
  if (matches.length > 1) throw new Error(`Multiple open projects are titled ${title}`)

  let project = matches[0] ?? null
  if (!project) {
    if (!apply) {
      actions.push({ action: 'project', result: 'would-create', title })
      return null
    }
    const ownerId = await organizationId(api, owner)
    const data = await api.graphql(
      'mutation($ownerId:ID!,$title:String!){createProjectV2(input:{ownerId:$ownerId,title:$title}){projectV2{id number title url public}}}',
      { ownerId, title },
    )
    project = data?.createProjectV2?.projectV2
    if (!project?.id || !project?.number) throw new Error('Project creation returned no usable project identity')
  }

  const projectId = project.node_id ?? project.id
  if (!projectId || !project.number) throw new Error('Project has no usable node ID/number')

  const readme = [
    '# Sectile Engineering',
    '',
    'Tracks the repository engineering pilot. The shared issue-level `Workflow` field is the canonical lifecycle authority.',
    '',
    '- Repository policy: `docs/engineering/workflow.md`',
    '- Issue records: `.github/ISSUE_TEMPLATE/issue-report.md`',
    '- Review/checkpoint records: `docs/engineering/records.md`',
    '- Merge and release remain human decisions.',
  ].join('\n')
  if (apply) {
    await api.graphql(
      'mutation($projectId:ID!,$readme:String!){updateProjectV2(input:{projectId:$projectId,public:true,shortDescription:"Sectile engineering pilot work items",readme:$readme}){projectV2{id public title}}}',
      { projectId, readme },
    )
  }

  const readBack = apply
    ? await api.request(`/orgs/${owner}/projectsV2/${project.number}`)
    : project
  if (apply && (readBack.title !== title || readBack.public !== true)) {
    throw new Error(`Project read-back mismatch: title=${readBack.title}, public=${readBack.public}`)
  }
  actions.push({
    action: 'project',
    result: matches.length === 0 ? (apply ? 'created' : 'would-create') : 'existing',
    number: project.number,
    id: projectId,
    url: readBack.html_url ?? project.url ?? null,
    public: readBack.public ?? project.public ?? null,
  })

  const repository = await repositoryProjectInfo(api, owner, repo)
  const alreadyLinked = repository.projectsV2.nodes.some(node => node.id === projectId)
  if (!alreadyLinked) {
    if (apply) {
      await api.graphql(
        'mutation($projectId:ID!,$repositoryId:ID!){linkProjectV2ToRepository(input:{projectId:$projectId,repositoryId:$repositoryId}){repository{id}}}',
        { projectId, repositoryId: repository.id },
      )
      const linked = await repositoryProjectInfo(api, owner, repo)
      if (!linked.projectsV2.nodes.some(node => node.id === projectId)) {
        throw new Error('Project/repository link failed read-back')
      }
      actions.push({ action: 'project-repository-link', result: 'created' })
    } else {
      actions.push({ action: 'project-repository-link', result: 'would-create' })
    }
  } else {
    actions.push({ action: 'project-repository-link', result: 'existing' })
  }

  return { ...project, id: projectId }
}

async function ensureProjectWorkflowField(api, owner, project, field, apply, actions) {
  if (!project || !field) return
  if (!apply) {
    actions.push({ action: 'project-workflow-field', result: 'would-ensure', issueFieldId: field.id })
    return
  }
  const response = await api.requestResult(`/orgs/${owner}/projectsV2/${project.number}/fields`, {
    method: 'POST',
    body: { issue_field_id: Number(field.id) },
    acceptedStatuses: [304],
  })
  if (![201, 304].includes(response.status)) {
    throw new Error(`Unexpected Project field status: ${response.status}`)
  }
  actions.push({
    action: 'project-workflow-field',
    result: response.status === 201 ? 'added' : 'existing',
    issueFieldId: field.id,
    projectFieldId: response.data?.id ?? null,
  })
}

async function issueWorkflowValues(api, owner, repo, issueNumber) {
  return asGitHubList(
    await api.request(`/repos/${owner}/${repo}/issues/${issueNumber}/issue-field-values?per_page=100`),
  )
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

async function enrollIssues(api, owner, repo, project, field, apply, actions) {
  if (!project || !field) return
  for (const issueNumber of MAINTAINER_ENROLLED_ISSUES) {
    const issue = await api.request(`/repos/${owner}/${repo}/issues/${issueNumber}`)
    if (issue.pull_request) throw new Error(`#${issueNumber} is a pull request, not an issue`)

    if (apply) {
      const itemResult = await ensureProjectItem(api, owner, project.number, issue)
      actions.push({ action: 'project-item', issue: issueNumber, result: itemResult })
    } else {
      actions.push({ action: 'project-item', issue: issueNumber, result: 'would-ensure' })
    }

    const current = workflowValue(
      await issueWorkflowValues(api, owner, repo, issueNumber),
      field.id,
    )
    if (current !== null) {
      actions.push({ action: 'workflow-initialize', issue: issueNumber, result: 'preserved', value: current })
      continue
    }
    if (apply) {
      await api.request(`/repos/${owner}/${repo}/issues/${issueNumber}/issue-field-values`, {
        method: 'POST',
        body: issueFieldPatch(field.id, 'Candidate'),
      })
      const readBack = workflowValue(
        await issueWorkflowValues(api, owner, repo, issueNumber),
        field.id,
      )
      if (readBack !== 'Candidate') throw new Error(`#${issueNumber} Workflow read-back was ${readBack ?? 'unset'}`)
      actions.push({ action: 'workflow-initialize', issue: issueNumber, result: 'set', value: 'Candidate' })
    } else {
      actions.push({ action: 'workflow-initialize', issue: issueNumber, result: 'would-set', value: 'Candidate' })
    }
  }
}

async function setup({ apply }) {
  const { owner, repo } = repositoryParts()
  const api = createGitHubAPI(token())
  const actions = []
  const field = await ensureWorkflowField(api, owner, apply, actions)
  const project = await ensureProject(api, owner, repo, apply, actions)
  await ensureProjectWorkflowField(api, owner, project, field, apply, actions)
  await enrollIssues(api, owner, repo, project, field, apply, actions)
  return { mode: apply ? 'apply' : 'plan', repository: `${owner}/${repo}`, actions }
}

const args = parseArgs(process.argv.slice(2))
if (!['plan', 'setup'].includes(args.command)) {
  throw new Error(`Unknown command: ${args.command}`)
}
const result = await setup({ apply: args.command === 'setup' && args.apply })
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
