import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Check that the main heading is visible
  await expect(page.locator('h1')).toContainText('Coliving Management System')
  
  // Check that the welcome message is visible
  await expect(page.locator('h2')).toContainText('Welcome to Your Property Management Dashboard')
  
  // Check that all main sections are present
  await expect(page.locator('text=Dashboard')).toBeVisible()
  await expect(page.locator('text=Payments')).toBeVisible()
  await expect(page.locator('text=Expenses')).toBeVisible()
  await expect(page.locator('text=Tenants')).toBeVisible()
})

test('navigation works correctly', async ({ page }) => {
  await page.goto('/')
  
  // Test navigation to dashboard
  await page.goto('/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')
  
  // Test navigation to payments
  await page.goto('/payments')
  await expect(page.locator('h1')).toContainText('Payments')
  
  // Test navigation to expenses
  await page.goto('/expenses')
  await expect(page.locator('h1')).toContainText('Expenses')
  
  // Test navigation to tenants
  await page.goto('/tenants')
  await expect(page.locator('h1')).toContainText('Tenants')
})
