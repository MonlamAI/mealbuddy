/** Base URL for Laravel API (includes /api prefix). */
export function apiUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000/api';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function authHeaders(json = true): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {};
  if (json) {
    headers['Accept'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
