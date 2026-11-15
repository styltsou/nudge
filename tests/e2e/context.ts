import { test as base, expect } from '@playwright/test';

// Evaluate after global setup, inside the worker; do not reuse a user's dev port.
export const test = base.extend({
  baseURL: async ({ baseURL }, use) => {
    const origin = process.env.NUDGE_E2E_ORIGIN;
    if (!origin)
      throw new Error(
        `Test origin not initialized; refusing fallback to ${baseURL}`,
      );
    await use(origin);
  },
});
export { expect };
