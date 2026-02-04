"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SystemConfigController_1 = __importDefault(require("../controllers/SystemConfigController"));
const security_1 = require("../middlewares/security");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/configs - Get all configurations
router.get('/', SystemConfigController_1.default.getAllConfigs.bind(SystemConfigController_1.default));
// GET /api/configs/:category - Get configs by category
router.get('/:category', SystemConfigController_1.default.getConfigsByCategory.bind(SystemConfigController_1.default));
// GET /api/configs/:category/:key - Get specific config
router.get('/:category/:key', SystemConfigController_1.default.getConfig.bind(SystemConfigController_1.default));
// POST /api/configs - Create new configuration (admin only)
router.post('/', security_1.apiLimiter, SystemConfigController_1.default.createConfig.bind(SystemConfigController_1.default));
// PUT /api/configs/:category/:key - Update configuration (admin only)
router.put('/:category/:key', security_1.apiLimiter, SystemConfigController_1.default.updateConfig.bind(SystemConfigController_1.default));
// DELETE /api/configs/:category/:key - Delete configuration (admin only)
router.delete('/:category/:key', security_1.apiLimiter, SystemConfigController_1.default.deleteConfig.bind(SystemConfigController_1.default));
exports.default = router;
