import { query } from '../db';

async function createSystemConfigsTable() {
    console.log('Creating system_configs table...');

    try {
        // Create table
        await query(`
            CREATE TABLE IF NOT EXISTS system_configs (
                id SERIAL PRIMARY KEY,
                category VARCHAR(100) NOT NULL,
                key VARCHAR(100) NOT NULL,
                value TEXT NOT NULL,
                data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(category, key)
            );
        `);

        console.log('✅ Table created successfully');

        // Create index for faster queries
        await query(`
            CREATE INDEX IF NOT EXISTS idx_system_configs_category
            ON system_configs(category);
        `);

        console.log('✅ Index created successfully');

        // Insert default configurations
        console.log('Inserting default configurations...');

        const configs = [
            // Leave quotas
            {
                category: 'leave',
                key: 'quotas',
                value: JSON.stringify([
                    { type: 'Vacation', total: 7 },
                    { type: 'Sick Leave', total: 30 },
                    { type: 'Personal Day', total: 6 },
                    { type: 'Maternity Leave', total: 120 },
                    { type: 'Compensatory Leave', total: -1 },
                    { type: 'Military Leave', total: 60 },
                    { type: 'Leave Without Pay', total: -1 }
                ]),
                data_type: 'json',
                description: 'Leave quotas by type. -1 means unlimited.'
            },
            // Performance review templates (criteria prompts to guide authored reviews)
            {
                category: 'performance',
                key: 'templates',
                value: JSON.stringify([
                    { id: 'quarterly', name: 'Quarterly Review', criteria: [
                        { key: 'achievements', prompt: 'Key achievements this quarter' },
                        { key: 'strengths', prompt: 'Strengths demonstrated' },
                        { key: 'improvements', prompt: 'Areas to improve' },
                        { key: 'goals', prompt: 'Goals for next quarter' },
                    ] },
                    { id: 'probation', name: 'Probation Review', criteria: [
                        { key: 'onboarding', prompt: 'Onboarding & ramp-up progress' },
                        { key: 'performance', prompt: 'Performance against role expectations' },
                        { key: 'culture', prompt: 'Team & culture fit' },
                        { key: 'recommendation', prompt: 'Recommendation (confirm / extend / release)' },
                    ] },
                    { id: 'annual', name: 'Annual Review', criteria: [
                        { key: 'impact', prompt: 'Overall impact this year' },
                        { key: 'strengths', prompt: 'Top strengths' },
                        { key: 'growth', prompt: 'Growth areas' },
                        { key: 'goals', prompt: 'Goals & development plan' },
                    ] },
                ]),
                data_type: 'json',
                description: 'Reusable performance-review templates (criteria prompts).'
            },
            // Employee settings
            {
                category: 'employee',
                key: 'default_password',
                value: 'Welcome123!',
                data_type: 'string',
                description: 'Default password for new employees'
            },
            // Session settings
            {
                category: 'auth',
                key: 'session_timeout',
                value: '8',
                data_type: 'number',
                description: 'Session timeout in hours'
            },
            // File upload settings
            {
                category: 'upload',
                key: 'max_file_size',
                value: '50',
                data_type: 'number',
                description: 'Maximum file upload size in MB'
            },
            {
                category: 'upload',
                key: 'allowed_types',
                value: JSON.stringify([
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'image/jpeg',
                    'image/png',
                    'image/gif'
                ]),
                data_type: 'json',
                description: 'Allowed file MIME types for upload'
            },
            // Payroll settings
            {
                category: 'payroll',
                key: 'standard_hours_per_month',
                value: '160',
                data_type: 'number',
                description: 'Standard working hours per month (used for overtime calculation)'
            },
            {
                category: 'payroll',
                key: 'tax_brackets',
                value: JSON.stringify([
                    { min: 0, max: 150000, rate: 0 },
                    { min: 150000, max: 300000, rate: 0.05 },
                    { min: 300000, max: 500000, rate: 0.10 },
                    { min: 500000, max: 750000, rate: 0.15 },
                    { min: 750000, max: 1000000, rate: 0.20 },
                    { min: 1000000, max: 2000000, rate: 0.25 },
                    { min: 2000000, max: 5000000, rate: 0.30 },
                    { min: 5000000, max: -1, rate: 0.35 }
                ]),
                data_type: 'json',
                description: 'Progressive tax brackets (Thai PND.1 style). max=-1 means unlimited.'
            },
            {
                category: 'payroll',
                key: 'personal_allowance',
                value: '60000',
                data_type: 'number',
                description: 'Personal tax allowance deducted from annual income before applying tax brackets'
            },
            {
                category: 'payroll',
                key: 'expense_deduction',
                value: '100000',
                data_type: 'number',
                description: 'Standard expense deduction cap amount'
            },
            {
                category: 'payroll',
                key: 'expense_deduction_rate',
                value: '0.5',
                data_type: 'number',
                description: 'Expense deduction rate (e.g. 0.5 = 50% of income, capped at expense_deduction)'
            },
            {
                category: 'payroll',
                key: 'ot_multiplier',
                value: '1.5',
                data_type: 'number',
                description: 'Overtime pay multiplier (e.g. 1.5 = 150% of hourly rate)'
            },
            {
                category: 'payroll',
                key: 'holiday_ot_multiplier',
                value: '3.0',
                data_type: 'number',
                description: 'OT rate multiplier for public holidays (Thai labor law: 3x)'
            },
            {
                category: 'payroll',
                key: 'default_intern_daily_rate',
                value: '350',
                data_type: 'number',
                description: 'Default daily rate for interns (THB). Used when employee has no daily_rate set.'
            },
            // Attendance / GPS settings
            {
                category: 'attendance',
                key: 'office_lat',
                value: '13.78',
                data_type: 'string',
                description: 'Office latitude (Vanit Place Aree)'
            },
            {
                category: 'attendance',
                key: 'office_lng',
                value: '100.5427',
                data_type: 'string',
                description: 'Office longitude (Vanit Place Aree)'
            },
            {
                category: 'attendance',
                key: 'geofence_radius',
                value: '200',
                data_type: 'number',
                description: 'Allowed check-in radius in meters'
            },
            {
                category: 'attendance',
                key: 'gps_required',
                value: 'false',
                data_type: 'boolean',
                description: 'Require GPS for clock-in'
            },
            {
                category: 'attendance',
                key: 'office_ip',
                value: '',
                data_type: 'string',
                description: 'Comma-separated office public IPs for desktop check-in'
            },
            // System settings
            {
                category: 'system',
                key: 'app_name',
                value: 'HARI - HR Management System',
                data_type: 'string',
                description: 'Application name'
            },
            {
                category: 'system',
                key: 'currency',
                value: 'THB',
                data_type: 'string',
                description: 'Default currency code'
            },
            {
                category: 'system',
                key: 'version',
                value: '1.1.0',
                data_type: 'string',
                description: 'Application version'
            },
            {
                category: 'system',
                key: 'maintenance_mode',
                value: 'false',
                data_type: 'boolean',
                description: 'Enable/disable maintenance mode'
            }
        ];

        for (const config of configs) {
            try {
                await query(
                    `INSERT INTO system_configs (category, key, value, data_type, description)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (category, key) DO UPDATE
                     SET value = EXCLUDED.value,
                         description = EXCLUDED.description,
                         updated_at = CURRENT_TIMESTAMP`,
                    [config.category, config.key, config.value, config.data_type, config.description]
                );
                console.log(`  ✅ ${config.category}.${config.key}`);
            } catch (error) {
                console.error(`  ❌ Failed to insert ${config.category}.${config.key}:`, error);
            }
        }

        console.log('\n✅ All configurations inserted successfully!');
        console.log('\nDefault configurations:');
        console.log('  - Leave quotas: Vacation (7), Sick Leave (30), Personal Day (6), Maternity Leave (120), Compensatory Leave (unlimited), Military Leave (60), Leave Without Pay (unlimited)');
        console.log('  - Default password: Welcome123!');
        console.log('  - Session timeout: 8 hours');
        console.log('  - Max file upload: 50 MB');

    } catch (error) {
        console.error('❌ Error creating system_configs table:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    createSystemConfigsTable()
        .then(() => {
            console.log('\n✅ Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error);
            process.exit(1);
        });
}

export default createSystemConfigsTable;
