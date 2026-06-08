import type { APIResponse } from '@playwright/test';

const MAX_ATTEMPTS = 4;
/**
 * If a 429 asks us to wait longer than this, we fail fast with a clear message
 * instead of hanging — the strict /api/auth limiter (w=900) and the
 * /api/applications limiter (w=3600) are meant to be designed around, not
 * waited out. The generous global limiter (w=60) self-heals within the cap.
 */
const MAX_WAIT_SECONDS = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryAfterSeconds(res: APIResponse): number {
  const headers = res.headers();
  const retryAfter = headers['retry-after'];
  if (retryAfter && !Number.isNaN(Number(retryAfter))) return Number(retryAfter);
  const reset = headers['ratelimit-reset'];
  if (reset && !Number.isNaN(Number(reset))) return Number(reset);
  return 1;
}

/**
 * Executes an API call and transparently retries on HTTP 429, honouring the
 * server's Retry-After / RateLimit-Reset headers (capped). Keeps the suite
 * resilient to the generous per-minute limiter without masking the strict
 * auth/application limiters, which surface as an explicit error.
 */
export async function withRateLimitRetry(
  call: () => Promise<APIResponse>,
): Promise<APIResponse> {
  let res = await call();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && res.status() === 429; attempt += 1) {
    const wait = retryAfterSeconds(res);
    if (wait > MAX_WAIT_SECONDS) {
      const policy = res.headers()['ratelimit-policy'] ?? 'unknown';
      throw new Error(
        `Rate limit hit (policy ${policy}); Retry-After ${wait}s exceeds the ${MAX_WAIT_SECONDS}s cap. ` +
          `This is the strict auth/application limiter — reduce auth calls or wait for the window to reset.`,
      );
    }
    await sleep((wait + 0.5) * 1000);
    res = await call();
  }
  return res;
}
