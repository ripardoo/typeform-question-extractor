import { test, expect } from '@playwright/test'

test.describe('Smoke and routing', () => {
  test('home page loads with heading and extract form', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /extract and visualize your typeform structure/i })).toBeVisible()
    await expect(page.getByPlaceholder(/paste a typeform url/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /extract/i })).toBeVisible()
  })

  test('about page loads with key sections', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { name: /why this project exists/i })).toBeVisible()
    await expect(page.getByText('Motivation')).toBeVisible()
    await expect(page.getByText('What it does')).toBeVisible()
  })

  test('404 shows not found and navigates back home', async ({ page }) => {
    await page.goto('/nonexistent')
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()

    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL(/\/(\?.*)?$/)
    await expect(page.getByPlaceholder(/paste a typeform url/i)).toBeVisible()
  })
})

test.describe('Home – validation', () => {
  test('empty submit shows error', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /extract/i }).click()
    await expect(page.getByRole('alert')).toContainText(/please enter a typeform url/i)
  })

  test('invalid URL shows validation error', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/paste a typeform url/i).fill('not-a-url')
    await page.getByRole('button', { name: /extract/i }).click()
    await expect(page.getByRole('alert')).toContainText(/valid https url|typeform url/i)
  })

  test('Enter key in input triggers extract', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/paste a typeform url/i).fill('not-a-url')
    await page.getByPlaceholder(/paste a typeform url/i).press('Enter')
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('non-Typeform URL shows no-typeform error', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/paste a typeform url/i).fill('https://httpbin.org/html')
    await page.getByRole('button', { name: /extract/i }).click()
    await expect(page.getByRole('alert')).toContainText(
      /no typeform found at this url/i,
      { timeout: 30_000 },
    )
  })
})

test.describe('Navigation and shell', () => {
  test('header navigates to About and back to Home', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /about/i }).click()
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('heading', { name: /why this project exists/i })).toBeVisible()

    await page.getByRole('link', { name: /home/i }).first().click()
    await expect(page).toHaveURL(/\/(\?.*)?$/)
    await expect(page.getByPlaceholder(/paste a typeform url/i)).toBeVisible()
  })

  test('theme toggle cycles through modes', async ({ page }) => {
    await page.goto('/')
    const themeBtn = page.getByTitle(/theme mode|click to switch/i)
    await expect(themeBtn).toHaveText('Auto')

    await themeBtn.click()
    await expect(themeBtn).toHaveText('Light')

    await themeBtn.click()
    await expect(themeBtn).toHaveText('Dark')

    await themeBtn.click()
    await expect(themeBtn).toHaveText('Auto')
  })
})
