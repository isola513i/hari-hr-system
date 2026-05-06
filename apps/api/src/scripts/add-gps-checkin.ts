import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import pool from '../db';

const migrate = async () => {
  try {
    console.log('Running GPS check-in migration...');

    await pool.query(`
      -- GPS columns on attendance_records
      ALTER TABLE attendance_records
        ADD COLUMN IF NOT EXISTS clock_in_lat  DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS clock_in_lng  DECIMAL(11, 8),
        ADD COLUMN IF NOT EXISTS clock_in_accuracy FLOAT,
        ADD COLUMN IF NOT EXISTS check_in_type VARCHAR(20) DEFAULT 'office';

      -- work_type on employees: office | remote | hybrid
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS work_type VARCHAR(20) DEFAULT 'office';

      -- WFH requests table
      CREATE TABLE IF NOT EXISTS wfh_requests (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date        DATE NOT NULL,
        reason      TEXT,
        status      VARCHAR(20) DEFAULT 'pending',
        reviewed_by UUID REFERENCES employees(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_wfh_request UNIQUE (employee_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_wfh_requests_employee ON wfh_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_wfh_requests_date ON wfh_requests(date);
      CREATE INDEX IF NOT EXISTS idx_wfh_requests_status ON wfh_requests(status);

      -- GPS office config (Vanit Place Aree, 304 Phahonyothin Rd, Bangkok)
      INSERT INTO system_configs (category, key, value, data_type, description)
      VALUES
        ('attendance', 'office_lat',      '13.78',   'string',  'Office latitude coordinate'),
        ('attendance', 'office_lng',      '100.5427','string',  'Office longitude coordinate'),
        ('attendance', 'geofence_radius', '200',     'number',  'Allowed check-in radius in meters'),
        ('attendance', 'gps_required',    'false',   'boolean', 'Require GPS for clock-in'),
        ('attendance', 'office_ip',       '',        'string',  'Comma-separated office public IPs for desktop check-in')
      ON CONFLICT (category, key) DO NOTHING;
    `);

    console.log('✅ GPS check-in migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
