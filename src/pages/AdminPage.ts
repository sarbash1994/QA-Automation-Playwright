import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  readonly loginSection = this.ui('admin-login-section');
  readonly loginForm = this.ui('admin-login-form');
  readonly email = this.ui('admin-email');
  readonly password = this.ui('admin-password');
  readonly loginError = this.ui('admin-login-error');
  readonly panel = this.ui('admin-panel');
  readonly logout = this.ui('admin-logout');
  readonly userSearch = this.ui('admin-user-search');
  readonly users = this.ui('admin-users');
  readonly pagination = this.ui('admin-pagination');

  // event JSON modal
  readonly jsonModal = this.ui('admin-json-modal');
  readonly jsonModalCode = this.ui('admin-json-modal-code');
  readonly jsonModalClose = this.ui('admin-json-modal-close');

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/admin.html');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.loginForm.locator('button[type="submit"]').click();
    await expect(this.panel).toBeVisible();
  }

  userCard(email: string): Locator {
    return this.users.locator('article').filter({ hasText: email });
  }

  async search(query: string): Promise<void> {
    await this.userSearch.fill(query);
  }

  async showFirstEventJson(email: string): Promise<void> {
    await this.userCard(email)
      .locator('[data-ui="admin-show-event-json"]')
      .first()
      .click();
    await expect(this.jsonModal).toBeVisible();
  }
}
