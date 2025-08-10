import { test, expect } from '@playwright/test'

test.describe('Filename Detection', () => {
  test('should show filename scan mode option', async ({ page }) => {
    await page.goto('/')
    
    // Check if filename mode is available
    await expect(page.locator('input[value="filename"]')).toBeVisible()
    
    // Check the label and description
    await expect(page.locator('text=Filename Match')).toBeVisible()
    await expect(page.locator('text=Find files with similar names')).toBeVisible()
  })

  test('should show filename threshold control when filename mode is selected', async ({ page }) => {
    await page.goto('/')
    
    // Switch to filename mode
    await page.locator('input[value="filename"]').click()
    
    // Check if filename matching mode control is visible
    await expect(page.locator('text=Filename Matching Mode')).toBeVisible()
    
    // Check for mode buttons - should default to 'smart'
    await expect(page.locator('button[value="exact"]')).toBeVisible()
    await expect(page.locator('button[value="exact-base"]')).toBeVisible()
    await expect(page.locator('button[value="smart"]')).toBeVisible()
    await expect(page.locator('button[value="fuzzy"]')).toBeVisible()
  })

  test('should show only filename threshold when filename mode is selected', async ({ page }) => {
    await page.goto('/')
    
    // Switch to filename mode
    await page.locator('input[value="filename"]').click()
    
    // Only filename matching mode should be visible (not content similarity threshold)
    await expect(page.locator('text=Filename Matching Mode')).toBeVisible()
    await expect(page.locator('text=Content Similarity Threshold')).not.toBeVisible()
    
    // Check that we see filename mode descriptions
    await expect(page.locator('text=Choose how strictly filenames should be matched')).toBeVisible()
  })

  test('should allow adjusting filename modes', async ({ page }) => {
    await page.goto('/')
    
    // Switch to filename mode
    await page.locator('input[value="filename"]').click()
    
    // Switch to fuzzy mode which should show the threshold slider
    await page.locator('button[value="fuzzy"]').click()
    
    // Now fuzzy mode should show a threshold slider
    await expect(page.locator('text=Fuzzy Matching Threshold')).toBeVisible()
    const slider = page.locator('.MuiSlider-root input[type="range"]')
    await expect(slider).toBeVisible()
    
    // Switch back to exact mode - no slider should be visible
    await page.locator('button[value="exact"]').click()
    await expect(page.locator('text=Exact Match Only')).toBeVisible()
    await expect(page.locator('.MuiSlider-root')).not.toBeVisible()
  })

  test('should show appropriate description for filename detection', async ({ page }) => {
    await page.goto('/')
    
    // Switch to filename mode
    await page.locator('input[value="filename"]').click()
    
    // Check for filename-specific descriptions in the mode control
    await expect(page.locator('text=Choose how strictly filenames should be matched')).toBeVisible()
    
    // Check for mode-specific descriptions
    await expect(page.locator('text=Smart Pattern Matching')).toBeVisible() // default mode
  })

  test('should maintain filename mode selection when switching back and forth', async ({ page }) => {
    await page.goto('/')
    
    // Switch to filename mode
    await page.locator('input[value="filename"]').click()
    await expect(page.locator('input[value="filename"]')).toBeChecked()
    
    // Switch to exact mode
    await page.locator('input[value="exact"]').click()
    await expect(page.locator('input[value="exact"]')).toBeChecked()
    
    // Switch back to filename mode
    await page.locator('input[value="filename"]').click()
    await expect(page.locator('input[value="filename"]')).toBeChecked()
    
    // Filename matching mode should still be visible
    await expect(page.locator('text=Filename Matching Mode')).toBeVisible()
  })
})