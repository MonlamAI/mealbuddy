/** Base URL for Laravel API (includes /api prefix). */
export function apiUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000/api';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function getXsrfToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
  if (match) {
    return decodeURIComponent(match[2]);
  }
  return null;
}

export function authHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) {
    headers['Accept'] = 'application/json';
  }
  
  const token = getXsrfToken();
  if (token) {
    headers['X-XSRF-TOKEN'] = token;
  }
  
  return headers;
}
