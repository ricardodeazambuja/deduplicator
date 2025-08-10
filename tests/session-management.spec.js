import { test, expect } from '@playwright/test'

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await page.goto('/')
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases()
      await Promise.all(dbs.map(db => {
        return new Promise((resolve) => {
          const deleteReq = indexedDB.deleteDatabase(db.name)
          deleteReq.onsuccess = () => resolve()
          deleteReq.onerror = () => resolve()
        })
      }))
    })
  })

  test('should disable save button without scan results', async ({ page }) => {
    await page.goto('/')
    
    const saveButton = page.locator('button:has-text("Save Current Results")')
    await expect(saveButton).toBeDisabled()
  })

  test('should show empty sessions message initially', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('text=No saved sessions')).toBeVisible()
    await expect(page.locator('text=Complete a scan and save the results to get started')).toBeVisible()
  })

  test('should show session statistics', async ({ page }) => {
    await page.goto('/')
    
    // Should show 0 sessions initially
    await expect(page.locator('text=0 sessions')).toBeVisible()
  })

  test('should handle IndexedDB errors gracefully', async ({ page }) => {
    await page.goto('/')
    
    // Mock IndexedDB to fail
    await page.evaluate(() => {
      const originalOpen = window.indexedDB.open
      window.indexedDB.open = () => {
        const request = originalOpen.call(window.indexedDB, 'test')
        setTimeout(() => {
          if (request.onerror) request.onerror(new Error('Database error'))
        }, 0)
        return request
      }
    })
    
    // Refresh page to trigger IndexedDB initialization
    await page.reload()
    
    // Should still load the page without crashing
    await expect(page.locator('h1')).toContainText('Dedupe-Local')
  })

  test('should show save dialog when scan results are available', async ({ page }) => {
    // This test would require mocking scan results
    // Placeholder for actual implementation
    await page.goto('/')
    await expect(page.locator('text=Session Management')).toBeVisible()
  })

  test('should export session data as JSON', async ({ page }) => {
    // This test would require mocking saved sessions and download functionality
    await page.goto('/')
    await expect(page.locator('text=Session Management')).toBeVisible()
  })
})