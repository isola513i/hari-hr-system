"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = __importDefault(require("../controllers/AuthController"));
const security_1 = require("../middlewares/security");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// POST /api/auth/login - User login
router.post("/login", security_1.authLimiter, security_1.validateLogin, security_1.validateRequest, AuthController_1.default.login.bind(AuthController_1.default));
// POST /api/auth/change-password - Change password (protected)
router.post("/change-password", auth_1.authenticateToken, AuthController_1.default.changePassword.bind(AuthController_1.default));
// POST /api/auth/register - Self-registration for employees
router.post("/register", security_1.authLimiter, AuthController_1.default.register.bind(AuthController_1.default));
// GET /api/auth/check-email - Check if email is eligible for registration
router.get("/check-email", security_1.authLimiter, AuthController_1.default.checkEmail.bind(AuthController_1.default));
exports.default = router;
