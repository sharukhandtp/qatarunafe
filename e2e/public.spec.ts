import { expect, test } from '@playwright/test'
import { accounts, signIn } from './support'

test('an unknown certificate code is reported as not genuine', async ({ page }) => {
  await page.goto('/verify/NOT-A-REAL-CODE')
  await expect(page.getByText('Not a portal certificate')).toBeVisible()
})

test('switching to Arabic turns the page right-to-left and back', async ({ page }) => {
  await signIn(page, accounts.citizen)
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

  await page.getByRole('button', { name: /Switch language/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')

  // The choice survives a reload.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.getByRole('button', { name: /Switch language|تغيير اللغة/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})
