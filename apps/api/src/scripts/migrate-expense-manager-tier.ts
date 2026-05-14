import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

async function migrate() {
  console.log('Migrating expense_claims for manager approval tier...');

  await pool.query(`
    ALTER TABLE expense_claims
      ADD COLUMN IF NOT EXISTS manager_reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMP WITH TIME ZONE
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expense_claims_manager ON expense_claims(manager_reviewed_by);
  `);

  console.log('Migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
