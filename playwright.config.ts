import { defineConfig, devices } from '@playwright/test';
/** Browser tests mock the HTTP boundary; backend tests exercise the real authorization layer. */
export default defineConfig({ testDir: './tests', fullyParallel: true, forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, reporter: 'html', use: { baseURL: 'http://localhost:3101', trace: 'on-first-retry',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {} },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: { command: 'npm run dev -- --port 3101', url: 'http://localhost:3101', reuseExistingServer: false,
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:4000', NEXT_PUBLIC_DEMO_MODE: 'true' } },
});
