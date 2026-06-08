import { randomUUID } from 'node:crypto';
import type { Gender, NewUser } from './types';

/**
 * Test-data factories.
 *
 * Every generated email is globally unique (timestamp + random) so that runs
 * never collide with each other or with leftover data — which also lets us
 * filter analytics events down to exactly the user a test created.
 */

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter}${randomUUID().slice(0, 6)}`;
}

export function uniqueEmail(prefix = 'qa'): string {
  return `${prefix}_${uniqueSuffix()}@example.com`;
}

export function uniqueName(prefix = 'QA User'): string {
  return `${prefix} ${uniqueSuffix().slice(0, 8)}`;
}

export function uniqueTagName(prefix = 'tag'): string {
  // tag names are normalized (lowercased, '#' stripped) by the app
  return `${prefix}${uniqueSuffix().slice(0, 8)}`.toLowerCase();
}

export function strongPassword(): string {
  return `Pw!${uniqueSuffix().slice(0, 10)}A9`;
}

export function buildUser(overrides: Partial<NewUser> = {}): Required<NewUser> {
  return {
    name: uniqueName(),
    email: uniqueEmail(),
    password: strongPassword(),
    gender: '0' as Gender,
    photo: '',
    internalAnalyticsConsent: true,
    ...overrides,
  };
}
