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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfigController = void 0;
const SystemConfigService_1 = __importDefault(require("../services/SystemConfigService"));
class SystemConfigController {
    /**
     * GET /api/configs - Get all configurations
     */
    getAllConfigs(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const configs = yield SystemConfigService_1.default.getAllConfigs();
                res.json(configs);
            }
            catch (error) {
                console.error('Get configs error:', error);
                res.status(500).json({ error: 'Failed to fetch configurations' });
            }
        });
    }
    /**
     * GET /api/configs/:category - Get configs by category
     */
    getConfigsByCategory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { category } = req.params;
                const configs = yield SystemConfigService_1.default.getConfigsByCategory(category);
                res.json(configs);
            }
            catch (error) {
                console.error('Get configs by category error:', error);
                res.status(500).json({ error: 'Failed to fetch configurations' });
            }
        });
    }
    /**
     * GET /api/configs/:category/:key - Get specific config
     */
    getConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { category, key } = req.params;
                const config = yield SystemConfigService_1.default.getConfig(category, key);
                if (!config) {
                    res.status(404).json({ error: 'Configuration not found' });
                    return;
                }
                res.json(config);
            }
            catch (error) {
                console.error('Get config error:', error);
                res.status(500).json({ error: 'Failed to fetch configuration' });
            }
        });
    }
    /**
     * POST /api/configs - Create new configuration
     */
    createConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { category, key, value, dataType, description } = req.body;
                if (!category || !key || !value || !dataType) {
                    res.status(400).json({ error: 'Missing required fields: category, key, value, dataType' });
                    return;
                }
                const config = yield SystemConfigService_1.default.createConfig({
                    category,
                    key,
                    value,
                    dataType,
                    description,
                });
                res.status(201).json(config);
            }
            catch (error) {
                console.error('Create config error:', error);
                if (error.message.includes('already exists')) {
                    res.status(409).json({ error: error.message });
                }
                else {
                    res.status(400).json({ error: error.message || 'Failed to create configuration' });
                }
            }
        });
    }
    /**
     * PUT /api/configs/:category/:key - Update configuration
     */
    updateConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { category, key } = req.params;
                const { value, description } = req.body;
                if (!value) {
                    res.status(400).json({ error: 'Missing required field: value' });
                    return;
                }
                const config = yield SystemConfigService_1.default.updateConfig(category, key, {
                    value,
                    description,
                });
                res.json(config);
            }
            catch (error) {
                console.error('Update config error:', error);
                if (error.message.includes('not found')) {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(400).json({ error: error.message || 'Failed to update configuration' });
                }
            }
        });
    }
    /**
     * DELETE /api/configs/:category/:key - Delete configuration
     */
    deleteConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { category, key } = req.params;
                yield SystemConfigService_1.default.deleteConfig(category, key);
                res.json({ message: 'Configuration deleted successfully' });
            }
            catch (error) {
                console.error('Delete config error:', error);
                if (error.message.includes('not found')) {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Failed to delete configuration' });
                }
            }
        });
    }
}
exports.SystemConfigController = SystemConfigController;
exports.default = new SystemConfigController();
