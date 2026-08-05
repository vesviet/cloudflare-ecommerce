export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';

/**
 * Thin fetch wrapper for storefront public API calls.
 * - prefixes relative paths with API_BASE
 * - JSON-encodes plain-object bodies
 * - returns parsed JSON; non-OK responses are resolved (caller checks data.success)
 */
export async function apiFetch<T = any>(path: string, options: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
} = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = { ...(options.headers || {}) };
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const res = await fetch(url, {
    method: options.method || (body ? 'POST' : 'GET'),
    headers,
    body,
    credentials: options.credentials,
  });
  return (await res.json().catch(() => null)) as T;
}
