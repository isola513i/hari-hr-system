/**
 * Migration: Add TOTP (Two-Factor Authentication) columns and tables
 *
 * Adds:
 *   - users.totp_enabled  (BOOLEAN DEFAULT FALSE)
 *   - users.totp_secret   (TEXT — AES-256-GCM encrypted TOTP secret)
 *   - totp_backup_codes   (new table for single-use recovery codes)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

async function migrate() {
    console.log('🔄  Running TOTP migration...\n');

    // ------------------------------------------------------------------
    // 1. Add columns to users table
    // ------------------------------------------------------------------
    console.log('1/2  users → adding totp_enabled and totp_secret ...');
    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT NULL;
    `);
    // Index for quick lookup of 2FA-enabled users at login
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_totp_enabled
        ON users (id)
        WHERE totp_enabled = TRUE;
    `);
    console.log('     ✓ users columns done\n');

    // ------------------------------------------------------------------
    // 2. Create totp_backup_codes table
    // ------------------------------------------------------------------
    console.log('2/2  Creating totp_backup_codes table ...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS totp_backup_codes (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code_hash  VARCHAR(255) NOT NULL,          -- bcrypt hash of one-time code
            used_at    TIMESTAMP WITH TIME ZONE DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_user_id
        ON totp_backup_codes (user_id);
    `);
    // Partial index to speed up "get unused codes for user" queries
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_unused
        ON totp_backup_codes (user_id)
        WHERE used_at IS NULL;
    `);
    console.log('     ✓ totp_backup_codes done\n');

    console.log('✅  TOTP migration completed successfully.');
    console.log('\nRemember to add TOTP_ENCRYPTION_KEY to your .env file.');
    console.log('Generate one with: openssl rand -hex 32\n');

    await pool.end();
}

migrate().catch((err) => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
