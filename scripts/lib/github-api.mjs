export const GITHUB_API_VERSION = '2026-03-10'

export function createGitHubAPI(authToken, fetchImpl = globalThis.fetch) {
  if (!authToken) throw new Error('GitHub API token is required')
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required')

  async function requestResult(path, {
    method = 'GET',
    body,
    acceptedStatuses = [],
  } = {}) {
    const response = await fetchImpl(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${authToken}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`${method} ${path} returned non-JSON content`)
      }
    }
    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      const detail = data?.message ? `: ${data.message}` : ''
      throw new Error(`${method} ${path} failed with ${response.status}${detail}`)
    }
    return { status: response.status, data }
  }

  async function request(path, options) {
    return (await requestResult(path, options)).data
  }

  async function graphql(query, variables = {}) {
    const data = await request('/graphql', { method: 'POST', body: { query, variables } })
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      throw new Error(`GraphQL failed: ${data.errors.map(error => error.message).join('; ')}`)
    }
    return data?.data
  }

  return Object.freeze({ request, requestResult, graphql })
}

export function asGitHubList(value) {
  if (Array.isArray(value)) return value
  for (const key of ['values', 'items', 'projects', 'fields']) {
    if (Array.isArray(value?.[key])) return value[key]
  }
  return []
}
