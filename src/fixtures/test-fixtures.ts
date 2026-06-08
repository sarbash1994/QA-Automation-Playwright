import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { ApiClient } from '../api/ApiClient';
import { AnalyticsClient } from '../api/AnalyticsClient';
import { ENV } from '../config/env';
import { buildUser } from '../utils/data';
import type { NewUser, UserProfile } from '../utils/types';

/** A user with a ready-to-use authenticated client. */
export interface RegisteredUser {
  credentials: Required<NewUser>;
  token: string;
  profile: UserProfile;
  api: ApiClient;
}

/**
 * Registers a user, logs in and returns an authenticated client + profile.
 * Each call costs 2 requests against the strict /api/auth limiter (40 / 900s),
 * so prefer the worker-scoped `sharedUser` fixture for non-destructive tests
 * and reserve fresh users (via this helper or `registeredUser`) for cases that
 * truly need isolation.
 */
export async function createUser(
  ctx: APIRequestContext,
  overrides: Partial<NewUser> = {},
): Promise<RegisteredUser> {
  const credentials = buildUser(overrides);
  const anon = new ApiClient(ctx);

  const registerRes = await anon.register({
    name: credentials.name,
    email: credentials.email,
    gender: credentials.gender,
    password: credentials.password,
    photo: credentials.photo,
    internalAnalyticsConsent: credentials.internalAnalyticsConsent,
  });
  expect(registerRes.status(), 'register should return 201').toBe(201);

  const loginRes = await anon.login(credentials.email, credentials.password);
  expect(loginRes.ok(), 'login after register should succeed').toBeTruthy();
  const { token } = (await loginRes.json()) as { token: string };

  const api = anon.withToken(token);
  const profile = ((await (await api.getProfile()).json()) as { user: UserProfile }).user;

  return { credentials, token, profile, api };
}

interface WorkerFixtures {
  /** Worker-scoped request context carrying the X-Access-Key gate header. */
  apiContext: APIRequestContext;
  /** Authenticated administrator client (one login per worker). */
  adminApi: ApiClient;
  /** A single shared standard user reused across non-destructive tests. */
  sharedUser: RegisteredUser;
}

interface TestFixtures {
  /** Unauthenticated client (X-Access-Key only) for negative/auth tests. */
  api: ApiClient;
  /** Analytics reader (X-Access-Key + Basic auth). */
  analytics: AnalyticsClient;
  /** A fresh, isolated user created for a single test (costs auth budget). */
  registeredUser: RegisteredUser;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  apiContext: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({
        baseURL: ENV.baseURL,
        extraHTTPHeaders: { 'X-Access-Key': ENV.accessKey },
      });
      await use(ctx);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],

  adminApi: [
    async ({ apiContext }, use) => {
      const client = new ApiClient(apiContext);
      const res = await client.login(ENV.adminEmail, ENV.adminPassword);
      expect(res.ok(), 'admin login should succeed').toBeTruthy();
      const { token, role } = (await res.json()) as { token: string; role: string };
      expect(role, 'admin account should have admin role').toBe('admin');
      await use(client.withToken(token));
    },
    { scope: 'worker' },
  ],

  sharedUser: [
    async ({ apiContext }, use) => {
      await use(await createUser(apiContext));
    },
    { scope: 'worker' },
  ],

  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  analytics: async ({ request }, use) => {
    await use(new AnalyticsClient(request));
  },

  registeredUser: async ({ request }, use) => {
    await use(await createUser(request));
  },
});

export { expect };
