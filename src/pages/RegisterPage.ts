import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { NewUser } from '../utils/types';

export class RegisterPage extends BasePage {
  readonly form = this.ui('register-form');
  readonly name = this.ui('register-name');
  readonly email = this.ui('register-email');
  readonly gender = this.ui('register-gender');
  readonly password = this.ui('register-password');
  readonly photo = this.ui('register-photo');
  readonly analyticsConsent = this.ui('register-analytics-consent');
  readonly submit = this.form.locator('button[type="submit"]');

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/register.html');
  }

  async register(user: Pick<NewUser, 'name' | 'email' | 'gender' | 'password'> & { consent?: boolean }): Promise<void> {
    await this.name.fill(user.name);
    await this.email.fill(user.email);
    await this.gender.selectOption(user.gender);
    await this.password.fill(user.password);
    // The app refuses to submit unless the consent box is checked.
    if (user.consent ?? true) {
      await this.analyticsConsent.check();
    }
    await this.submit.click();
  }
}
