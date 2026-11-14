import { chromium, defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const installedChrome =
  process.platform === 'win32' &&
  existsSync(
    resolve(
      process.env.ProgramFiles ?? 'C:/Program Files',
      'Google/Chrome/Application/chrome.exe',
    ),
  );
const useChrome =
  process.env.NUDGE_BROWSER_CHANNEL === 'chrome' ||
  (!process.env.NUDGE_BROWSER_CHANNEL &&
    !existsSync(chromium.executablePath()) &&
    installedChrome);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  globalSetup: './tests/e2e/setup.ts',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    ...(useChrome ? { channel: 'chrome' } : {}),
  },
});
