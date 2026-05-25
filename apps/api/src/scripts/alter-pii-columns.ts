/**
 * Migration: Add PII encrypted columns to employees table
 *
 * Adds:
 *   - employees.national_id          (TEXT — AES-256-GCM ciphertext, format: iv:authTag:data)
 *   - employees.bank_account_number  (TEXT — AES-256-GCM ciphertext, format: iv:authTag:data)
 *   - employees.national_id_hash     (VARCHAR(64) — HMAC-SHA-256 blind index for uniqueness)
 *
 * The partial UNIQUE index on national_id_hash enforces no two active employees share the same
 * National ID without blocking employees who have no national_id set (NULL rows are excluded).
 *
 * Decryption key: TOTP_ENCRYPTION_KEY (same 32-byte AES key reused via encryption.ts)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

async function migrate() {
    console.log('🔄  Running PII columns migration...\n');

    // ------------------------------------------------------------------
    // 1. Add encrypted PII columns to employees
    // ------------------------------------------------------------------
    console.log('1/2  employees → adding national_id, bank_account_number, national_id_hash ...');
    await pool.query(`
        ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS national_id TEXT DEFAULT NULL;
    `);
    await pool.query(`
        ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT NULL;
    `);
    await pool.query(`
        ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS national_id_hash VARCHAR(64) DEFAULT NULL;
    `);
    console.log('     ✓ columns done\n');

    // ------------------------------------------------------------------
    // 2. Create partial UNIQUE index on the blind index column
    //    WHERE national_id_hash IS NOT NULL → allows multiple NULL rows
    //    (employees with no national_id on file) without violating uniqueness
    // ------------------------------------------------------------------
    console.log('2/2  Creating partial UNIQUE index on national_id_hash ...');
    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_national_id_hash
        ON employees (national_id_hash)
        WHERE national_id_hash IS NOT NULL;
    `);
    console.log('     ✓ index done\n');

    console.log('✅  PII migration completed successfully.');
    console.log('    Columns added  : national_id (encrypted), bank_account_number (encrypted)');
    console.log('    Index added    : idx_employees_national_id_hash (UNIQUE partial)\n');
    console.log('    Encryption key : TOTP_ENCRYPTION_KEY (must already be set in .env)\n');

    await pool.end();
}

migrate().catch((err) => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
