import * as jose from 'jose';

// Helper to hash password using Web Crypto API (PBKDF2)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  const saltBase64 = btoa(String.fromCharCode(...new Uint8Array(salt)));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  
  return `${saltBase64}:${hashBase64}`;
}

// Helper to verify password
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltBase64, hashBase64] = storedHash.split(':');
  
  const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
  const expectedHash = new Uint8Array(atob(hashBase64).split('').map(c => c.charCodeAt(0)));
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  const actualHash = new Uint8Array(hashBuffer);
  
  if (actualHash.length !== expectedHash.length) return false;
  for (let i = 0; i < actualHash.length; i++) {
    if (actualHash[i] !== expectedHash[i]) return false;
  }
  return true;
}

// Helper to sign JWT
export async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(secret));
}

// Helper to verify JWT
export async function verifyJWT(token: string, secret: string): Promise<any> {
  const encoder = new TextEncoder();
  const { payload } = await jose.jwtVerify(token, encoder.encode(secret));
  return payload;
}
