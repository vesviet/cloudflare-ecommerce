const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8788/api';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };

  if (import.meta.env.DEV) {
    const localEmail = localStorage.getItem('admin_email');
    if (localEmail && !headers['X-Local-Admin-Email']) {
      headers['X-Local-Admin-Email'] = localEmail;
    }
  }

  const body = options.body;
  if (body !== undefined && body !== null && !(body instanceof FormData) && typeof body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const fullUrl = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  return fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  });
}
