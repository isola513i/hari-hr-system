import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

const migrate = async () => {
  try {
    console.log('Running attendance regularization migration...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        requested_clock_in  TIMESTAMP WITH TIME ZONE,
        requested_clock_out TIMESTAMP WITH TIME ZONE,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        manager_reviewed_by UUID REFERENCES employees(id),
        manager_reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by UUID REFERENCES employees(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_reg_request UNIQUE (employee_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_attendance_reg_employee ON attendance_regularization_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_reg_date ON attendance_regularization_requests(date);
      CREATE INDEX IF NOT EXISTS idx_attendance_reg_status ON attendance_regularization_requests(status);
    `);

    console.log('✅ Attendance regularization migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
