import { query } from '../db';

async function migrate() {
  console.log('Adding end_date column to holidays table...');

  await query(`
    ALTER TABLE holidays
    ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL
  `);

  // Drop the unique index on date since a range may overlap individual dates
  await query(`
    DROP INDEX IF EXISTS idx_holidays_date
  `);

  console.log('Migration complete: end_date column added to holidays table.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
