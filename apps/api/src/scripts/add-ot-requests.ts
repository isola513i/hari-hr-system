import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

const migrate = async () => {
  try {
    console.log('Running OT requests migration...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ot_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        planned_start TIME NOT NULL,
        planned_end TIME NOT NULL,
        planned_hours DECIMAL(4,2) NOT NULL,
        actual_hours DECIMAL(4,2),
        ot_type VARCHAR(20) DEFAULT 'regular',
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        reviewed_by UUID REFERENCES employees(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_ot_request UNIQUE (employee_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_ot_requests_employee ON ot_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_ot_requests_date ON ot_requests(date);
      CREATE INDEX IF NOT EXISTS idx_ot_requests_status ON ot_requests(status);

      INSERT INTO system_configs (category, key, value, data_type, description)
      VALUES ('payroll', 'holiday_ot_multiplier', '3.0', 'number', 'OT rate multiplier for public holidays (Thai labor law: 3x)')
      ON CONFLICT (category, key) DO NOTHING;
    `);

    console.log('✅ OT requests migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
