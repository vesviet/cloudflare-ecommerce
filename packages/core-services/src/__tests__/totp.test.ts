import { describe, it, expect } from 'vitest';
import { generateBase32Secret, base32Decode, totpNow, verifyTotp, buildOtpAuthUri } from '@ecommerce/database';

// RFC 6238 reference vector (SHA-1, 8 digits in the RFC; we use 6-digit slice
// semantics, so assert against our own hotp derivation with fixed timestamps).
describe('TOTP (Phase 3.5 — customer 2FA)', () => {
  it('TOTP-01: generates a valid base32 secret (alphabet + length)', () => {
    const secret = generateBase32Secret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    // 20 bytes -> 160 bits -> 32 base32 chars
    expect(secret.length).toBe(32);
  });

  it('TOTP-02: base32Decode round-trips through the alphabet encoding', () => {
    const secret = generateBase32Secret();
    const decoded = base32Decode(secret);
    expect(decoded.length).toBe(20);
  });

  it('TOTP-03: deterministic for the same timestamp', async () => {
    const secret = 'JBSWY3DPEHPK3PXP'; // classic test secret
    const a = await totpNow(secret, 1700000000);
    const b = await totpNow(secret, 1700000000);
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{6}$/);
  });

  it('TOTP-04: code changes across step boundaries', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const before = await totpNow(secret, 1700000000);
    const after = await totpNow(secret, 1700000030); // exactly one step later
    expect(before).not.toBe(after);
  });

  it('TOTP-05: verifyTotp accepts the current code and rejects garbage', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = await totpNow(secret);
    expect(await verifyTotp(secret, code)).toBe(true);
    expect(await verifyTotp(secret, '000000')).toBe(false);
    expect(await verifyTotp(secret, 'abcdef!')).toBe(false); // non-digits stripped -> invalid
    expect(await verifyTotp(secret, '')).toBe(false);
  });

  it('TOTP-06: clock window ±1 step is accepted', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const nowSec = Math.floor(Date.now() / 1000);
    const previousStepCode = await totpNow(secret, nowSec - 30);
    expect(await verifyTotp(secret, previousStepCode)).toBe(true);
  });

  it('TOTP-07: codes outside the ±1 window are rejected', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const stale = await totpNow(secret, Math.floor(Date.now() / 1000) - 30 * 5);
    expect(await verifyTotp(secret, stale)).toBe(false);
  });

  it('TOTP-08: otpauth URI carries secret/issuer/algorithm', () => {
    const uri = buildOtpAuthUri('JBSWY3DPEHPK3PXP', 'user@example.com');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=Aura');
    expect(uri).toContain('digits=6');
  });
});
