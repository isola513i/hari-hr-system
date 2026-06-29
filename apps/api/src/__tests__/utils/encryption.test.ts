import { encrypt, decrypt, hashPII, isEncryptedFormat } from '../../utils/encryption';

describe('encryption', () => {
  describe('encrypt / decrypt roundtrip', () => {
    it('decrypts what it encrypts', () => {
      const plain = 'sensitive-PII-1234';
      const cipher = encrypt(plain);
      expect(cipher).not.toBe(plain);
      expect(decrypt(cipher)).toBe(plain);
    });

    it('produces a different ciphertext each time (random IV)', () => {
      expect(encrypt('same')).not.toBe(encrypt('same'));
    });

    it('throws on tampered ciphertext', () => {
      const cipher = encrypt('hello');
      const tampered = cipher.slice(0, -2) + (cipher.endsWith('00') ? '11' : '00');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('throws on malformed format', () => {
      expect(() => decrypt('not-a-valid-ciphertext')).toThrow('Invalid ciphertext format');
    });
  });

  describe('isEncryptedFormat', () => {
    it('recognizes real ciphertext', () => {
      expect(isEncryptedFormat(encrypt('x'))).toBe(true);
    });
    it('rejects legacy plaintext', () => {
      expect(isEncryptedFormat('John Doe')).toBe(false);
      expect(isEncryptedFormat('1234567890')).toBe(false);
      expect(isEncryptedFormat('a:b')).toBe(false); // only 2 parts
      expect(isEncryptedFormat('xyz:authtag:cipher')).toBe(false); // non-hex
    });
  });

  describe('hashPII', () => {
    it('is deterministic', () => {
      expect(hashPII('national-id-1')).toBe(hashPII('national-id-1'));
    });
    it('trims input', () => {
      expect(hashPII(' value ')).toBe(hashPII('value'));
    });
    it('returns a 64-char hex string', () => {
      expect(hashPII('x')).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
