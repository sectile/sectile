import assert from 'node:assert/strict'
import test from 'node:test'

import { createGitHubCLI } from './lib/github-cli.mjs'
import {
  PINNED_PROJECT,
  parseProjectItems,
  readWorkflowValues,
  reconciliationPlan,
  validatePinnedResources,
} from './github-project-workflow.mjs'
import {
  MAINTAINER_ENROLLED_ISSUES,
  WORKFLOW_FIELD,
  assertMaintainerPermission,
  compareWorkflowField,
  issueFieldPatch,
  parseWorkflowRequest,
  recordSupportsTarget,
  recordURLBelongsToIssue,
  requireTransition,
  transitionAllowed,
  validateRequestShape,
  workflowFieldCreateBody,
  workflowValue,
} from './lib/github-project-workflow.mjs'

const SHA_A = 'a'.repeat(40)
const SHA_B = 'b'.repeat(40)
const SHA_C = 'c'.repeat(40)

test('Workflow schema contains the canonical lifecycle in order', () => {
  const body = workflowFieldCreateBody()
  assert.equal(body.name, 'Workflow')
  assert.equal(body.visibility, 'all')
  assert.deepEqual(
    body.options.map(option => option.name),
    WORKFLOW_FIELD.options.map(option => option.name),
  )
  assert.deepEqual(compareWorkflowField(body), [])
})

test('schema comparison rejects reordered or incomplete options', () => {
  const body = workflowFieldCreateBody()
  body.options = [...body.options].reverse()
  assert.match(compareWorkflowField(body).join('\n'), /options=/u)
})

test('transition graph does not allow lifecycle skipping', () => {
  assert.equal(transitionAllowed('Candidate', 'Issue Review'), true)
  assert.equal(transitionAllowed('Candidate', 'Ready'), false)
  assert.equal(transitionAllowed('Issue Review', 'Ready'), true)
  assert.equal(transitionAllowed('Ready', 'In Progress'), true)
  assert.equal(transitionAllowed('Blocked', 'Issue Review'), true)
  assert.throws(() => requireTransition('In Progress', 'Done'), /not allowed/u)
})

test('workflow requests use a non-shell line protocol and validate provenance', () => {
  const request = parseWorkflowRequest([
    '/sectile-workflow',
    'state: Ready',
    'record: https://github.com/sectile/sectile/issues/194#issuecomment-1234',
    `source-sha: ${SHA_A}`,
    `policy-sha: ${SHA_B}`,
  ].join('\n'))

  assert.equal(request.state, 'Ready')
  assert.equal(request.sourceSHA, SHA_A)
  assert.deepEqual(validateRequestShape(request), [])
  assert.equal(
    recordURLBelongsToIssue(request.record, 'sectile', 'sectile', 194),
    true,
  )
})

test('workflow request rejects unknown fields, bad SHAs and foreign records', () => {
  assert.throws(
    () => parseWorkflowRequest('/sectile-workflow\nstate: Ready\nshell: echo unsafe'),
    /Unknown workflow request field/u,
  )
  assert.throws(
    () => parseWorkflowRequest('/sectile-workflow\nstate: Ready\nsource-sha: deadbeef'),
    /40-character/u,
  )
  assert.equal(
    recordURLBelongsToIssue(
      'https://github.com/other/repo/issues/194#issuecomment-1',
      'sectile',
      'sectile',
      194,
    ),
    false,
  )
})

test('phase-specific request shape requires review and PR identities', () => {
  const ready = parseWorkflowRequest('/sectile-workflow\nstate: Ready\nrecord: https://github.com/sectile/sectile/issues/1#issuecomment-1')
  assert.deepEqual(validateRequestShape(ready), [
    'source-sha is required',
    'policy-sha is required',
  ])

  const review = parseWorkflowRequest([
    '/sectile-workflow',
    'state: Code Review',
    'record: https://github.com/sectile/sectile/issues/1#issuecomment-1',
    `source-sha: ${SHA_A}`,
    `policy-sha: ${SHA_B}`,
  ].join('\n'))
  assert.deepEqual(validateRequestShape(review), [
    'pr is required',
    'head-sha is required',
  ])
})

test('records must contain the exact provenance required by the target state', () => {
  const ready = parseWorkflowRequest([
    '/sectile-workflow',
    'state: Ready',
    'record: https://github.com/sectile/sectile/issues/194#issuecomment-1234',
    `source-sha: ${SHA_A}`,
    `policy-sha: ${SHA_B}`,
  ].join('\n'))
  assert.equal(recordSupportsTarget([
    '## Issue Review — v1',
    `Reviewed source ref / full SHA: main / ${SHA_A}`,
    `Template version / policy commit: v1 / ${SHA_B}`,
    'Implementation readiness: Ready',
  ].join('\n'), ready), true)
  assert.equal(recordSupportsTarget('## Issue Review — v1\nImplementation readiness: Ready', ready), false)

  const codeReview = parseWorkflowRequest([
    '/sectile-workflow',
    'state: Awaiting Merge',
    'record: https://github.com/sectile/sectile/issues/194#issuecomment-1234',
    `source-sha: ${SHA_A}`,
    `policy-sha: ${SHA_B}`,
    'pr: 200',
    `head-sha: ${SHA_C}`,
  ].join('\n'))
  assert.equal(recordSupportsTarget([
    '## Code Review — v1',
    `Source: ${SHA_A}`,
    `Policy: ${SHA_B}`,
    `Reviewed PR head SHA: ${SHA_C}`,
    'Outcome: Passed',
  ].join('\n'), codeReview), true)
})

test('issue-field POST payload changes only the requested field', () => {
  assert.deepEqual(issueFieldPatch(20, 'Issue Review'), {
    issue_field_values: [{ field_id: 20, value: 'Issue Review' }],
  })
  assert.throws(() => issueFieldPatch(0, 'Ready'), /positive integer/u)
  assert.throws(() => issueFieldPatch(20, ''), /non-empty string/u)

  const existing = [
    { issue_field_id: 10, value: 'owner' },
    { issue_field_id: 20, value: 2, single_select_option: { name: 'Candidate' } },
    { issue_field_id: 30, value: '2026-09-14' },
  ]
  assert.equal(workflowValue(existing, 20), 'Candidate')
})

test('maintainer permission honors GitHub role mapping and fails closed', () => {
  assert.doesNotThrow(() => assertMaintainerPermission({ permission: 'admin', roleName: 'admin' }))
  assert.doesNotThrow(() => assertMaintainerPermission({ permission: 'write', roleName: 'maintain' }))
  assert.throws(
    () => assertMaintainerPermission({ permission: 'write', roleName: 'write' }),
    /admin\/maintain/u,
  )
  assert.throws(() => assertMaintainerPermission(), /admin\/maintain/u)
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
