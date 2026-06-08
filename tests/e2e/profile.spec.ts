import { test, expect } from '../../src/fixtures/e2e-fixtures';
import { uniqueName } from '../../src/utils/data';

test.describe('Profile E2E @e2e', () => {
  test.beforeEach(async ({ profilePage, sharedUser }) => {
    await profilePage.seedToken(sharedUser.token);
    await profilePage.open();
  });

  test('updates the display name and saves', async ({ page, profilePage }) => {
    await profilePage.setName(uniqueName('UI Name'));
    await profilePage.save();
    await expect(page).toHaveURL(/dashboard\.html/); // app redirects on successful save
  });

  test('changes the password through the modal', async ({ profilePage }) => {
    await profilePage.changePassword('UiPassw0rd!1', 'UiPassw0rd!1');
    await expect(profilePage.toast('Пароль обновлён')).toBeVisible();
  });

  test('shows an inline error when passwords do not match', async ({ profilePage }) => {
    await profilePage.changePassword('aaa111', 'bbb222');
    await expect(profilePage.passwordMessage).toContainText('Пароли не совпадают');
  });

  test('toggles the analytics-consent switch and saves', async ({ page, profilePage, sharedUser }) => {
    await profilePage.setConsent(false);
    await profilePage.save();
    await expect(page).toHaveURL(/dashboard\.html/);
    // Restore consent via the API (reliable) so shared-user analytics keeps recording.
    await sharedUser.api.patchProfile({ internalAnalyticsConsent: true });
  });
});
