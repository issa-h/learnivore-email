import { defineConfig } from '@playwright/test'

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://learnivore-email.vercel.app',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  projects: [
    { name: 'api', testMatch: /.*\.api\.spec\.ts/ },
    { name: 'ui', testMatch: /.*\.ui\.spec\.ts/, use: { browserName: 'chromium' } },
  ],
})
