/**
 * Migration: add missing database indexes.
 *
 * Targets:
 * - Soft-delete `deleted_at` columns filtered in almost every list query.
 * - Partial composite indexes for the two highest-traffic query patterns.
 *
 * Safe to run repeatedly — all statements use IF NOT EXISTS.
 * Run with: npx ts-node src/scripts/add-missing-indexes.ts
 */
import { query } from '../db';
import dotenv from 'dotenv';

dotenv.config();

async function run(): Promise<void> {
  console.log('Adding missing indexes…');

  const statements: [string, string][] = [
    // ── deleted_at indexes (soft-delete filter appears in every list query) ──
    [
      'idx_leave_requests_deleted_at',
      'CREATE INDEX IF NOT EXISTS idx_leave_requests_deleted_at ON leave_requests (deleted_at)',
    ],
    [
      'idx_attendance_records_deleted_at',
      'CREATE INDEX IF NOT EXISTS idx_attendance_records_deleted_at ON attendance_records (deleted_at)',
    ],
    [
      'idx_documents_deleted_at',
      'CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents (deleted_at)',
    ],
    [
      'idx_expense_claims_deleted_at',
      'CREATE INDEX IF NOT EXISTS idx_expense_claims_deleted_at ON expense_claims (deleted_at)',
    ],

    // ── Partial composite indexes for high-traffic list queries ──
    // leave_requests: filtered by employee + status + not-deleted (getLeaveBalances, list)
    [
      'idx_leave_requests_emp_status_active',
      `CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_status_active
       ON leave_requests (employee_id, status)
       WHERE deleted_at IS NULL`,
    ],
    // attendance_records: filtered by employee + date + not-deleted (history, summary)
    [
      'idx_attendance_records_emp_date_active',
      `CREATE INDEX IF NOT EXISTS idx_attendance_records_emp_date_active
       ON attendance_records (employee_id, date)
       WHERE deleted_at IS NULL`,
    ],
    // leave_requests date-range overlap check (leave balance / create validation)
    [
      'idx_leave_requests_dates',
      'CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests (start_date, end_date)',
    ],
  ];

  for (const [name, sql] of statements) {
    try {
      await query(sql);
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
