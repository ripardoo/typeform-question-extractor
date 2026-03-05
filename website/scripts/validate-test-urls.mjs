#!/usr/bin/env node
/**
 * Standalone script to validate test-file URLs. Run from repo root or website/.
 * Usage: node website/scripts/validate-test-urls.mjs  (from repo root)
 *    or: node scripts/validate-test-urls.mjs          (from website/)
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const FETCH_TIMEOUT_MS = 10_000

function getTestFilesDir() {
  let dir = process.cwd()
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, 'test_files')
    if (existsSync(candidate)) return candidate
    dir = join(dir, '..')
  }
  return join(process.cwd(), 'test_files')
}

function readUrlsFromFile(filePath) {
  if (!existsSync(filePath)) return []
  const raw = readFileSync(filePath, 'utf-8')
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

async function checkUrlReachable(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    return res.ok
  } catch {
    return false
  }
}

const testFilesDir = getTestFilesDir()
const urlsPath = join(testFilesDir, 'urls.txt')
const embeddedPath = join(testFilesDir, 'embeddedUrls.txt')

const urlsFromTxt = readUrlsFromFile(urlsPath)
const urlsFromEmbedded = readUrlsFromFile(embeddedPath)
const allUrls = [...new Set([...urlsFromTxt, ...urlsFromEmbedded])]

console.log('Validating', allUrls.length, 'URL(s) from test_files/...')
const results = await Promise.all(
  allUrls.map(async (url) => ({ url, ok: await checkUrlReachable(url) })),
)
const available = results.filter((r) => r.ok).map((r) => r.url)
results.forEach(({ url, ok }) => console.log(ok ? `  ✓ ${url}` : `  ✗ ${url}`))
console.log('\nReachable:', available.length, 'of', allUrls.length)
if (available.length === 0) {
  process.exitCode = 1
}
