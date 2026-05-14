import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

async function migrate() {
  console.log('Migrating performance_reviews table for workflow support...');

  // Add reviewer_user_id (might already exist from controller usage)
  await pool.query(`
    ALTER TABLE performance_reviews
      ADD COLUMN IF NOT EXISTS reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL
  `);

  // Add workflow status columns
  await pool.query(`
    ALTER TABLE performance_reviews
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed',
      ADD COLUMN IF NOT EXISTS self_review TEXT,
      ADD COLUMN IF NOT EXISTS manager_comment TEXT,
      ADD COLUMN IF NOT EXISTS hr_comment TEXT,
      ADD COLUMN IF NOT EXISTS review_period VARCHAR(20),
      ADD COLUMN IF NOT EXISTS manager_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS hr_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS hr_reviewed_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  `);

  // Backfill: existing rows without status get 'completed' (already set by DEFAULT)
  await pool.query(`
    UPDATE performance_reviews SET status = 'completed' WHERE status IS NULL
  `);

  // Indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
    CREATE INDEX IF NOT EXISTS idx_performance_reviews_review_period ON performance_reviews(review_period);
  `);

  console.log('Migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
