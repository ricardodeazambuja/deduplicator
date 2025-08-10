import { test, expect } from '@playwright/test'

test('smoke test - page loads', async ({ page }) => {
  await page.goto('/')
  
  // Wait for the page to load and check if React rendered
  await page.waitForSelector('#root')
  
  // Take a screenshot to see what's actually rendered
  await page.screenshot({ path: 'smoke-test.png', fullPage: true })
  
  // Check if there's any content in the root div
  const rootContent = await page.locator('#root').textContent()
  console.log('Root content:', rootContent)
  
  // Just check if the page doesn't crash
  expect(rootContent).toBeTruthy()
})