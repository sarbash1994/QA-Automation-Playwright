import { test, expect } from '../../src/fixtures/test-fixtures';
import { uniqueName } from '../../src/utils/data';
import type { UserProfile } from '../../src/utils/types';

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('Profile API @api', () => {
  test('returns the current profile', async ({ sharedUser }) => {
    const res = await sharedUser.api.getProfile();
    expect(res.ok()).toBeTruthy();
    const user: UserProfile = (await res.json()).user;
    expect(user.email).toBe(sharedUser.credentials.email);
    expect(user.applicationId).toBeTruthy();
  });

  test('updates name and gender', async ({ sharedUser }) => {
    const newName = uniqueName('Renamed');
    const res = await sharedUser.api.patchProfile({ name: newName, gender: '1' });
    expect(res.ok()).toBeTruthy();
    const user: UserProfile = (await res.json()).user;
    expect(user.name).toBe(newName);
    expect(user.gender).toBe('1');
  });

  test('toggles the analytics consent flag', async ({ sharedUser }) => {
    const off: UserProfile = (await (await sharedUser.api.patchProfile({ internalAnalyticsConsent: false })).json()).user;
    expect(off.internalAnalyticsConsent).toBe(false);
    const on: UserProfile = (await (await sharedUser.api.patchProfile({ internalAnalyticsConsent: true })).json()).user;
    expect(on.internalAnalyticsConsent).toBe(true); // restored to ON for later tests
  });

  test('uploads an avatar and returns its URL', async ({ sharedUser }) => {
    const res = await sharedUser.api.uploadPhoto('avatar.png', PNG_1x1);
    expect(res.ok()).toBeTruthy();
    const user: UserProfile = (await res.json()).user;
    expect(user.photo).toMatch(/\.png$/);
  });

  // Password change uses an isolated user so it never alters the shared user's
  // credentials (which other tests log in with).
  test('changes password successfully and rejects a too-short password', async ({ registeredUser, api }) => {
    const newPassword = 'BrandNewPw!9';
    const ok = await registeredUser.api.changePassword(newPassword, newPassword);
    expect(ok.ok()).toBeTruthy();

    // the new password actually works for a fresh login
    const login = await api.login(registeredUser.credentials.email, newPassword);
    expect(login.ok()).toBeTruthy();

    const weak = await registeredUser.api.changePassword('123', '123');
    expect(weak.status()).toBe(400);
    expect((await weak.json()).message).toMatch(/at least 6 characters/i);
  });
});
