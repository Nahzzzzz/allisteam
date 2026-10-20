import { defineConfig, devices } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
// 本机没有下载 Chromium 时，可设 PLAYWRIGHT_CHANNEL=msedge 直接用系统 Edge
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: 'npm run -w @allisteam/api dev',
          cwd: '../..',
          url: `${API_URL}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          command: 'npm run -w @allisteam/web dev',
          cwd: '../..',
          url: WEB_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ],
});
