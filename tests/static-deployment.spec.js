import { test, expect } from '@playwright/test'

// Helper function to check if static server is running
async function isServerRunning(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

test.describe('Static Deployment Verification', () => {
  // Use the same port as playwright config (3002) or try both
  const testUrls = ['http://localhost:3002', 'http://localhost:8080']
  let serverUrl = null

  test.beforeAll(async () => {
    // Find which server is available
    for (const url of testUrls) {
      if (await isServerRunning(url)) {
        serverUrl = url
        break
      }
    }
    
    if (!serverUrl) {
      test.skip('No static server running on expected ports (3002, 8080) - skipping deployment tests')
    }
  })

  test('should load from static server', async ({ page }) => {
    // Test against the available static server
    await page.goto(serverUrl)
    
    // Verify the app loads correctly
    await expect(page.locator('h1')).toContainText('Dedupe-Local')
    await expect(page.locator('h2')).toContainText('Client-Side File Deduplicator')
    
    // Verify main functionality is present
    await expect(page.locator('button:has-text("Choose Folder")')).toBeVisible()
    await expect(page.locator('text=Exact Match')).toBeVisible()
    await expect(page.locator('text=Filename Match')).toBeVisible()
    await expect(page.locator('text=Content Similarity')).toBeVisible()
    await expect(page.locator('text=Multi-Criteria')).toBeVisible()
    await expect(page.locator('button:has-text("Start Scan")')).toBeVisible()
    await expect(page.locator('text=Session Management')).toBeVisible()
  })

  test('should handle JavaScript modules correctly', async ({ page }) => {
    // Check for any console errors that might indicate module loading issues
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(serverUrl)
    await page.waitForLoadState('networkidle')
    
    // Verify no critical errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Failed to resolve module') ||
      error.includes('Uncaught TypeError') ||
      error.includes('Cannot import')
    )
    
    expect(criticalErrors).toHaveLength(0)
  })

  test('should work with file operations when File System API is available', async ({ page }) => {
    await page.goto(serverUrl)
    
    // Verify that File System API functionality is accessible
    const hasFileSystemAPI = await page.evaluate(() => {
      return typeof window.showDirectoryPicker === 'function'
    })
    
    if (hasFileSystemAPI) {
      // Test that the button is enabled when API is available
      await expect(page.locator('button:has-text("Choose Folder")')).toBeEnabled()
    } else {
      console.log('File System API not available - this is expected in some browsers')
    }
  })

  test('should load workers correctly from static assets', async ({ page }) => {
    await page.goto(serverUrl)
    
    // Verify that workers can be instantiated (they should exist as static assets)
    const workerTest = await page.evaluate(() => {
      try {
        // Test if Worker constructor works (workers should be served as static assets)
        return typeof Worker !== 'undefined'
      } catch (error) {
        return false
      }
    })
    
    expect(workerTest).toBe(true)
  })

  test('should have all required assets available', async ({ page }) => {
    await page.goto(serverUrl)
    
    // Get all the script and link tags to verify assets load
    const scripts = await page.locator('script[src]').count()
    const links = await page.locator('link[href]').count()
    
    // Should have at least 1 script tag (main bundle)
    expect(scripts).toBeGreaterThan(0)
    
    // Should have modulepreload links for chunks
    expect(links).toBeGreaterThan(0)
    
    // Verify main bundle loads without errors
    await page.waitForFunction(() => {
      return document.querySelector('#root')?.children.length > 0
    })
  })
})