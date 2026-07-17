// Runtime-compatible cryptography using the Web Crypto API (available in Workers).
// Passwords use PBKDF2-HMAC-SHA256; tokens are random and stored only as hashes.

const encoder = new TextEncoder();

// Iteration count balances security against the Workers per-request CPU budget.
// Raise on the Workers Paid plan if desired.
const PBKDF2_ITERATIONS = 100_000;
const DERIVED_KEY_BITS = 256;

// --- encoding helpers --------------------------------------------------------
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- random ------------------------------------------------------------------
export function randomBytes(length = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** URL-safe random token, e.g. for session ids and reset tokens. */
export function randomToken(length = 32): string {
  return base64Url(randomBytes(length));
}

// --- hashing -----------------------------------------------------------------
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return bytesToHex(new Uint8Array(digest));
}

/** Constant-time comparison of two equal-length strings. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// --- passwords ---------------------------------------------------------------
async function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    DERIVED_KEY_BITS,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);
  return { hash, salt: bytesToBase64(salt) };
}

export async function verifyPassword(
  password: string,
  saltB64: string,
  expectedHashB64: string,
): Promise<boolean> {
  const salt = base64ToBytes(saltB64);
  const hash = await deriveKey(password, salt);
  return timingSafeEqual(hash, expectedHashB64);
}

// --- HMAC (signed tokens & webhook signatures) -------------------------------
async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64Url(new Uint8Array(sig));
}

export async function hmacVerify(secret: string, data: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(secret, data);
  return timingSafeEqual(expected, signature);
}
