import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  readonly name = this.ui('profile-name');
  readonly email = this.ui('profile-email');
  readonly genderMale = this.ui('profile-gender-male');
  readonly genderFemale = this.ui('profile-gender-female');
  readonly analyticsConsent = this.ui('profile-analytics-consent');
  readonly submit = this.ui('profile-submit');
  readonly avatar = this.ui('profile-avatar');
  readonly photoInput = this.ui('profile-photo-input');
  readonly replacePhotoButton = this.ui('profile-replace-photo-button');
  readonly removePhotoButton = this.ui('profile-remove-photo-button');
  readonly toastContainer = this.ui('toast-container');

  // password modal
  readonly openPasswordModal = this.ui('profile-open-password-modal');
  readonly passwordModal = this.ui('password-modal');
  readonly passwordForm = this.ui('password-form');
  readonly newPassword = this.ui('profile-new-password');
  readonly confirmPassword = this.ui('profile-confirm-password');
  readonly passwordMessage = this.ui('password-form-message');

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/profile.html');
    await expect(this.name).toBeVisible();
  }

  async setName(value: string): Promise<void> {
    await this.name.fill(value);
  }

  async setGender(gender: '0' | '1'): Promise<void> {
    await (gender === '0' ? this.genderMale : this.genderFemale).check();
  }

  async setConsent(enabled: boolean): Promise<void> {
    await this.analyticsConsent.setChecked(enabled);
  }

  async save(): Promise<void> {
    await this.submit.click();
  }

  async uploadPhoto(filePath: string): Promise<void> {
    await this.photoInput.setInputFiles(filePath);
  }

  async changePassword(newPassword: string, confirmPassword: string): Promise<void> {
    await this.openPasswordModal.click();
    await expect(this.passwordModal).toBeVisible();
    await this.newPassword.fill(newPassword);
    await this.confirmPassword.fill(confirmPassword);
    await this.passwordForm.locator('button[type="submit"]').click();
  }

  toast(text: string): Locator {
    return this.toastContainer.getByText(text);
  }
}
