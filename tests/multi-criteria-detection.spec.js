import { test, expect } from '@playwright/test'

test.describe('Multi-Criteria Detection', () => {
  test('should show multi-criteria scan mode option', async ({ page }) => {
    await page.goto('/')
    
    // Check if multi-criteria mode is available
    await expect(page.locator('input[value="multi-criteria"]')).toBeVisible()
    
    // Check the label and description
    await expect(page.locator('text=Multi-Criteria')).toBeVisible()
    await expect(page.locator('text=Advanced: Combine filename, exact, and similarity detection')).toBeVisible()
  })

  test('should show multi-criteria settings when multi-criteria mode is selected', async ({ page }) => {
    await page.goto('/')
    
    // Switch to multi-criteria mode
    await page.locator('input[value="multi-criteria"]').click()
    
    // Check if multi-criteria settings accordion is visible
    await expect(page.locator('text=Multi-Criteria Settings')).toBeVisible()
    
    // The multi-criteria settings accordion should be present
    await expect(page.locator('text=Multi-Criteria Settings').locator('..')).toBeVisible()
  })

  test('should show detection methods when multi-criteria settings expanded', async ({ page }) => {
    await page.goto('/')
    
    // Switch to multi-criteria mode
    await page.locator('input[value="multi-criteria"]').click()
    
    // The accordion should be visible
    await expect(page.locator('text=Multi-Criteria Settings')).toBeVisible()
    
    // Expand the multi-criteria settings accordion specifically
    await page.locator('text=Multi-Criteria Settings').click()
    
    // Wait for the accordion to expand
    await page.waitForTimeout(500)
    
    // Check for detection methods section - use the heading specifically
    await expect(page.locator('h6:has-text("Detection Methods")')).toBeVisible()
    
    // Check for method descriptions - be more specific to avoid duplicate matches
    await expect(page.locator('.MuiFormGroup-root').locator('text=Identical files (SHA-256 hash match)')).toBeVisible()
    await expect(page.locator('.MuiFormGroup-root').locator('text=Similar filenames (ignoring copies, versions)')).toBeVisible() 
    await expect(page.locator('.MuiFormGroup-root').locator('text=Similar content (MinHash algorithm)')).toBeVisible()
  })

  test('should show priority order controls when multi-criteria settings expanded', async ({ page }) => {
    await page.goto('/')
    
    // Switch to multi-criteria mode
    await page.locator('input[value="multi-criteria"]').click()
    
    // Expand the multi-criteria settings accordion specifically  
    await page.locator('text=Multi-Criteria Settings').click()
    
    // Wait for the accordion to expand
    await page.waitForTimeout(500)
    
    // Check for priority order section
    await expect(page.locator('text=Priority Order')).toBeVisible()
    
    // Check for priority order controls - use the actual text from the component
    await expect(page.locator('text=Use arrows to reorder detection methods by priority (highest first)')).toBeVisible()
    
    // Should see at least some priority order items (they're dynamically generated)
    const listItems = page.locator('.MuiListItem-root')
    await expect(listItems.first()).toBeVisible()
  })

  test('should show detection weights when multi-criteria settings expanded', async ({ page }) => {
    await page.goto('/')
    
    // Switch to multi-criteria mode
    await page.locator('input[value="multi-criteria"]').click()
    
    // Expand the settings
    await page.locator('text=Multi-Criteria Settings').click()
    
    // Check for weights section
    await expect(page.locator('text=Detection Weights')).toBeVisible()
    
    // Should have weight sliders
    await expect(page.locator('text=Exact Weight')).toBeVisible()
    await expect(page.locator('text=Filename Weight')).toBeVisible()
    await expect(page.locator('text=Similarity Weight')).toBeVisible()
  })

  test('should have default criteria enabled', async ({ page }) => {
    await page.goto('/')
    
    // Switch to multi-criteria mode
    await page.locator('input[value="multi-criteria"]').click()
    
    // Expand the settings
    await page.locator('text=Multi-Criteria Settings').click()
    
    // Check default selections (exact and filename should be enabled by default)
    const exactCheckbox = page.locator('input[type="checkbox"]').first()
    const filenameCheckbox = page.locator('input[type="checkbox"]').nth(1)
    
    await expect(exactCheckbox).toBeChecked()
    await expect(filenameCheckbox).toBeChecked()
  })

  test('should not show other threshold controls when multi-criteria is selected', async ({ page }) => {
    await page.goto('/')
    
    // Switch to multi-criteria mode
    await page.locator('input[value="multi-criteria"]').click()
    
    // Regular similarity and filename threshold controls should not be visible
    await expect(page.locator('text=Similarity Threshold').first()).not.toBeVisible()
    await expect(page.locator('text=Filename Similarity Threshold').first()).not.toBeVisible()
    
    // But multi-criteria settings should be visible
    await expect(page.locator('text=Multi-Criteria Settings')).toBeVisible()
  })

  test('should allow toggling detection methods', async ({ page }) => {
    await page.goto('/')
    
    // Switch to multi-criteria mode
    await page.locator('input[value="multi-criteria"]').click()
    
    // Expand the settings
    await page.locator('text=Multi-Criteria Settings').click()
    
    // Find checkboxes (assuming order: exact, filename, similarity)
    const checkboxes = page.locator('input[type="checkbox"]')
    
    // Toggle similarity checkbox (should be unchecked by default)
    const similarityCheckbox = checkboxes.nth(2)
    await similarityCheckbox.click()
    
    // It should now be checked
    await expect(similarityCheckbox).toBeChecked()
  })
})