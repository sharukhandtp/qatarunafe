import { expect, test } from '@playwright/test'
import { E2E } from './settings.mjs'
import { accounts, signIn } from './support'

// Who lands where, and who is turned away. Each role is sent to its own home, and a page
// for another role is refused rather than half-rendered.

test('a signed-out visitor is sent to sign in, then back where they were going', async ({ page }) => {
  await page.goto('/requests')
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email').fill(accounts.citizen)
  await page.getByLabel('Password', { exact: true }).fill(E2E.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/requests$/)
})

test('a wrong password is refused with a message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(accounts.resident)
  await page.getByLabel('Password', { exact: true }).fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('alert').first()).toBeVisible()
})

for (const [role, email, home] of [
  ['a citizen', accounts.citizen, /\/dashboard$/],
  ['a ministry officer', accounts.waterL1, /\/department$/],
  ['an administrator', accounts.admin, /\/admin$/],
] as const) {
  test(`${role} lands on their own home page`, async ({ page }) => {
    await signIn(page, email)
    await expect(page).toHaveURL(home)
  })
}

test('a citizen cannot open the administration pages', async ({ page }) => {
  await signIn(page, accounts.citizen)
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/forbidden/)
})

test('an officer cannot open the citizen pages', async ({ page }) => {
  await signIn(page, accounts.waterL1)
  await page.goto('/requests/new')
  await expect(page).toHaveURL(/\/forbidden/)
})
