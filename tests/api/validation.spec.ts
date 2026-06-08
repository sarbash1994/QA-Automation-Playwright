import { test, expect } from '../../src/fixtures/test-fixtures';
import { buildUser, uniqueEmail, uniqueTagName } from '../../src/utils/data';

const VALID_24_HEX = '0123456789abcdef01234567'; // well-formed but non-existent ObjectId

test.describe('Validation — auth @api @validation', () => {
  test('register without consent is rejected (400)', async ({ api }) => {
    const res = await api.register(buildUser({ internalAnalyticsConsent: false }));
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Internal analytics consent is required');
  });

  test('register with an empty body is rejected (400)', async ({ api }) => {
    const res = await api.register({});
    expect(res.status()).toBe(400);
  });

  test('login with empty credentials is rejected (400 Invalid credentials)', async ({ api }) => {
    const res = await api.login('', '');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Invalid credentials');
  });
});

test.describe('Validation — tags @api @validation', () => {
  test('tag without a name is rejected (400)', async ({ request, sharedUser }) => {
    const res = await request.post('/api/tags', {
      headers: { Authorization: `Bearer ${sharedUser.token}` },
      data: { color: '#EF4444' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Tag name is required');
  });

  test('tag with an invalid colour is rejected (400)', async ({ sharedUser }) => {
    const res = await sharedUser.api.createTag(uniqueTagName(), 'not-a-colour');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Invalid tag color');
  });

  test('tag without a colour is rejected (400)', async ({ request, sharedUser }) => {
    const res = await request.post('/api/tags', {
      headers: { Authorization: `Bearer ${sharedUser.token}` },
      data: { name: uniqueTagName() },
    });
    expect(res.status()).toBe(400);
  });

  test('deleting a malformed tag id is rejected (400 Invalid tag id)', async ({ sharedUser }) => {
    const res = await sharedUser.api.deleteTag('not-a-real-id');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Invalid tag id');
  });

  test('deleting a well-formed but missing tag id returns 404', async ({ sharedUser }) => {
    const res = await sharedUser.api.deleteTag(VALID_24_HEX);
    expect(res.status()).toBe(404);
    expect((await res.json()).message).toBe('Tag not found');
  });
});

test.describe('Validation — todos @api @validation', () => {
  test('empty title is rejected (400 Title is required)', async ({ sharedUser }) => {
    const res = await sharedUser.api.createTodo('');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Title is required');
  });

  test('whitespace-only title is rejected (400)', async ({ sharedUser }) => {
    const res = await sharedUser.api.createTodo('     ');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Title is required');
  });

  test('over-long title (>200 chars) is rejected (400)', async ({ sharedUser }) => {
    const res = await sharedUser.api.createTodo('x'.repeat(201));
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/too long/i);
  });

  test('updating a malformed todo id is rejected (400 Invalid todo id)', async ({ sharedUser }) => {
    const res = await sharedUser.api.updateTodo('not-a-real-id', { completed: true });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Invalid todo id');
  });

  test('updating a well-formed but missing todo id returns 404', async ({ sharedUser }) => {
    const res = await sharedUser.api.updateTodo(VALID_24_HEX, { completed: true });
    expect(res.status()).toBe(404);
    expect((await res.json()).message).toBe('Todo not found');
  });
});

test.describe('Validation — profile & password @api @validation', () => {
  test('invalid gender is rejected (400)', async ({ sharedUser }) => {
    const res = await sharedUser.api.patchProfile({ gender: '9' });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/gender must be/i);
  });

  test('empty name is rejected (400)', async ({ sharedUser }) => {
    const res = await sharedUser.api.patchProfile({ name: '' });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/non-empty string/i);
  });

  test('mismatched passwords are rejected (400 Passwords do not match)', async ({ sharedUser }) => {
    const res = await sharedUser.api.changePassword('abcdef1', 'different1');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Passwords do not match');
  });

  test('missing confirmPassword is rejected (400)', async ({ request, sharedUser }) => {
    const res = await request.post('/api/profile/password', {
      headers: { Authorization: `Bearer ${sharedUser.token}` },
      data: { newPassword: 'abcdef1' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/required/i);
  });
});

/**
 * Documented DEFECTS. These tests assert the behaviour the API *should* have;
 * they are marked test.fail() so the suite stays green while clearly flagging
 * the gap. If the server is fixed, Playwright reports an "unexpected pass",
 * prompting removal of the annotation. See README → Findings.
 */
test.describe('Validation — known defects @api @validation @defect', () => {
  test.fail(true, 'Register accepts a malformed email (returns 201 instead of 4xx).');
  test('register should reject a malformed email', async ({ api }) => {
    // Unique but malformed (no "@") so we test format validation, not a duplicate.
    const malformed = `not-an-email-${uniqueEmail('x').replace(/@.*/, '')}`;
    const res = await api.register(buildUser({ email: malformed }));
    expect(res.status(), 'malformed email should be a 4xx validation error').toBeGreaterThanOrEqual(400);
  });

  test.fail(true, 'Register accepts a password shorter than 6 chars, unlike the password-change endpoint.');
  test('register should enforce the same minimum password length as password change', async ({ api }) => {
    const res = await api.register(buildUser({ email: uniqueEmail('short'), password: '123' }));
    expect(res.status(), 'short password should be rejected').toBeGreaterThanOrEqual(400);
  });

  test.fail(true, 'Missing name yields 500 (server error) instead of a 400 validation error.');
  test('register with a missing name should return 400, not 500', async ({ api }) => {
    const res = await api.register({
      email: uniqueEmail('noname'),
      password: 'Passw0rd!23',
      gender: '0',
      internalAnalyticsConsent: true,
    });
    expect(res.status()).toBe(400);
  });

  test.fail(true, 'Invalid gender yields 500 (server error) instead of a 400 validation error.');
  test('register with an invalid gender should return 400, not 500', async ({ api }) => {
    const res = await api.register({
      name: 'Bad Gender',
      email: uniqueEmail('badgender'),
      password: 'Passw0rd!23',
      gender: '5',
      internalAnalyticsConsent: true,
    });
    expect(res.status()).toBe(400);
  });

  test.fail(true, 'Creating a todo with an invalid tagId silently succeeds (tag dropped) instead of 400.');
  test('creating a todo with an invalid tagId should be rejected', async ({ sharedUser }) => {
    const res = await sharedUser.api.createTodo('todo with bad tag', ['not-a-real-id']);
    expect(res.status(), 'invalid tagId should be a 4xx validation error').toBeGreaterThanOrEqual(400);
  });
});
