import { query } from '../db';

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS company_assets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      asset_type VARCHAR(100) NOT NULL,
      serial_number VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Available',
      assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
      assigned_at TIMESTAMP WITH TIME ZONE,
      purchase_date DATE,
      purchase_price DECIMAL(12,2),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_company_assets_assigned_to ON company_assets(assigned_to)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_company_assets_status ON company_assets(status)`);
  console.log('[migrate-assets] company_assets table ready');
}

migrate().catch(console.error).finally(() => process.exit(0));
