import { Router } from 'express';
import SystemConfigController from '../controllers/SystemConfigController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/configs - Get all configurations
router.get('/', SystemConfigController.getAllConfigs.bind(SystemConfigController));

// GET /api/configs/:category - Get configs by category
router.get('/:category', SystemConfigController.getConfigsByCategory.bind(SystemConfigController));

// GET /api/configs/:category/:key - Get specific config
router.get('/:category/:key', SystemConfigController.getConfig.bind(SystemConfigController));

// POST /api/configs - Create new configuration (admin only)
router.post(
    '/',
    apiLimiter,
    SystemConfigController.createConfig.bind(SystemConfigController)
);

// PUT /api/configs/:category/:key - Update configuration (admin only)
router.put(
    '/:category/:key',
    apiLimiter,
    SystemConfigController.updateConfig.bind(SystemConfigController)
);

// DELETE /api/configs/:category/:key - Delete configuration (admin only)
router.delete(
    '/:category/:key',
    apiLimiter,
    SystemConfigController.deleteConfig.bind(SystemConfigController)
);

export default router;
