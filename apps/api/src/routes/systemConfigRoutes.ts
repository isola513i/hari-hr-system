import { Router } from 'express';
import SystemConfigController from '../controllers/SystemConfigController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/configs:
 *   get:
 *     summary: Get all system configurations
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all system configuration entries
 *       401: { description: Unauthorized }
 */
// GET /api/configs - Get all configurations
router.get('/', SystemConfigController.getAllConfigs.bind(SystemConfigController));

/**
 * @swagger
 * /api/configs/{category}:
 *   get:
 *     summary: Get system configurations by category
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema: { type: string }
 *         description: Configuration category name
 *     responses:
 *       200:
 *         description: List of configuration entries for the given category
 *       401: { description: Unauthorized }
 *       404: { description: Category not found }
 */
// GET /api/configs/:category - Get configs by category
router.get('/:category', SystemConfigController.getConfigsByCategory.bind(SystemConfigController));

/**
 * @swagger
 * /api/configs/{category}/{key}:
 *   get:
 *     summary: Get a specific system configuration by category and key
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema: { type: string }
 *         description: Configuration category name
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         description: Configuration key within the category
 *     responses:
 *       200:
 *         description: Single configuration entry
 *       401: { description: Unauthorized }
 *       404: { description: Configuration not found }
 */
// GET /api/configs/:category/:key - Get specific config
router.get('/:category/:key', SystemConfigController.getConfig.bind(SystemConfigController));

/**
 * @swagger
 * /api/configs:
 *   post:
 *     summary: Create a new system configuration entry
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, key, value]
 *             properties:
 *               category: { type: string }
 *               key: { type: string }
 *               value: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Configuration entry created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 */
// POST /api/configs - Create new configuration (admin only)
router.post(
    '/',
    apiLimiter,
    requireAdmin,
    SystemConfigController.createConfig.bind(SystemConfigController)
);

/**
 * @swagger
 * /api/configs/{category}/{key}:
 *   put:
 *     summary: Update an existing system configuration entry
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema: { type: string }
 *         description: Configuration category name
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         description: Configuration key within the category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Configuration entry updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Configuration not found }
 */
// PUT /api/configs/:category/:key - Update configuration (admin only)
router.put(
    '/:category/:key',
    apiLimiter,
    requireAdmin,
    SystemConfigController.updateConfig.bind(SystemConfigController)
);

/**
 * @swagger
 * /api/configs/{category}/{key}:
 *   delete:
 *     summary: Delete a system configuration entry
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema: { type: string }
 *         description: Configuration category name
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         description: Configuration key within the category
 *     responses:
 *       200:
 *         description: Configuration entry deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Configuration not found }
 */
// DELETE /api/configs/:category/:key - Delete configuration (admin only)
router.delete(
    '/:category/:key',
    apiLimiter,
    requireAdmin,
    SystemConfigController.deleteConfig.bind(SystemConfigController)
);

export default router;
