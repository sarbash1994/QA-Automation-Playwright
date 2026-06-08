import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class VacancyPage extends BasePage {
  readonly form = this.ui('vacancy-form');
  readonly fullName = this.ui('vacancy-full-name');
  readonly submit = this.form.locator('button[type="submit"]');
  readonly result = this.ui('vacancy-result');
  readonly accessKey = this.ui('vacancy-access-key');
  readonly adminEmail = this.ui('vacancy-admin-email');
  readonly adminPassword = this.ui('vacancy-admin-password');
  readonly error = this.ui('vacancy-error');

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/vacancy-application.html');
  }

  async apply(fullName: string): Promise<void> {
    await this.fullName.fill(fullName);
    await this.submit.click();
  }

  async expectResultVisible(): Promise<void> {
    await expect(this.result).toBeVisible();
  }
}
