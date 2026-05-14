import { query } from '../db';

async function migrate() {
  await query(`
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS birth_date DATE
  `);
  console.log('[migrate-employee-birthdate] birth_date column added');
}

migrate().catch(console.error).finally(() => process.exit(0));
