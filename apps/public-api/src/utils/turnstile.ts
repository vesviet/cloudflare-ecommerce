export type TurnstileResult = { ok: true } | { ok: false; status: 403 | 503; message: string };

/**
 * Verifies a Cloudflare Turnstile token against siteverify.
 * Env-gated: when no secret is configured the check passes so local/dev and QA
 * environments keep working; production must set TURNSTILE_SECRET_KEY.
 * Uses a 5s timeout (DEF-007) — the Worker default of 30s would block requests
 * on a slow Cloudflare response.
 */
export async function verifyTurnstile(
  secretKey: string | undefined,
  token: string | undefined
): Promise<TurnstileResult> {
  if (!secretKey) {
    return { ok: true };
  }
  if (!token) {
    return { ok: false, status: 403, message: 'Missing turnstile token' };
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let outcome: any;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    outcome = await res.json();
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === 'AbortError') {
      console.error('[Turnstile] siteverify timed out');
      return { ok: false, status: 503, message: 'Security check timed out. Please try again.' };
    }
    throw e;
  }
  clearTimeout(timeout);

  if (!outcome.success) {
    return { ok: false, status: 403, message: 'Turnstile verification failed' };
  }
  return { ok: true };
}
