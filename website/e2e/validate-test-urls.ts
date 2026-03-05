import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const FETCH_TIMEOUT_MS = 10_000

function getTestFilesDir(): string {
  let dir = process.cwd()
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, 'test_files')
    if (existsSync(candidate)) return candidate
    dir = join(dir, '..')
  }
  return join(process.cwd(), 'test_files')
}

/**
 * Read and normalize URLs from a file. Returns empty array if file doesn't exist.
 */
async function readUrlsFromFile(filePath: string): Promise<string[]> {
  if (!existsSync(filePath)) return []
  const raw = await readFile(filePath, 'utf-8')
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * Fetch a URL with timeout. Returns true if response is ok.
 */
async function checkUrlReachable(url: string): Promise<boolean> {
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

export interface ValidateResult {
  availableUrls: string[]
  allUrls: string[]
  statusByUrl: Record<string, boolean>
}

/**
 * Read urls.txt and embeddedUrls.txt from test_files, fetch each URL,
 * and return which are reachable. Deduplicates and preserves order (urls.txt first, then embeddedUrls).
 */
export async function validateTestUrls(): Promise<ValidateResult> {
  const testFilesDir = getTestFilesDir()
  const urlsPath = join(testFilesDir, 'urls.txt')
  const embeddedPath = join(testFilesDir, 'embeddedUrls.txt')

  const [urlsFromTxt, urlsFromEmbedded] = await Promise.all([
    readUrlsFromFile(urlsPath),
    readUrlsFromFile(embeddedPath),
  ])

  const allUrls = [...new Set([...urlsFromTxt, ...urlsFromEmbedded])]
  const statusByUrl: Record<string, boolean> = {}

  await Promise.all(
    allUrls.map(async (url) => {
      statusByUrl[url] = await checkUrlReachable(url)
    }),
  )

  const availableUrls = allUrls.filter((url) => statusByUrl[url] === true)

  return { availableUrls, allUrls, statusByUrl }
}
