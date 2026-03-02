const API_BASE = '/api';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

function getTokens() {
  const raw = localStorage.getItem('triplocal_auth');
  if (!raw) return null;
  return JSON.parse(raw) as { accessToken: string; refreshToken: string };
}

function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  const existing = localStorage.getItem('triplocal_auth');
  const parsed = existing ? JSON.parse(existing) : {};
  localStorage.setItem('triplocal_auth', JSON.stringify({ ...parsed, ...tokens }));
}

export function clearAuth() {
  localStorage.removeItem('triplocal_auth');
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) {
      clearAuth();
      return null;
    }
    const data = await res.json();
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    clearAuth();
    return null;
  }
}

export async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const tokens = getTokens();
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
  }

  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  // Token refresh on 401
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'エラーが発生しました' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  login: (data: { email: string; password: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  me: () => apiFetch('/auth/me'),
};

// Accommodation API
export const accommodationApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/accommodations${qs}`, { skipAuth: true });
  },
  get: (id: string) => apiFetch(`/accommodations/${id}`, { skipAuth: true }),
  availability: (id: string, year: number, month: number) =>
    apiFetch(`/accommodations/${id}/availability?year=${year}&month=${month}`, { skipAuth: true }),
};

// Booking API
export const bookingApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/bookings${qs}`);
  },
  create: (data: { roomId: string; checkIn: string; checkOut: string; guests: number }) =>
    apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => apiFetch(`/bookings/${id}`),
  cancel: (id: string, reason?: string) =>
    apiFetch(`/bookings/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }),
};
