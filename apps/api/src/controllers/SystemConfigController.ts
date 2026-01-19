import { Request, Response } from 'express';
import SystemConfigService from '../services/SystemConfigService';

export class SystemConfigController {
    /**
     * GET /api/configs - Get all configurations
     */
    async getAllConfigs(req: Request, res: Response): Promise<void> {
        try {
            const configs = await SystemConfigService.getAllConfigs();
            res.json(configs);
        } catch (error: any) {
            console.error('Get configs error:', error);
            res.status(500).json({ error: 'Failed to fetch configurations' });
        }
    }

    /**
     * GET /api/configs/:category - Get configs by category
     */
    async getConfigsByCategory(req: Request, res: Response): Promise<void> {
        try {
            const { category } = req.params;
            const configs = await SystemConfigService.getConfigsByCategory(category);
            res.json(configs);
        } catch (error: any) {
            console.error('Get configs by category error:', error);
            res.status(500).json({ error: 'Failed to fetch configurations' });
        }
    }

    /**
     * GET /api/configs/:category/:key - Get specific config
     */
    async getConfig(req: Request, res: Response): Promise<void> {
        try {
            const { category, key } = req.params;
            const config = await SystemConfigService.getConfig(category, key);

            if (!config) {
                res.status(404).json({ error: 'Configuration not found' });
                return;
            }

            res.json(config);
        } catch (error: any) {
            console.error('Get config error:', error);
            res.status(500).json({ error: 'Failed to fetch configuration' });
        }
    }

    /**
     * POST /api/configs - Create new configuration
     */
    async createConfig(req: Request, res: Response): Promise<void> {
        try {
            const { category, key, value, dataType, description } = req.body;

            if (!category || !key || !value || !dataType) {
                res.status(400).json({ error: 'Missing required fields: category, key, value, dataType' });
                return;
            }

            const config = await SystemConfigService.createConfig({
                category,
                key,
                value,
                dataType,
                description,
            });

            res.status(201).json(config);
        } catch (error: any) {
            console.error('Create config error:', error);
            if (error.message.includes('already exists')) {
                res.status(409).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message || 'Failed to create configuration' });
            }
        }
    }

    /**
     * PUT /api/configs/:category/:key - Update configuration
     */
    async updateConfig(req: Request, res: Response): Promise<void> {
        try {
            const { category, key } = req.params;
            const { value, description } = req.body;

            if (!value) {
                res.status(400).json({ error: 'Missing required field: value' });
                return;
            }

            const config = await SystemConfigService.updateConfig(category, key, {
                value,
                description,
            });

            res.json(config);
        } catch (error: any) {
            console.error('Update config error:', error);
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message || 'Failed to update configuration' });
            }
        }
    }

    /**
     * DELETE /api/configs/:category/:key - Delete configuration
     */
    async deleteConfig(req: Request, res: Response): Promise<void> {
        try {
            const { category, key } = req.params;
            await SystemConfigService.deleteConfig(category, key);
            res.json({ message: 'Configuration deleted successfully' });
        } catch (error: any) {
            console.error('Delete config error:', error);
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete configuration' });
            }
        }
    }
}

export default new SystemConfigController();
