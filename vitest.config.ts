import { defineConfig } from 'vitest/config'

// Unit tests: pure logic in src/, no browser and no API, so they run in a second.
// The browser suite in e2e/ is Playwright's (npm run test:e2e), not Vitest's.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
