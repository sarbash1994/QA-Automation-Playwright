import { test, expect } from '../../src/fixtures/e2e-fixtures';
import { buildUser, uniqueEmail } from '../../src/utils/data';

test.describe('Auth E2E @e2e', () => {
  test('registers via the UI and lands on the dashboard', async ({ page, registerPage }) => {
    const user = buildUser();
    await registerPage.open();
    await registerPage.register({
      name: user.name,
      email: user.email,
      gender: user.gender,
      password: user.password,
    });
    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(page.locator('[data-ui="todo-form"]')).toBeVisible();
  });

  test('logs in via the UI with valid credentials', async ({ page, loginPage, sharedUser }) => {
    await loginPage.open();
    await loginPage.login(sharedUser.credentials.email, sharedUser.credentials.password);
    await expect(page).toHaveURL(/dashboard\.html/);
  });

  test('does not authenticate with invalid credentials', async ({ page, loginPage }) => {
    await loginPage.open();
    await loginPage.login(uniqueEmail('nobody'), 'wrong-pass');
    await expect(page).toHaveURL(/index\.html/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('logout returns to the login page', async ({ page, dashboardPage, sharedUser }) => {
    await dashboardPage.seedToken(sharedUser.token);
    await dashboardPage.open();
    await dashboardPage.logout();
    await expect(page).toHaveURL(/index\.html/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('unauthenticated dashboard access redirects to login', async ({ page }) => {
    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/index\.html/);
  });
});
