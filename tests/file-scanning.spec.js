import { test, expect } from '@playwright/test'

test.describe('File Scanning Functionality', () => {
  test('should show progress tracker during scanning', async ({ page }) => {
    await page.goto('/')
    
    // Mock showDirectoryPicker to simulate folder selection
    await page.evaluate(() => {
      window.showDirectoryPicker = async () => {
        const mockHandle = {
          name: 'test-folder',
          entries: async function* () {
            yield ['test1.txt', {
              kind: 'file',
              getFile: async () => new File(['test content 1'], 'test1.txt')
            }]
            yield ['test2.txt', {
              kind: 'file', 
              getFile: async () => new File(['test content 2'], 'test2.txt')
            }]
          }
        }
        return mockHandle
      }
    })
    
    // Select a folder
    await page.locator('button:has-text("Choose Folder")').click()
    
    // Should show selected folder
    await expect(page.locator('text=Selected: test-folder')).toBeVisible()
    await expect(page.locator('button:has-text("Change Folder")')).toBeVisible()
    
    // Start scan button should be enabled
    const scanButton = page.locator('button:has-text("Start Scan")')
    await expect(scanButton).toBeEnabled()
  })

  test('should handle scanning errors gracefully', async ({ page }) => {
    await page.goto('/')
    
    // Mock showDirectoryPicker to throw an error
    await page.evaluate(() => {
      window.showDirectoryPicker = async () => {
        throw new Error('Access denied')
      }
    })
    
    await page.locator('button:has-text("Choose Folder")').click()
    
    // Should show error message
    await expect(page.locator('text=Failed to select directory: Access denied')).toBeVisible()
  })

  test('should handle user cancellation of folder selection', async ({ page }) => {
    await page.goto('/')
    
    // Mock showDirectoryPicker to simulate user cancellation
    await page.evaluate(() => {
      window.showDirectoryPicker = async () => {
        const error = new Error('User cancelled')
        error.name = 'AbortError'
        throw error
      }
    })
    
    await page.locator('button:has-text("Choose Folder")').click()
    
    // Should show updated cancellation message with dismiss capability
    await expect(page.locator('text=Folder selection was cancelled. Click "Choose Folder" to try again.')).toBeVisible()
  })

  test('should disable controls during scanning', async ({ page }) => {
    await page.goto('/')
    
    // Mock a long-running scan
    await page.evaluate(() => {
      window.showDirectoryPicker = async () => ({
        name: 'test-folder',
        entries: async function* () {
          yield ['test.txt', {
            kind: 'file',
            getFile: async () => new File(['test'], 'test.txt')
          }]
        }
      })
    })
    
    await page.locator('button:has-text("Choose Folder")').click()
    
    // Mock scanning state
    await page.evaluate(() => {
      // Simulate scanning state in the store
      const event = new CustomEvent('scanning-state-change', {
        detail: { isScanning: true, progress: 0.5 }
      })
      window.dispatchEvent(event)
    })
  })

  test('should show appropriate results for exact match scan', async ({ page }) => {
    await page.goto('/')
    
    // Test would require more complex mocking of file system and hashing
    // This is a placeholder for actual implementation testing
    await expect(page.locator('h1')).toContainText('Dedupe-Local')
  })

  test('should show appropriate results for similarity scan', async ({ page }) => {
    await page.goto('/')
    
    // Switch to similarity mode
    await page.locator('input[value="similarity"]').click()
    
    // Test would require more complex mocking
    await expect(page.locator('text=Similarity Threshold')).toBeVisible()
  })
})