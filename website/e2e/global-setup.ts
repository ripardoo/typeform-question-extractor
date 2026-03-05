import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { validateTestUrls } from './validate-test-urls'

const OUTPUT_FILE = join(process.cwd(), 'e2e', '.available-urls.json')

export default async function globalSetup() {
  const result = await validateTestUrls()
  await mkdir(join(process.cwd(), 'e2e'), { recursive: true })
  await writeFile(OUTPUT_FILE, JSON.stringify({ availableUrls: result.availableUrls }, null, 2), 'utf-8')
  if (result.availableUrls.length === 0) {
    console.warn('E2E: No test-file URLs are reachable. URL-dependent tests will be skipped.')
  } else {
    console.log(`E2E: ${result.availableUrls.length} test URL(s) available.`)
  }
}
