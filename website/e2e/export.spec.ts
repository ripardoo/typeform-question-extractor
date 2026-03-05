import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { getFirstAvailableUrl, skipWhenNoTestUrls } from './urls'

test.describe.serial('Export actions', () => {
  test.skip(skipWhenNoTestUrls(), 'No test-file URLs reachable')

  let sharedPage: Page
  let sharedContext: BrowserContext

  test.beforeAll(async ({ browser }) => {
    const baseURL = process.env.BASE_URL ?? 'http://localhost:5180'
    sharedContext = await browser.newContext({
      baseURL,
      permissions: ['clipboard-read', 'clipboard-write'],
    })
    sharedPage = await sharedContext.newPage()
    await sharedPage.goto('/')
    await sharedPage.getByPlaceholder(/paste a typeform url/i).fill(getFirstAvailableUrl()!)
    await sharedPage.getByRole('button', { name: /extract/i }).click()
    await expect(sharedPage.getByRole('button', { name: /extract/i })).toBeEnabled({ timeout: 90_000 })
    await expect(sharedPage.getByText('Fields table')).toBeVisible()
  })

  test.afterAll(async () => {
    await sharedPage?.close()
    await sharedContext?.close()
  })

  test('markdown copy shows toast', async () => {
    await sharedPage.getByRole('button', { name: /copy markdown table/i }).click()
    await expect(sharedPage.getByText(/copied/i)).toBeVisible({ timeout: 5000 })
  })

  test('markdown download triggers file', async () => {
    const [download] = await Promise.all([
      sharedPage.waitForEvent('download'),
      sharedPage.getByRole('button', { name: /download markdown table/i }).click(),
    ])
    expect(download.suggestedFilename()).toBe('form-fields.md')
  })

  test('mermaid copy shows toast', async () => {
    await sharedPage.getByRole('button', { name: /copy mermaid chart/i }).click()
    await expect(sharedPage.getByText(/copied/i)).toBeVisible({ timeout: 5000 })
  })

  test('mermaid download triggers file', async () => {
    const [download] = await Promise.all([
      sharedPage.waitForEvent('download'),
      sharedPage.getByRole('button', { name: /download mermaid chart/i }).click(),
    ])
    expect(download.suggestedFilename()).toBe('form-graph.md')
  })

  test('SVG copy shows toast or Kroki error', async () => {
    await sharedPage.getByRole('button', { name: /copy svg/i }).click()
    const toast = sharedPage.getByText('Copied SVG')
    const error = sharedPage.getByRole('alert').filter({ hasText: /failed to generate svg/i })
    await expect(toast.or(error)).toBeVisible({ timeout: 20_000 })
  })
})
