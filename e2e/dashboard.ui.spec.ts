import { test, expect } from '@playwright/test'
import { supabase, baseUrl } from './helpers'

test('dashboard loads and displays correct contact count', async ({ page }) => {
  const { count } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })

  await page.goto(`${baseUrl}/dashboard`)
  await page.waitForSelector('text=Total contacts', { timeout: 15000 })

  // The stat card value is rendered in a <p> with font-mono style
  const value = await page.locator('[style*="font-variant-numeric"]').first().textContent()

  const displayed = parseInt(value!.replace(/\s/g, '').replace(/\./g, ''), 10)
  // Allow ±5 tolerance due to concurrent test contact creation/deletion
  expect(Math.abs(displayed - (count ?? 0))).toBeLessThanOrEqual(5)
})

test('dashboard shows sequence stats table', async ({ page }) => {
  await page.goto(`${baseUrl}/dashboard`)
  await page.waitForSelector('text=Stats par séquence', { timeout: 15000 })

  const table = page.locator('table')
  await expect(table).toBeVisible()

  const rows = table.locator('tbody tr')
  const rowCount = await rows.count()
  expect(rowCount).toBeGreaterThan(0)
})

test('dashboard has no critical console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto(`${baseUrl}/dashboard`)
  await page.waitForSelector('text=Total contacts', { timeout: 15000 })

  // Filter out non-critical: favicon, 404, CORS font issues
  const criticalErrors = errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('CORS') &&
      !e.includes('fonts.gstatic') &&
      !e.includes('ERR_FAILED')
  )
  expect(criticalErrors).toHaveLength(0)
})
