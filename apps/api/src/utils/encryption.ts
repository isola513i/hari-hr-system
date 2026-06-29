/**
 * AES-256-GCM Encryption Utility
 *
 * Reusable symmetric encryption using Node's built-in `crypto` module.
 * Used by:
 *   - AuthService (TOTP secrets)           ← Task 1.1
 *   - EmployeeService (PII fields)          ← Task 1.3
 *
 * Requires env var:
 *   TOTP_ENCRYPTION_KEY = 64 hex chars (32 bytes)
 *   Generate with: openssl rand -hex 32
 *
 * Ciphertext format (colon-delimited hex): iv:authTag:encrypted
 */

import crypto from 'crypto';

// Fail fast if key is missing or malformed
const rawKey = process.env.TOTP_ENCRYPTION_KEY;
if (!rawKey) {
    console.error('FATAL: TOTP_ENCRYPTION_KEY environment variable is not set');
    process.exit(1);
}
if (rawKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(rawKey)) {
    console.error('FATAL: TOTP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
    process.exit(1);
}

const ENCRYPTION_KEY = Buffer.from(rawKey, 'hex');

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a colon-separated string: `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag(); // 128-bit authentication tag

    return [
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex'),
    ].join(':');
}

/**
 * HMAC-SHA-256 blind index for PII fields.
 *
 * Deterministic (same input → same output) so it can be stored in a UNIQUE
 * index and used for duplicate-detection — without exposing the plaintext.
 * Using HMAC (keyed) instead of plain SHA-256 means the hash is useless to an
 * attacker who has the DB dump but not the TOTP_ENCRYPTION_KEY.
 *
 * Returns a 64-char lowercase hex string.
 */
export function hashPII(plaintext: string): string {
    return crypto
        .createHmac('sha256', ENCRYPTION_KEY)
        .update(plaintext.trim())
        .digest('hex');
}

/**
 * True when `value` matches the `iv:authTag:ciphertext` format produced by
 * `encrypt()` (three non-empty hex segments). Lets callers distinguish real
 * ciphertext from legacy plaintext that predates encryption.
 */
export function isEncryptedFormat(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 3 && parts.every((p) => p.length > 0 && /^[0-9a-fA-F]+$/.test(p));
}

/**
 * Decrypt a ciphertext string previously produced by `encrypt()`.
 * Throws if the ciphertext has been tampered with (authTag mismatch).
 */
export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        ENCRYPTION_KEY,
        Buffer.from(ivHex, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, 'hex')),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}
