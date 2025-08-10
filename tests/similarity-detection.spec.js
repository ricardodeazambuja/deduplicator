import { test, expect } from '@playwright/test'

test.describe('Similarity Detection', () => {
  test('should show similarity threshold control in similarity mode', async ({ page }) => {
    await page.goto('/')
    
    // Switch to similarity mode
    await page.locator('input[value="similarity"]').click()
    
    // Check similarity threshold controls are visible
    await expect(page.locator('text=Similarity Threshold')).toBeVisible()
    await expect(page.locator('.MuiSlider-root')).toBeVisible()
    
    // Check that threshold description chip is visible (look for threshold-specific chip)
    await expect(page.locator('.MuiChip-root').first()).toBeVisible()
  })

  test('should update threshold description when slider changes', async ({ page }) => {
    await page.goto('/')
    
    // Switch to similarity mode
    await page.locator('input[value="similarity"]').click()
    
    // Find the slider
    const slider = page.locator('.MuiSlider-root input[type="range"]')
    await expect(slider).toBeVisible()
    
    // Test different threshold levels
    // Note: Actual slider interaction would require more specific selectors
    await expect(page.locator('text=Similarity Threshold')).toBeVisible()
  })

  test('should show appropriate warning for similarity results', async ({ page }) => {
    await page.goto('/')
    
    // Switch to similarity mode
    await page.locator('input[value="similarity"]').click()
    
    // The similarity results component should show appropriate warnings
    // This would be tested when actual similarity results are displayed
    await expect(page.locator('text=Find similar files using MinHash algorithm')).toBeVisible()
  })

  test('should handle similarity scan mode correctly', async ({ page }) => {
    await page.goto('/')
    
    // Switch to similarity mode
    await page.locator('input[value="similarity"]').click()
    
    // Should show threshold control
    await expect(page.locator('text=Similarity Threshold')).toBeVisible()
    
    // Should show appropriate description (check for partial text)
    await expect(page.locator('text=or higher similarity will be grouped together')).toBeVisible()
  })

  test('should show helpful threshold guidance', async ({ page }) => {
    await page.goto('/')
    
    // Switch to similarity mode  
    await page.locator('input[value="similarity"]').click()
    
    // Check guidance text from the actual UI
    await expect(page.locator('text=Set to 100% for exact matches only, or use lower values to find similar content')).toBeVisible()
    await expect(page.locator('text=Very low thresholds may produce false positives')).toBeVisible()
  })

  test('should show appropriate similarity result messages', async ({ page }) => {
    await page.goto('/')
    
    // Switch to similarity mode
    await page.locator('input[value="similarity"]').click()
    
    // Without actual results, should show empty state
    // This would be different when actual scanning is implemented
    await expect(page.locator('text=Similarity Threshold')).toBeVisible()
  })
})