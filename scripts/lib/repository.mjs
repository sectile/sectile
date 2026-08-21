import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export async function listFiles(directory) {
  const result = []
  const pending = [resolve(directory)]
  while (pending.length > 0) {
    const current = pending.pop()
    if (current === undefined) continue
    const entries = await readdir(current, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (let index = entries.length - 1; index >= 0; index--) {
      const entry = entries[index]
      if (entry === undefined) continue
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) pending.push(path)
      else if (entry.isFile()) result.push(path)
    }
  }
  return result.sort()
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

export function relativeToRoot(path) {
  return relative(root, path).split(sep).join('/')
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  }
  return value
}

export function semanticFingerprint(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
}
