import { test, expect } from '@playwright/test'
import { getFirstAvailableUrl, skipWhenNoTestUrls } from './urls'

test.describe('Home – extract flow', () => {
  test.skip(skipWhenNoTestUrls(), 'No test-file URLs reachable')

  test('shows loading state while extracting', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/paste a typeform url/i).fill(getFirstAvailableUrl()!)
    await page.getByRole('button', { name: /extract/i }).click()

    await expect(page.getByRole('button', { name: /extracting/i })).toBeVisible()
    await expect(page.getByPlaceholder(/paste a typeform url/i)).toBeDisabled()

    await expect(page.getByRole('button', { name: /extract/i })).toBeEnabled({ timeout: 90_000 })
  })

  test('extract shows form flow, fields table, and export section', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/paste a typeform url/i).fill(getFirstAvailableUrl()!)
    await page.getByRole('button', { name: /extract/i }).click()

    await expect(page.getByRole('button', { name: /extract/i })).toBeEnabled({ timeout: 90_000 })
    await expect(page.getByRole('alert')).not.toBeVisible()
    await expect(page.getByText('Form flow')).toBeVisible()
    await expect(page.getByText('Fields table')).toBeVisible()
    await expect(page.getByText('Export', { exact: true })).toBeVisible()
    await expect(page.getByText(/label.*conditions.*answer type/i)).toBeVisible()
    await expect(page.getByText('Mermaid chart', { exact: true })).toBeVisible()
    await expect(page.getByText('SVG', { exact: true })).toBeVisible()

    const table = page.locator('table')
    await expect(table).toBeVisible()
    const rows = table.locator('tbody tr')
    await expect(rows).not.toHaveCount(0)
  })
})
