import { test as apiTest, expect } from './test-fixtures';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminPage } from '../pages/AdminPage';
import { VacancyPage } from '../pages/VacancyPage';

interface PageFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  profilePage: ProfilePage;
  adminPage: AdminPage;
  vacancyPage: VacancyPage;
}

/**
 * E2E test object: inherits the API fixtures (api / analytics / adminApi /
 * registeredUser) so a browser test can seed state or cross-check analytics,
 * and adds a Page Object per screen.
 */
export const test = apiTest.extend<PageFixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  adminPage: async ({ page }, use) => use(new AdminPage(page)),
  vacancyPage: async ({ page }, use) => use(new VacancyPage(page)),
});

export { expect };
