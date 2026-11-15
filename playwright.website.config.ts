import { defineConfig } from '@playwright/test';
import demoConfig from './playwright.config';

export default defineConfig({
  testDir: './tests/website',
  fullyParallel: false,
  workers: 1,
  globalSetup: './tests/website/setup.ts',
  use: { ...demoConfig.use, baseURL: 'http://localhost:4322' },
});
