import type { APIRequestContext } from '@playwright/test';
import { analyticsBasicAuthHeader } from '../config/env';
import { withRateLimitRetry } from './http';
import type { AnalyticsEvent, AnalyticsEventType } from '../utils/types';

export interface EventFilter {
  email?: string;
  type?: AnalyticsEventType;
  status?: 'success' | 'failed';
  /** Only events at/after this ISO time (used to ignore pre-existing events). */
  since?: string;
}

/**
 * Client for GET /api/analytics/events.
 *
 * Requires BOTH auth schemes simultaneously:
 *   - X-Access-Key  (already attached at the context level)
 *   - HTTP Basic    (added per request here)
 *
 * The endpoint returns all events for the application from the last 24h, so
 * helpers here filter by the unique test email to stay isolated and resilient.
 */
export class AnalyticsClient {
  constructor(private readonly request: APIRequestContext) {}

  /** Raw call — exposed so auth-negative tests can inspect status directly. */
  rawEvents(headers?: Record<string, string>) {
    return this.request.get('/api/analytics/events', { headers });
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    const res = await withRateLimitRetry(() =>
      this.request.get('/api/analytics/events', {
        headers: { Authorization: analyticsBasicAuthHeader() },
      }),
    );
    if (!res.ok()) {
      throw new Error(`GET /api/analytics/events failed: HTTP ${res.status()}`);
    }
    return (await res.json()) as AnalyticsEvent[];
  }

  private matches(e: AnalyticsEvent, f: EventFilter): boolean {
    if (f.email && e.email !== f.email) return false;
    if (f.type && e.type !== f.type) return false;
    if (f.status && e.status !== f.status) return false;
    if (f.since && new Date(e.timestamp).getTime() < new Date(f.since).getTime()) return false;
    return true;
  }

  async find(filter: EventFilter): Promise<AnalyticsEvent[]> {
    const events = await this.getEvents();
    return events.filter((e) => this.matches(e, filter));
  }

  /**
   * Polls until at least one event matching the filter appears.
   * Events are written asynchronously, so a short poll removes timing flakiness.
   */
  async waitForEvent(
    filter: EventFilter,
    opts: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<AnalyticsEvent> {
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const intervalMs = opts.intervalMs ?? 500;
    const deadline = Date.now() + timeoutMs;
    let last: AnalyticsEvent[] = [];

    while (Date.now() < deadline) {
      last = await this.find(filter);
      if (last.length > 0) return last[last.length - 1];
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(
      `No analytics event matched ${JSON.stringify(filter)} within ${timeoutMs}ms`,
    );
  }

  /** Counts events matching a filter (used to assert consent-gated suppression). */
  async count(filter: EventFilter): Promise<number> {
    return (await this.find(filter)).length;
  }

  /**
   * Polls until at least `atLeast` events match the filter, then returns them.
   * Comparing against a baseline count (instead of a wall-clock `since`) makes
   * shared-user assertions immune to client/server clock skew.
   */
  async waitForCount(
    filter: EventFilter,
    atLeast: number,
    opts: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<AnalyticsEvent[]> {
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const intervalMs = opts.intervalMs ?? 500;
    const deadline = Date.now() + timeoutMs;
    let matches: AnalyticsEvent[] = [];

    while (Date.now() < deadline) {
      matches = await this.find(filter);
      if (matches.length >= atLeast) return matches;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(
      `Expected >= ${atLeast} events matching ${JSON.stringify(filter)}, got ${matches.length} within ${timeoutMs}ms`,
    );
  }
}
