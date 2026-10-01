import { expect, test, type Page } from '@playwright/test'
import { accounts, signIn, signOut, unique } from './support'

// The portal's main promise, end to end: a citizen applies, the ministry reviews and
// delivers, and the citizen sees the outcome - across three roles, through the real UI.

async function applyForWaterMeter(page: Page, title: string) {
  await page.goto('/requests/new')
  await page.getByRole('searchbox').fill('water meter')
  await page.getByRole('button', { name: /New water meter installation/ }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Description').fill('Opened by the browser end-to-end suite.')
  await page.getByRole('button', { name: 'Submit request' }).click()
  await expect(page.getByText('Request submitted')).toBeVisible()
  await expect(page).toHaveURL(/\/requests\/[0-9a-f-]{36}$/)
}

async function openCase(page: Page, title: string) {
  await page.goto('/department/queue')
  await page.getByRole('row', { name: title }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
}

test('a citizen request is approved, delivered and shown as completed', async ({ page }) => {
  const title = unique('Meter for villa')

  await signIn(page, accounts.citizen)
  await applyForWaterMeter(page, title)
  await expect(page.getByText('Awaiting L1 review').first()).toBeVisible()
  await signOut(page)

  // The service needs only L1 sign-off, so the intake officer's approval is final.
  await signIn(page, accounts.waterL1)
  await openCase(page, title)
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByText('Approval recorded')).toBeVisible()

  await page.getByRole('button', { name: 'Mark service delivered' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mark completed' }).click()
  await expect(page.getByText('Case completed')).toBeVisible()
  await signOut(page)

  await signIn(page, accounts.citizen)
  await page.goto('/requests')
  await page.getByRole('row', { name: title }).click()
  await expect(page.getByText('Completed').first()).toBeVisible()
})

test('another ministry cannot see the case', async ({ page }) => {
  const title = unique('Private water case')

  await signIn(page, accounts.citizen)
  await applyForWaterMeter(page, title)
  const caseUrl = page.url().replace('/requests/', '/department/cases/')
  await signOut(page)

  await signIn(page, accounts.electricityL1)
  await page.goto('/department/queue')
  await expect(page.getByRole('row', { name: title })).toHaveCount(0)

  // Not even by guessing the address: the API reports it as absent, not as forbidden.
  await page.goto(caseUrl)
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0)
})

test('a rejected request tells the citizen why', async ({ page }) => {
  const title = unique('Meter to be rejected')
  const reason = 'The address is not registered to the applicant.'

  await signIn(page, accounts.citizen)
  await applyForWaterMeter(page, title)
  await signOut(page)

  await signIn(page, accounts.waterL1)
  await openCase(page, title)
  await page.getByRole('button', { name: 'Reject' }).click()
  await page.getByRole('dialog').getByLabel('Reason for the applicant').fill(reason)
  await page.getByRole('dialog').getByRole('button', { name: 'Reject' }).click()
  await expect(page.getByText('Request rejected')).toBeVisible()
  await signOut(page)

  await signIn(page, accounts.citizen)
  await page.goto('/requests')
  await page.getByRole('row', { name: title }).click()
  await expect(page.getByText('Rejected').first()).toBeVisible()
  await expect(page.getByText(reason)).toBeVisible()
})
