/**
 * Migration: add performance_peer_feedback table for 360-degree reviews.
 *
 * Each row is one peer's feedback slot on a performance review:
 *  - created as `pending` when a manager/HR requests peer input
 *  - filled in (`submitted`) when that peer submits their rating + comment
 *
 * Safe to run repeatedly — uses IF NOT EXISTS.
 * Run with: npx ts-node src/scripts/add-peer-feedback-table.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

const migrate = async () => {
  try {
    console.log('Running performance_peer_feedback migration…');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_peer_feedback (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        feedback TEXT,
        is_anonymous BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'pending',
        requested_by UUID REFERENCES users(id),
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT unique_peer_per_review UNIQUE (review_id, reviewer_id)
      );

      CREATE INDEX IF NOT EXISTS idx_peer_feedback_review ON performance_peer_feedback(review_id);
      CREATE INDEX IF NOT EXISTS idx_peer_feedback_reviewer ON performance_peer_feedback(reviewer_id);
      CREATE INDEX IF NOT EXISTS idx_peer_feedback_status ON performance_peer_feedback(status);
    `);

    console.log('✅ performance_peer_feedback migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
