# 0005 — AES-256-GCM PII encryption + HMAC blind index

**Status:** Accepted

## Context

Employee records hold sensitive PII — national ID and bank account number. Storing these
as plaintext risks a catastrophic leak if the database (a managed cloud Postgres) is ever
exposed. But the app also needs to detect duplicates (e.g. two employees with the same
national ID) without decrypting every row to compare.

## Decision

In `utils/encryption.ts`:

- **Encrypt** `national_id` / `bank_account_number` with **AES-256-GCM** (authenticated
  encryption): ciphertext is stored as `iv:authTag:ciphertext` hex. GCM's auth tag detects
  tampering on decrypt.
- Store an **HMAC-SHA-256 blind index** (`national_id_hash`) of the plaintext. Being
  deterministic, it supports a UNIQUE constraint and duplicate lookups; being keyed (HMAC,
  not plain SHA-256), it's useless to an attacker who has the DB dump but not the key.
- A single `TOTP_ENCRYPTION_KEY` (64 hex chars) keys both; the API refuses to start without
  it (fail-fast).
- Decryption is tolerant of legacy plaintext (pre-encryption rows) via `isEncryptedFormat`,
  and logs loudly on a real decrypt failure rather than silently returning null.

## Consequences

- **+** A DB dump alone does not reveal PII, and can't be brute-forced by hashing guesses
  (HMAC is keyed).
- **+** Duplicate detection and unique constraints still work via the blind index.
- **+** Tamper-evidence from the GCM auth tag.
- **−** The encryption key is a single point of failure: lose it → PII is unrecoverable;
  leak it → encryption is void. Key management/rotation is an operational responsibility.
- **−** Encrypted columns can't be queried by value except through the blind index — range
  queries or partial matches on PII are not possible (acceptable for these fields).
