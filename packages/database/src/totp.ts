import * as jose from 'jose';

/**
 * Minimal RFC 6238 TOTP (SHA-1, 30s step, 6 digits) built on WebCrypto so it
 * runs in Workers. Used by the feature-flagged customer 2FA flow.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(lengthBytes = 20): string {
  const bytes = new Uint8Array(lengthBytes);
  crypto.getRandomValues(bytes);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

function dynamicTruncate(hmac: ArrayBuffer): number {
  const view = new DataView(hmac);
  const offset = view.getUint8(view.byteLength - 1) & 0x0f;
  const code =
    ((view.getUint8(offset) & 0x7f) << 24) |
    (view.getUint8(offset + 1) << 16) |
    (view.getUint8(offset + 2) << 8) |
    view.getUint8(offset + 3);
  return code % 1_000_000;
}

async function hotp(secretBase32: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secretBase32),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const msg = new ArrayBuffer(8);
  const msgView = new DataView(msg);
  msgView.setUint32(4, counter);
  const sig = await crypto.subtle.sign('HMAC', key, msg);
  return String(dynamicTruncate(sig)).padStart(6, '0');
}

/** Current 6-digit TOTP for the given secret. */
export async function totpNow(secretBase32: string, atSeconds?: number): Promise<string> {
  const step = Math.floor((atSeconds ?? Date.now() / 1000) / 30);
  return hotp(secretBase32, step);
}

/**
 * Verifies a user-submitted code with a ±1 step clock window.
 * Uses constant-ish comparison via string compare on padded codes.
 */
export async function verifyTotp(secretBase32: string, code: string, window = 1): Promise<boolean> {
  const cleaned = (code || '').replace(/\D/g, '');
  if (cleaned.length !== 6) return false;
  const nowStep = Math.floor(Date.now() / 1000 / 30);
  for (let drift = -window; drift <= window; drift++) {
    const expected = await hotp(secretBase32, nowStep + drift);
    if (expected === cleaned) return true;
  }
  return false;
}

/** otpauth:// provisioning URI for authenticator apps. */
export function buildOtpAuthUri(secretBase32: string, accountLabel: string, issuer = 'Aura Store'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}
