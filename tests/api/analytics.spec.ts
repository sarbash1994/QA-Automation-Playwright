import { test, expect } from '../../src/fixtures/test-fixtures';
import { ENV } from '../../src/config/env';
import { buildUser } from '../../src/utils/data';
import type { AnalyticsEventType, Todo } from '../../src/utils/types';

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('Internal analytics @api @analytics', () => {
  test('records a register event with name, email and numeric gender', async ({ api, analytics }) => {
    // Register only (no login needed) to observe the register event.
    const user = buildUser({ gender: '1' });
    expect((await api.register(user)).status()).toBe(201);

    const event = await analytics.waitForEvent({ email: user.email, type: 'register' });
    expect(event.status).toBe('success');
    expect(event.name).toBe(user.name);
    expect(event.gender).toBe(1); // numeric in events, string in the profile model
    expect(event.applicationId).toBe(ENV.applicationId);
  });

  test('records successful and failed login events (failed carries a reason)', async ({ api, sharedUser, analytics }) => {
    const email = sharedUser.credentials.email;
    // success event already exists from the shared user's setup login
    expect((await analytics.find({ email, type: 'login', status: 'success' })).length).toBeGreaterThanOrEqual(1);

    const before = await analytics.count({ email, type: 'login', status: 'failed' });
    await api.login(email, 'wrong-password');
    const failed = await analytics.waitForCount({ email, type: 'login', status: 'failed' }, before + 1);
    expect(failed.at(-1)?.reason).toBe('Invalid credentials');
  });

  test('records the full todo lifecycle (create / complete / edit / delete)', async ({ sharedUser, analytics }) => {
    const email = sharedUser.credentials.email;
    const types: AnalyticsEventType[] = ['todoCreate', 'todoComplete', 'todoEdit', 'todoDelete'];
    const baseline = Object.fromEntries(
      await Promise.all(types.map(async (t) => [t, await analytics.count({ email, type: t })] as const)),
    ) as Record<AnalyticsEventType, number>;

    const todo: Todo = (await (await sharedUser.api.createTodo('analytics todo')).json()).todo;
    await sharedUser.api.updateTodo(todo._id, { completed: true });
    await sharedUser.api.updateTodo(todo._id, { title: 'analytics todo v2', tagIds: [] });
    await sharedUser.api.deleteTodo(todo._id);

    for (const t of types) {
      const events = await analytics.waitForCount({ email, type: t }, baseline[t] + 1);
      expect(events.at(-1)?.status).toBe('success');
    }
  });

  test('records a photoUpload event with the stored file name', async ({ sharedUser, analytics }) => {
    const email = sharedUser.credentials.email;
    const before = await analytics.count({ email, type: 'photoUpload' });
    await sharedUser.api.uploadPhoto('myavatar.png', PNG_1x1);
    const events = await analytics.waitForCount({ email, type: 'photoUpload' }, before + 1);
    const latest = events.at(-1)!;
    expect(latest.status).toBe('success');
    expect(latest.fileName).toMatch(/\.png$/);
  });

  test('records password change success and failure (failure carries a reason)', async ({ registeredUser, analytics }) => {
    // Isolated user: changing the password must not affect the shared user.
    const email = registeredUser.credentials.email;
    await registeredUser.api.changePassword('GoodPassw0rd!', 'GoodPassw0rd!');
    await registeredUser.api.changePassword('123', '123'); // too short → failure

    const ok = await analytics.waitForEvent({ email, type: 'passwordChangeSuccess' });
    expect(ok.status).toBe('success');

    const failed = await analytics.waitForEvent({ email, type: 'passwordChangeFailed' });
    expect(failed.status).toBe('failed');
    expect(failed.reason).toMatch(/at least 6 characters/i);
  });

  test('records analyticsConsentChange with the new flag value', async ({ sharedUser, analytics }) => {
    const email = sharedUser.credentials.email;
    const before = await analytics.count({ email, type: 'analyticsConsentChange' });
    await sharedUser.api.patchProfile({ internalAnalyticsConsent: false });
    const events = await analytics.waitForCount({ email, type: 'analyticsConsentChange' }, before + 1);
    expect(events.at(-1)?.analyticsConsent).toBe(false);
    await sharedUser.api.patchProfile({ internalAnalyticsConsent: true }); // restore
  });

  test('every event carries an ISO timestamp and the application id', async ({ sharedUser, analytics }) => {
    const events = await analytics.find({ email: sharedUser.credentials.email });
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(Number.isNaN(new Date(e.timestamp).getTime())).toBeFalsy();
      expect(e.applicationId).toBe(ENV.applicationId);
    }
  });

  test('consent gating: actions are NOT recorded while consent is OFF, and ARE once re-enabled', async ({ sharedUser, analytics }) => {
    const email = sharedUser.credentials.email;
    const baseline = await analytics.count({ email, type: 'todoCreate' });

    // Turn consent OFF, then perform an action that would normally be logged.
    await sharedUser.api.patchProfile({ internalAnalyticsConsent: false });
    await sharedUser.api.createTodo('should-not-be-recorded');
    await new Promise((r) => setTimeout(r, 1500));
    expect(await analytics.count({ email, type: 'todoCreate' })).toBe(baseline);

    // Re-enable consent and confirm the action is now recorded.
    await sharedUser.api.patchProfile({ internalAnalyticsConsent: true });
    await sharedUser.api.createTodo('should-be-recorded');
    const events = await analytics.waitForCount({ email, type: 'todoCreate' }, baseline + 1);
    expect(events.at(-1)?.status).toBe('success');
  });
});
