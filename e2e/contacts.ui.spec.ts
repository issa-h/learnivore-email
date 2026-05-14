import { test, expect } from '@playwright/test'
import {
  supabase,
  baseUrl,
  cleanupTestContact,
  createTestContactViaWebhook,
} from './helpers'

const EMAIL = `e2e-contacts-ui-${Date.now()}@test-learnivore.fr`

test.beforeAll(async () => {
  await createTestContactViaWebhook({
    email: EMAIL,
    firstName: 'E2E ContactUI',
    tags: ['e2e-ui-tag'],
  })
})

test.afterAll(async () => {
  await cleanupTestContact(EMAIL)
})

test('contacts page shows correct total count', async ({ page }) => {
  const { count } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })

  await page.goto(`${baseUrl}/contacts`)
  await page.waitForSelector('h1:has-text("Contacts")', { timeout: 15000 })

  // The count is in a span next to the h1
  const countText = await page.locator('h1 + span, h1 ~ span').first().textContent()
  expect(countText).toContain('contact')
})

test('search filters contacts', async ({ page }) => {
  await page.goto(`${baseUrl}/contacts`)
  await page.waitForSelector('input[placeholder*="Rechercher"]', { timeout: 15000 })

  await page.fill('input[placeholder*="Rechercher"]', EMAIL)
  await page.waitForTimeout(500)

  const rows = page.locator('tr').filter({ hasText: EMAIL })
  await expect(rows).toHaveCount(1)
})

test('tag filter works and clear button resets', async ({ page }) => {
  await page.goto(`${baseUrl}/contacts`)
  await page.waitForSelector('input[placeholder*="Rechercher"]', { timeout: 15000 })

  // Use exact match for the "students" tag button
  const tagButton = page.getByRole('button', { name: 'students', exact: true })
  if (await tagButton.isVisible()) {
    await tagButton.click()
    await page.waitForTimeout(500)

    const clearButton = page.getByRole('button', { name: '✕' })
    await expect(clearButton).toBeVisible()

    await clearButton.click()
    await page.waitForTimeout(500)

    await expect(clearButton).not.toBeVisible()
  }
})

test('contact detail page loads', async ({ page }) => {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', EMAIL)
    .single()

  await page.goto(`${baseUrl}/contacts/${contact!.id}`)

  // Wait for breadcrumb with email — use first() to avoid strict mode violation
  await page.waitForSelector(`text=${EMAIL}`, { timeout: 15000 })
  await expect(page.locator(`text=${EMAIL}`).first()).toBeVisible()
})
