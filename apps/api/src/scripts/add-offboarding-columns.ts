/**
 * Migration: Add offboarding tables and columns
 *
 * Adds:
 *   - employees.termination_date        (DATE)
 *   - employees.last_working_day        (DATE)
 *   - employees.termination_reason      (VARCHAR(100))
 *   - employees.termination_notes       (TEXT)
 *   - employees.terminated_by           (UUID → users.id)
 *   - employees.offboarding_initiated_at (TIMESTAMPTZ)
 *
 *   - Table: offboarding_tasks  (isolated from onboarding `tasks` table)
 *   - Table: exit_interviews     (one row per terminated employee, UNIQUE on employee_id)
 *
 * Note: employees.status is VARCHAR(50) with no CHECK constraint.
 * 'Notice Period' becomes a new valid value at the application layer only.
 * No constraint alteration is needed.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

async function migrate() {
    console.log('🔄  Running offboarding migration...\n');

    // ------------------------------------------------------------------
    // 1. Add termination metadata columns to employees
    // ------------------------------------------------------------------
    console.log('1/3  employees → adding termination metadata columns ...');

    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_date DATE`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_working_day DATE`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_reason VARCHAR(100)`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_notes TEXT`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS terminated_by UUID REFERENCES users(id)`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS offboarding_initiated_at TIMESTAMPTZ`);

    console.log('     ✓ columns done\n');

    // ------------------------------------------------------------------
    // 2. Create offboarding_tasks table (isolated from onboarding `tasks`)
    // ------------------------------------------------------------------
    console.log('2/3  Creating offboarding_tasks table ...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS offboarding_tasks (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            title       VARCHAR(255) NOT NULL,
            description TEXT,
            stage       VARCHAR(50)  NOT NULL,     -- 'Pre-Exit' | 'Last Week' | 'Post-Exit'
            assignee    VARCHAR(50)  NOT NULL,     -- 'HR' | 'IT' | 'Manager' | 'Employee' | 'Finance'
            due_date    DATE,
            completed   BOOLEAN      NOT NULL DEFAULT FALSE,
            priority    VARCHAR(20)  DEFAULT 'Medium',  -- 'High' | 'Medium' | 'Low'
            created_at  TIMESTAMPTZ  DEFAULT NOW(),
            updated_at  TIMESTAMPTZ  DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_offboarding_tasks_employee
        ON offboarding_tasks (employee_id)
    `);

    console.log('     ✓ offboarding_tasks done\n');

    // ------------------------------------------------------------------
    // 3. Create exit_interviews table (one row per employee, UNIQUE)
    // ------------------------------------------------------------------
    console.log('3/3  Creating exit_interviews table ...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS exit_interviews (
            id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id           UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
            reason_for_leaving    VARCHAR(100),   -- 'Better Opportunity'|'Career Change'|'Compensation'|'Manager'|'Relocation'|'Personal'|'Other'
            satisfaction_rating   INT         CHECK (satisfaction_rating BETWEEN 1 AND 5),
            would_rehire          BOOLEAN,
            feedback              TEXT,
            improvements_suggested TEXT,
            conducted_by          UUID        REFERENCES users(id),
            conducted_at          TIMESTAMPTZ DEFAULT NOW(),
            created_at            TIMESTAMPTZ DEFAULT NOW(),
            updated_at            TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    console.log('     ✓ exit_interviews done\n');

    console.log('✅  Offboarding migration completed successfully.');
    console.log('    Columns added: termination_date, last_working_day, termination_reason,');
    console.log('                   termination_notes, terminated_by, offboarding_initiated_at');
    console.log('    Tables created: offboarding_tasks, exit_interviews\n');

    await pool.end();
}

migrate().catch((err) => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
