import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

const migrate = async () => {
  try {
    console.log('Running manager approval tier migration...');

    await pool.query(`
      ALTER TABLE leave_requests
        ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES employees(id),
        ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP WITH TIME ZONE;

      ALTER TABLE wfh_requests
        ADD COLUMN IF NOT EXISTS manager_reviewed_by UUID REFERENCES employees(id),
        ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMP WITH TIME ZONE;
    `);

    console.log('✅ Manager approval tier migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
