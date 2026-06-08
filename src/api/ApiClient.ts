import type { APIRequestContext, APIResponse } from '@playwright/test';
import { withRateLimitRetry } from './http';

/**
 * Thin, typed wrapper over a Playwright APIRequestContext.
 *
 * The X-Access-Key gate header is supplied once at the context level
 * (see playwright.config.ts → use.extraHTTPHeaders), so this client only has to
 * deal with the application's own Bearer-token auth.
 *
 * Every call is funnelled through withRateLimitRetry() so the suite rides out
 * the generous per-minute limiter automatically. Methods return the raw
 * APIResponse so tests stay in full control of status / header / body
 * assertions (essential for negative cases).
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private token?: string,
  ) {}

  withToken(token: string): ApiClient {
    return new ApiClient(this.request, token);
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(extra ?? {}),
    };
  }

  // ----- auth -------------------------------------------------------------
  register(body: Record<string, unknown>): Promise<APIResponse> {
    return withRateLimitRetry(() => this.request.post('/api/auth/register', { data: body }));
  }

  login(email: string, password: string): Promise<APIResponse> {
    return withRateLimitRetry(() => this.request.post('/api/auth/login', { data: { email, password } }));
  }

  logout(): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.post('/api/auth/logout', { headers: this.authHeaders(), data: {} }),
    );
  }

  // ----- profile ----------------------------------------------------------
  getProfile(): Promise<APIResponse> {
    return withRateLimitRetry(() => this.request.get('/api/profile', { headers: this.authHeaders() }));
  }

  patchProfile(body: Record<string, unknown>): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.patch('/api/profile', { headers: this.authHeaders(), data: body }),
    );
  }

  changePassword(newPassword: string, confirmPassword: string): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.post('/api/profile/password', {
        headers: this.authHeaders(),
        data: { newPassword, confirmPassword },
      }),
    );
  }

  uploadPhoto(fileName: string, buffer: Buffer, mimeType = 'image/png'): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.post('/api/profile/photo', {
        headers: this.authHeaders(),
        multipart: { photo: { name: fileName, mimeType, buffer } },
      }),
    );
  }

  // ----- tags -------------------------------------------------------------
  getTagPalette(): Promise<APIResponse> {
    return withRateLimitRetry(() => this.request.get('/api/tags/palette', { headers: this.authHeaders() }));
  }

  getTags(search?: string): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.get('/api/tags', { headers: this.authHeaders(), params: search ? { search } : {} }),
    );
  }

  createTag(name: string, color: string): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.post('/api/tags', { headers: this.authHeaders(), data: { name, color } }),
    );
  }

  ensureTag(name: string): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.post('/api/tags/ensure', { headers: this.authHeaders(), data: { name } }),
    );
  }

  deleteTag(id: string): Promise<APIResponse> {
    return withRateLimitRetry(() => this.request.delete(`/api/tags/${id}`, { headers: this.authHeaders() }));
  }

  // ----- todos ------------------------------------------------------------
  getTodos(params: Record<string, string | number | string[]> = {}): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.get('/api/todos', {
        headers: this.authHeaders(),
        params: params as Record<string, string | number>,
      }),
    );
  }

  createTodo(title: string, tagIds?: string[]): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.post('/api/todos', {
        headers: this.authHeaders(),
        data: { title, ...(tagIds && tagIds.length ? { tagIds } : {}) },
      }),
    );
  }

  updateTodo(id: string, body: Record<string, unknown>): Promise<APIResponse> {
    return withRateLimitRetry(() =>
      this.request.patch(`/api/todos/${id}`, { headers: this.authHeaders(), data: body }),
    );
  }

  deleteTodo(id: string): Promise<APIResponse> {
    return withRateLimitRetry(() => this.request.delete(`/api/todos/${id}`, { headers: this.authHeaders() }));
  }

  // ----- admin ------------------------------------------------------------
  adminOverview(params: Record<string, string | number> = {}): Promise<APIResponse> {
    return withRateLimitRetry(() => this.request.get('/api/admin/overview', { headers: this.authHeaders(), params }));
  }
}
