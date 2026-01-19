import { query } from '../db';
import { SystemConfig, CreateSystemConfigDTO, UpdateSystemConfigDTO, LeaveQuota } from '../models/SystemConfig';

export class SystemConfigService {
    /**
     * Get all system configurations
     */
    async getAllConfigs(): Promise<SystemConfig[]> {
        const result = await query('SELECT * FROM system_configs ORDER BY category, key');
        return result.rows.map(this.mapRowToConfig);
    }

    /**
     * Get config by category and key
     */
    async getConfig(category: string, key: string): Promise<SystemConfig | null> {
        const result = await query(
            'SELECT * FROM system_configs WHERE category = $1 AND key = $2',
            [category, key]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToConfig(result.rows[0]);
    }

    /**
     * Get all configs in a category
     */
    async getConfigsByCategory(category: string): Promise<SystemConfig[]> {
        const result = await query(
            'SELECT * FROM system_configs WHERE category = $1 ORDER BY key',
            [category]
        );
        return result.rows.map(this.mapRowToConfig);
    }

    /**
     * Get config value (parsed according to dataType)
     */
    async getConfigValue(category: string, key: string, defaultValue?: any): Promise<any> {
        const config = await this.getConfig(category, key);
        if (!config) {
            return defaultValue;
        }
        return this.parseConfigValue(config);
    }

    /**
     * Create new config
     */
    async createConfig(configData: CreateSystemConfigDTO): Promise<SystemConfig> {
        const { category, key, value, dataType, description } = configData;

        // Check if config already exists
        const existing = await this.getConfig(category, key);
        if (existing) {
            throw new Error(`Config ${category}.${key} already exists`);
        }

        const result = await query(
            `INSERT INTO system_configs (category, key, value, data_type, description)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [category, key, value, dataType, description || null]
        );

        return this.mapRowToConfig(result.rows[0]);
    }

    /**
     * Update existing config
     */
    async updateConfig(category: string, key: string, updateData: UpdateSystemConfigDTO): Promise<SystemConfig> {
        const { value, description } = updateData;

        const result = await query(
            `UPDATE system_configs
             SET value = $1,
                 description = COALESCE($2, description),
                 updated_at = CURRENT_TIMESTAMP
             WHERE category = $3 AND key = $4
             RETURNING *`,
            [value, description, category, key]
        );

        if (result.rows.length === 0) {
            throw new Error(`Config ${category}.${key} not found`);
        }

        return this.mapRowToConfig(result.rows[0]);
    }

    /**
     * Delete config
     */
    async deleteConfig(category: string, key: string): Promise<void> {
        const result = await query(
            'DELETE FROM system_configs WHERE category = $1 AND key = $2',
            [category, key]
        );
        if (result.rowCount === 0) {
            throw new Error(`Config ${category}.${key} not found`);
        }
    }

    /**
     * Get leave quotas from config
     */
    async getLeaveQuotas(): Promise<LeaveQuota[]> {
        const quotasConfig = await this.getConfigValue('leave', 'quotas', null);
        if (!quotasConfig) {
            // Return default values if not configured
            return [
                { type: 'Vacation', total: 15 },
                { type: 'Sick Leave', total: 10 },
                { type: 'Personal Day', total: -1 }, // -1 = unlimited
            ];
        }
        return quotasConfig;
    }

    /**
     * Get default password for new employees
     */
    async getDefaultPassword(): Promise<string> {
        return await this.getConfigValue('employee', 'default_password', 'Welcome123!');
    }

    /**
     * Parse config value according to data type
     */
    private parseConfigValue(config: SystemConfig): any {
        switch (config.dataType) {
            case 'number':
                return parseFloat(config.value);
            case 'boolean':
                return config.value === 'true' || config.value === '1';
            case 'json':
                try {
                    return JSON.parse(config.value);
                } catch (e) {
                    console.error('Failed to parse JSON config:', config.key, e);
                    return null;
                }
            case 'string':
            default:
                return config.value;
        }
    }

    /**
     * Map database row to SystemConfig
     */
    private mapRowToConfig(row: any): SystemConfig {
        return {
            id: row.id,
            category: row.category,
            key: row.key,
            value: row.value,
            dataType: row.data_type,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

export default new SystemConfigService();
