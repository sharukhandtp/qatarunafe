import { defineConfig, devices } from '@playwright/test'
import { E2E } from './e2e/settings.mjs'

// Browser end-to-end tests: a real Chromium clicking through this app, against a real API on
// a freshly seeded database. `npm run test:e2e` starts both servers and stops them afterwards.
export default defineConfig({
  testDir: './e2e',
  // One worker: the journeys share one seeded database and some read counts and queues.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E.webUrl,
    locale: 'en-GB',
    // Kept only for failures: open them with `npx playwright show-report`.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/start-api.mjs',
      url: `${E2E.apiUrl}/health/ready`,
      // Build, migrate and seed from scratch.
      timeout: 300_000,
      reuseExistingServer: process.env.E2E_REUSE === '1',
      // The API is chatty; E2E_API_LOGS=1 shows its log when a failure needs it.
      stdout: process.env.E2E_API_LOGS ? 'pipe' : 'ignore',
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      url: E2E.webUrl,
      timeout: 60_000,
      reuseExistingServer: process.env.E2E_REUSE === '1',
      env: { VITE_API_PROXY_TARGET: E2E.apiUrl },
    },
  ],
})
