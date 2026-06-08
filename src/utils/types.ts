/** Domain types derived from the application's API responses (see README). */

export type Gender = '0' | '1'; // 0 = male, 1 = female (string in profile model)

export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  photo?: string;
  gender?: Gender;
  role: 'user' | 'admin';
  internalAnalyticsConsent: boolean;
  applicationId: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  _id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  _id: string;
  userId: string;
  title: string;
  completed: boolean;
  tagIds: string[];
  tags: Array<Pick<Tag, '_id' | 'name' | 'color'>>;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  search?: string;
}

export interface LoginResponse {
  token: string;
  role: 'user' | 'admin';
  message: string;
}

/** Analytics event types that can appear in GET /api/analytics/events. */
export type AnalyticsEventType =
  | 'register'
  | 'login'
  | 'logout'
  | 'photoUpload'
  | 'todoCreate'
  | 'todoComplete'
  | 'todoEdit'
  | 'todoDelete'
  | 'passwordChangeSuccess'
  | 'passwordChangeFailed'
  | 'analyticsConsentChange';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  status?: 'success' | 'failed';
  timestamp: string;
  email?: string;
  name?: string;
  gender?: 0 | 1; // numeric in events (vs string in profile)
  fileName?: string;
  reason?: string;
  analyticsConsent?: boolean;
  applicationId?: string;
}

/** Shape used when registering a new user. */
export interface NewUser {
  name: string;
  email: string;
  password: string;
  gender: Gender;
  photo?: string;
  internalAnalyticsConsent?: boolean;
}
