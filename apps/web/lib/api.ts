import type {
  ApplicationView,
  AuthResult,
  CreatePostInput,
  CreateReportInput,
  CreateReviewInput,
  DecideApplicationInput,
  GameProfileInput,
  GameProfileView,
  GameView,
  HandleReportInput,
  JoinedPostSummary,
  MeView,
  MessageView,
  MyPostSummary,
  Paginated,
  PostDetail,
  PublicUser,
  ReportView,
  ReviewView,
  UpdateProfileInput,
} from '@allisteam/shared';
import { useAuthStore, type SessionUser } from './auth-store';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/** 并发请求同时过期时只发起一次刷新 */
export async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      // 网络抖动时不能让页面一直卡在「恢复会话」上，超时按未登录处理
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) {
          useAuthStore.getState().clear();
          return false;
        }
        const data = (await response.json()) as AuthResult;
        useAuthStore.getState().setSession({ accessToken: data.accessToken, user: data.user });
        return true;
      } finally {
        clearTimeout(timeout);
      }
    })()
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** 跳过 401 自动刷新，用于登录、注册这类本来就不需要令牌的接口 */
  skipAuthRefresh?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, skipAuthRefresh, headers, ...rest } = options;

  const send = async (): Promise<Response> => {
    const token = useAuthStore.getState().accessToken;
    return fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };

  let response = await send();

  if (response.status === 401 && !skipAuthRefresh) {
    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as { code?: string } | null;

    if (payload?.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshSession();
      if (refreshed) {
        response = await send();
      }
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      payload.code ?? 'INTERNAL_ERROR',
      payload.message ?? '请求失败，请稍后再试',
      response.status,
      payload.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRefresh: true,
  });
  useAuthStore.getState().setSession({ accessToken: result.accessToken, user: result.user });
  return result;
}

export async function register(
  email: string,
  password: string,
  nickname: string,
): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>('/auth/register', {
    method: 'POST',
    body: { email, password, nickname },
    skipAuthRefresh: true,
  });
  useAuthStore.getState().setSession({ accessToken: result.accessToken, user: result.user });
  return result;
}

export async function logout(): Promise<void> {
  await apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' }).catch(() => undefined);
  useAuthStore.getState().clear();
}

export function getSessionUser(): SessionUser | null {
  return useAuthStore.getState().user;
}

export function getMe(): Promise<MeView> {
  return apiFetch<MeView>('/me');
}

export function updateMe(input: UpdateProfileInput): Promise<MeView> {
  return apiFetch<MeView>('/me', { method: 'PATCH', body: input });
}

export function listGames(): Promise<GameView[]> {
  return apiFetch<GameView[]>('/games');
}

export function listMyGames(): Promise<GameProfileView[]> {
  return apiFetch<GameProfileView[]>('/me/games');
}

export function addGameProfile(input: GameProfileInput): Promise<GameProfileView> {
  return apiFetch<GameProfileView>('/me/games', { method: 'POST', body: input });
}

export function removeGameProfile(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/me/games/${id}`, { method: 'DELETE' });
}

export function getPost(id: string): Promise<PostDetail> {
  return apiFetch<PostDetail>(`/posts/${id}`);
}

export function createPost(input: CreatePostInput): Promise<PostDetail> {
  return apiFetch<PostDetail>('/posts', { method: 'POST', body: input });
}

export function cancelPost(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/posts/${id}`, { method: 'DELETE' });
}

export function listMyPosts(cursor?: string): Promise<Paginated<MyPostSummary>> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) {
    params.set('cursor', cursor);
  }
  return apiFetch<Paginated<MyPostSummary>>(`/me/posts?${params.toString()}`);
}

export function listMyApplications(cursor?: string): Promise<Paginated<JoinedPostSummary>> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) {
    params.set('cursor', cursor);
  }
  return apiFetch<Paginated<JoinedPostSummary>>(`/me/applications?${params.toString()}`);
}

export function applyToPost(postId: string, message?: string): Promise<ApplicationView> {
  return apiFetch<ApplicationView>(`/posts/${postId}/applications`, {
    method: 'POST',
    body: message && message.trim().length > 0 ? { message } : {},
  });
}

export function listApplications(
  postId: string,
  status?: string,
): Promise<Paginated<ApplicationView>> {
  const params = new URLSearchParams({ limit: '20' });
  if (status) {
    params.set('status', status);
  }
  return apiFetch<Paginated<ApplicationView>>(`/posts/${postId}/applications?${params.toString()}`);
}

export function decideApplication(
  applicationId: string,
  input: DecideApplicationInput,
): Promise<ApplicationView> {
  return apiFetch<ApplicationView>(`/applications/${applicationId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function withdrawApplication(applicationId: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/applications/${applicationId}`, { method: 'DELETE' });
}

export interface ListMessagesOptions {
  /** 向上翻页游标 */
  cursor?: string;
  /** 断线补偿：返回这条消息之后的消息（升序） */
  after?: string;
  limit?: number;
}

export function listMessages(
  postId: string,
  options: ListMessagesOptions = {},
): Promise<Paginated<MessageView>> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 30) });
  if (options.cursor) {
    params.set('cursor', options.cursor);
  }
  if (options.after) {
    params.set('after', options.after);
  }
  return apiFetch<Paginated<MessageView>>(`/posts/${postId}/messages?${params.toString()}`);
}

export function getPublicUser(userId: string): Promise<PublicUser> {
  return apiFetch<PublicUser>(`/users/${userId}`);
}

export function createReview(postId: string, input: CreateReviewInput): Promise<ReviewView> {
  return apiFetch<ReviewView>(`/posts/${postId}/reviews`, { method: 'POST', body: input });
}

export function listPostReviews(
  postId: string,
  cursor?: string,
  limit = 50,
): Promise<Paginated<ReviewView>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set('cursor', cursor);
  }
  return apiFetch<Paginated<ReviewView>>(`/posts/${postId}/reviews?${params.toString()}`);
}

export function listUserReviews(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<Paginated<ReviewView>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set('cursor', cursor);
  }
  return apiFetch<Paginated<ReviewView>>(`/users/${userId}/reviews?${params.toString()}`);
}

export function createReport(input: CreateReportInput): Promise<ReportView> {
  return apiFetch<ReportView>('/reports', { method: 'POST', body: input });
}

export interface ListReportsOptions {
  status?: string;
  cursor?: string;
  limit?: number;
}

export function listReports(options: ListReportsOptions = {}): Promise<Paginated<ReportView>> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 20) });
  if (options.status) {
    params.set('status', options.status);
  }
  if (options.cursor) {
    params.set('cursor', options.cursor);
  }
  return apiFetch<Paginated<ReportView>>(`/admin/reports?${params.toString()}`);
}

export function handleReport(id: string, input: HandleReportInput): Promise<ReportView> {
  return apiFetch<ReportView>(`/admin/reports/${id}`, { method: 'PATCH', body: input });
}
