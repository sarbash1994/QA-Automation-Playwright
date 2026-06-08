import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Reads a required environment variable and fails fast with a helpful message
 * if it is missing. Keeps every test from producing a cryptic runtime error
 * when the .env file has not been set up.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env and fill in the values from /vacancy-application.html.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

const accessKey = required('X_ACCESS_KEY');

export const ENV = {
  baseURL: optional('BASE_URL', 'https://qa-a.recruitment.mediamarslab.com'),
  accessKey,
  /** The "<identifier>" half of the access key equals the applicationId. */
  applicationId: accessKey.split('.')[0],
  adminEmail: required('ADMIN_EMAIL'),
  adminPassword: required('ADMIN_PASSWORD'),
  analyticsBasicUser: optional('ANALYTICS_BASIC_USER', 'QA_USER'),
  analyticsBasicPassword: required('ANALYTICS_BASIC_PASSWORD'),
} as const;

/** Authorization header value for the analytics Basic-auth scheme. */
export function analyticsBasicAuthHeader(): string {
  const token = Buffer.from(
    `${ENV.analyticsBasicUser}:${ENV.analyticsBasicPassword}`,
  ).toString('base64');
  return `Basic ${token}`;
}
