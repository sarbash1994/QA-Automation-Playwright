import { test, expect } from '../../src/fixtures/e2e-fixtures';
import { ENV } from '../../src/config/env';

test.describe('Admin E2E @e2e', () => {
  test('admin logs in, finds a user and inspects an event payload', async ({ adminPage, sharedUser }) => {
    await adminPage.open();
    await adminPage.login(ENV.adminEmail, ENV.adminPassword);
    await expect(adminPage.panel).toBeVisible();

    // The shared user (created via API in this run) should be discoverable.
    await adminPage.search(sharedUser.credentials.email);
    await expect(adminPage.userCard(sharedUser.credentials.email)).toBeVisible();

    // Open the JSON payload of one of that user's analytics events.
    await adminPage.showFirstEventJson(sharedUser.credentials.email);
    await expect(adminPage.jsonModalCode).toContainText('"type"');
  });

  test('rejects admin login with wrong credentials', async ({ adminPage }) => {
    await adminPage.open();
    await adminPage.email.fill(ENV.adminEmail);
    await adminPage.password.fill('wrong-password');
    await adminPage.loginForm.locator('button[type="submit"]').click();
    await expect(adminPage.loginError).toBeVisible();
  });
});
