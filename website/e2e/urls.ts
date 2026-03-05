import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const AVAILABLE_URLS_FILE = join(process.cwd(), 'e2e', '.available-urls.json')

interface AvailableUrlsPayload {
  availableUrls: string[]
}

let cached: string[] | null = null

/**
 * Read available URLs written by global-setup. Returns empty array if file is missing or empty.
 */
export function getAvailableUrls(): string[] {
  if (cached !== null) return cached
  if (!existsSync(AVAILABLE_URLS_FILE)) {
    cached = []
    return cached
  }
  try {
    const raw = readFileSync(AVAILABLE_URLS_FILE, 'utf-8')
    const data = JSON.parse(raw) as AvailableUrlsPayload
    cached = Array.isArray(data.availableUrls) ? data.availableUrls : []
  } catch {
    cached = []
  }
  return cached
}

/**
 * First available URL for the main extract flow, or undefined if none.
 */
export function getFirstAvailableUrl(): string | undefined {
  return getAvailableUrls()[0]
}

/**
 * Use with test.skip() for tests that require at least one reachable test-file URL.
 */
export function skipWhenNoTestUrls(): boolean {
  return getAvailableUrls().length === 0
}
