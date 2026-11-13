import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

const DOMYSLNY_BASE_URL = 'https://sourceful-dev.outsystemscloud.com/EWI/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Na CI sekwencyjnie – współdzielone środowisko dev OutSystems.
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }], ['list']],
  use: {
    baseURL: process.env.EWI_BASE_URL || DOMYSLNY_BASE_URL,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
