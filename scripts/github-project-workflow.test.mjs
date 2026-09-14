import assert from 'node:assert/strict'
import test from 'node:test'

import {
  WORKFLOW_FIELD,
  assertMaintainerPermission,
  compareWorkflowField,
  mergeIssueFieldValue,
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

test('field update preservation retains unrelated field values', () => {
  const existing = [
    { issue_field_id: 10, value: 'owner' },
    { issue_field_id: 20, value: 2, single_select_option: { name: 'Candidate' } },
    { issue_field_id: 30, value: '2026-09-14' },
  ]
  assert.deepEqual(mergeIssueFieldValue(existing, 20, 'Issue Review'), [
    { field_id: 10, value: 'owner' },
    { field_id: 20, value: 'Issue Review' },
    { field_id: 30, value: '2026-09-14' },
  ])
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
