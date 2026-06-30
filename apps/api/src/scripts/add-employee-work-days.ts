/**
 * Migration: add per-employee work-day schedule.
 *
 * Adds employees.work_days — the weekdays an employee is scheduled to work,
 * as an INTEGER[] of day numbers (0=Sun … 6=Sat). Defaults to Mon–Fri
 * ('{1,2,3,4,5}'), which exactly preserves the previous hardcoded
 * "Mon–Fri are working days" behavior for every existing row.
 *
 * Safe to run repeatedly — uses IF NOT EXISTS.
 * Run with: npx ts-node src/scripts/add-employee-work-days.ts
 */
import { query } from '../db';
import dotenv from 'dotenv';

dotenv.config();

async function run(): Promise<void> {
  console.log('Adding employees.work_days…');
  try {
    await query(
      `ALTER TABLE employees
         ADD COLUMN IF NOT EXISTS work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}'`
    );
    console.log('  ✓ employees.work_days (default Mon–Fri)');
  } catch (err: any) {
    console.error(`  ✗ ${err.message}`);
    process.exit(1);
  }
  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
