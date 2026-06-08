import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Stable locator by the app's data-ui hook (immune to the noise.js id/class scrambling). */
  protected ui(name: string): Locator {
    return this.page.locator(`[data-ui="${name}"]`);
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Seeds an auth token into localStorage so a test can land on an authed page
   * without driving the full login UI every time. `key` is 'token' for users
   * and 'adminToken' for admins.
   *
   * Done as a ONE-TIME set (not addInitScript): the login page is opened first
   * to establish the origin, then the token is written once. Using an init
   * script would re-inject the token on every navigation and silently undo a
   * logout, so it is deliberately avoided here.
   */
  async seedToken(token: string, key: 'token' | 'adminToken' = 'token'): Promise<void> {
    await this.page.goto('/index.html'); // no token yet → stays on login
    await this.page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [key, token] as const);
  }
}
