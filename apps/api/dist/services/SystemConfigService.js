"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfigService = void 0;
const db_1 = require("../db");
class SystemConfigService {
    /**
     * Get all system configurations
     */
    getAllConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM system_configs ORDER BY category, key');
            return result.rows.map(this.mapRowToConfig);
        });
    }
    /**
     * Get config by category and key
     */
    getConfig(category, key) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM system_configs WHERE category = $1 AND key = $2', [category, key]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToConfig(result.rows[0]);
        });
    }
    /**
     * Get all configs in a category
     */
    getConfigsByCategory(category) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM system_configs WHERE category = $1 ORDER BY key', [category]);
            return result.rows.map(this.mapRowToConfig);
        });
    }
    /**
     * Get config value (parsed according to dataType)
     */
    getConfigValue(category, key, defaultValue) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getConfig(category, key);
            if (!config) {
                return defaultValue;
            }
            return this.parseConfigValue(config);
        });
    }
    /**
     * Create new config
     */
    createConfig(configData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { category, key, value, dataType, description } = configData;
            // Check if config already exists
            const existing = yield this.getConfig(category, key);
            if (existing) {
                throw new Error(`Config ${category}.${key} already exists`);
            }
            const result = yield (0, db_1.query)(`INSERT INTO system_configs (category, key, value, data_type, description)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, [category, key, value, dataType, description || null]);
            return this.mapRowToConfig(result.rows[0]);
        });
    }
    /**
     * Update existing config
     */
    updateConfig(category, key, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { value, description } = updateData;
            const result = yield (0, db_1.query)(`UPDATE system_configs
             SET value = $1,
                 description = COALESCE($2, description),
                 updated_at = CURRENT_TIMESTAMP
             WHERE category = $3 AND key = $4
             RETURNING *`, [value, description, category, key]);
            if (result.rows.length === 0) {
                throw new Error(`Config ${category}.${key} not found`);
            }
            return this.mapRowToConfig(result.rows[0]);
        });
    }
    /**
     * Delete config
     */
    deleteConfig(category, key) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('DELETE FROM system_configs WHERE category = $1 AND key = $2', [category, key]);
            if (result.rowCount === 0) {
                throw new Error(`Config ${category}.${key} not found`);
            }
        });
    }
    /**
     * Get leave quotas from config
     */
    getLeaveQuotas() {
        return __awaiter(this, void 0, void 0, function* () {
            const quotasConfig = yield this.getConfigValue('leave', 'quotas', null);
            if (!quotasConfig) {
                // Return default values if not configured
                return [
                    { type: 'Vacation', total: 15 },
                    { type: 'Sick Leave', total: 10 },
                    { type: 'Personal Day', total: -1 }, // -1 = unlimited
                ];
            }
            return quotasConfig;
        });
    }
    /**
     * Get default password for new employees
     */
    getDefaultPassword() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getConfigValue('employee', 'default_password', 'Welcome123!');
        });
    }
    /**
     * Parse config value according to data type
     */
    parseConfigValue(config) {
        switch (config.dataType) {
            case 'number':
                return parseFloat(config.value);
            case 'boolean':
                return config.value === 'true' || config.value === '1';
            case 'json':
                try {
                    return JSON.parse(config.value);
                }
                catch (e) {
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
    mapRowToConfig(row) {
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
exports.SystemConfigService = SystemConfigService;
exports.default = new SystemConfigService();
