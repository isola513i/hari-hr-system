/**
 * Migration: Add Soft Delete (deleted_at) Columns
 *
 * For HR systems, records related to employees, payroll, and time tracking
 * must NEVER be permanently removed from the database (no hard deletes).
 * This migration adds `deleted_at TIMESTAMPTZ` to all critical HR tables
 * so we can "soft delete" rows while preserving them for audit purposes.
 *
 * Tables affected:
 *   - leave_requests       (previously hard-deleted on cancel)
 *   - expense_claims       (previously hard-deleted on pending cancel / admin delete)
 *   - attendance_records   (previously hard-deleted by admin)
 *   - employee_training    (previously hard-deleted on removal)
 *
 * Tables already using soft delete (no changes needed):
 *   - employees            → status = 'Terminated'
 *   - documents            → status = 'Deleted' + deleted_at (already in schema)
 *   - training_modules     → is_active = FALSE
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

async function migrate() {
    console.log('🔄  Running soft-delete migration...\n');

    // ------------------------------------------------------------------
    // 1. leave_requests
    // ------------------------------------------------------------------
    console.log('1/4  leave_requests → adding deleted_at ...');
    await pool.query(`
        ALTER TABLE leave_requests
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    // Partial index: speeds up WHERE deleted_at IS NULL queries
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_leave_requests_not_deleted
        ON leave_requests (id)
        WHERE deleted_at IS NULL;
    `);
    console.log('     ✓ leave_requests done\n');

    // ------------------------------------------------------------------
    // 2. expense_claims
    // ------------------------------------------------------------------
    console.log('2/4  expense_claims → adding deleted_at ...');
    await pool.query(`
        ALTER TABLE expense_claims
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_expense_claims_not_deleted
        ON expense_claims (id)
        WHERE deleted_at IS NULL;
    `);
    console.log('     ✓ expense_claims done\n');

    // ------------------------------------------------------------------
    // 3. attendance_records
    // ------------------------------------------------------------------
    console.log('3/4  attendance_records → adding deleted_at ...');
    await pool.query(`
        ALTER TABLE attendance_records
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    // Note: the existing UNIQUE constraint on (employee_id, date) remains.
    // Soft-deleted rows still occupy the unique slot; if a new record is
    // needed for the same day the admin upsert will restore + update it.
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_not_deleted
        ON attendance_records (employee_id, date)
        WHERE deleted_at IS NULL;
    `);
    console.log('     ✓ attendance_records done\n');

    // ------------------------------------------------------------------
    // 4. employee_training
    // ------------------------------------------------------------------
    console.log('4/4  employee_training → adding deleted_at ...');
    await pool.query(`
        ALTER TABLE employee_training
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_employee_training_not_deleted
        ON employee_training (employee_id)
        WHERE deleted_at IS NULL;
    `);
    console.log('     ✓ employee_training done\n');

    // ------------------------------------------------------------------
    // Done
    // ------------------------------------------------------------------
    console.log('✅  Soft-delete migration completed successfully.');
    console.log('\nNote: The leave_request_history table uses ON DELETE CASCADE.');
    console.log('Since leave_requests are now soft-deleted, this cascade will');
    console.log('never fire and all history is preserved for audit purposes.\n');

    await pool.end();
}

migrate().catch((err) => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
