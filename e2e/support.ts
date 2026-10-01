import { expect, type Page } from '@playwright/test'
import { E2E } from './settings.mjs'

/** The accounts the API's demo seed creates. All share E2E.password. */
export const accounts = {
  citizen: 'citizen@example.qa',
  resident: 'resident@example.qa',
  waterL1: 'l1.water@qataruna.gov',
  waterL2: 'l2.water@qataruna.gov',
  electricityL1: 'l1.electricity@qataruna.gov',
  admin: 'admin@qataruna.gov',
} as const

/** Signs in through the real login form, as a person would, and waits for the home page. */
export async function signIn(page: Page, email: string, password = E2E.password) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  // Generous: the first sign-in after the API starts pays for its warm-up.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
}

/** A string no other test (or earlier run) has used, to find "my" record in a list. */
export const unique = (label: string) => `${label} ${Date.now().toString(36)}`
