// Shared by the Playwright config, the API launcher and the tests.
// Ports differ from the dev servers (5137 / 5173), so the suite runs alongside them.
export const E2E = {
  apiUrl: 'http://localhost:5199',
  webUrl: 'http://localhost:5174',
  password: 'Qatar#Una-E2E-2026',
}
