import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_BUFFER = 2 * 1024 * 1024

function commandLabel(args) {
  return ['gh', ...args.slice(0, 4)].join(' ')
}

export async function runGitHubCLI(args, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBuffer = DEFAULT_MAX_BUFFER,
} = {}) {
  if (!Array.isArray(args) || args.length === 0 || args.some(arg => typeof arg !== 'string')) {
    throw new Error('GitHub CLI arguments must be a non-empty string array')
  }

  try {
    const { stdout = '', stderr = '' } = await execFileAsync('gh', args, {
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer,
      windowsHide: true,
    })
    return { stdout, stderr }
  } catch (error) {
    const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : ''
    const detail = stderr ? `: ${stderr}` : ''
    const timeout = error?.killed || error?.signal === 'SIGTERM' ? ' timed out' : ''
    throw new Error(`${commandLabel(args)}${timeout} failed${detail}`, { cause: error })
  }
}

export function createGitHubCLI(run = runGitHubCLI) {
  if (typeof run !== 'function') throw new Error('GitHub CLI runner is required')

  async function text(args, options) {
    const result = await run(args, options)
    if (!result || typeof result.stdout !== 'string' || typeof result.stderr !== 'string') {
      throw new Error(`${commandLabel(args)} returned an invalid process result`)
    }
    return result.stdout
  }

  async function json(args, options) {
    const stdout = await text(args, options)
    if (!stdout.trim()) throw new Error(`${commandLabel(args)} returned empty JSON output`)
    try {
      return JSON.parse(stdout)
    } catch {
      throw new Error(`${commandLabel(args)} returned invalid JSON`)
    }
  }

  return Object.freeze({ json, text })
}

export function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

export function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

export function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

export function requireInteger(value, label) {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be an integer`)
  return value
}
