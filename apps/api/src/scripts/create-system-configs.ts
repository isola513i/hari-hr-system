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
                    { type: 'Vacation', total: 15 },
                    { type: 'Sick Leave', total: 10 },
                    { type: 'Personal Day', total: -1 } // -1 = unlimited
                ]),
                data_type: 'json',
                description: 'Leave quotas by type. -1 means unlimited.'
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
        console.log('  - Leave quotas: Vacation (15), Sick Leave (10), Personal Day (Unlimited)');
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
