"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHtml = exports.validateFileUpload = exports.validateLeaveRequest = exports.validateLogin = exports.validateEmployeeCreation = exports.validateRequest = exports.helmetConfig = exports.apiLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const express_validator_1 = require("express-validator");
// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
// Rate limiting configuration
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5000, // ใส่ 5000 ไปเลยครับ เพื่อความชัวร์
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
// Stricter rate limit for authentication endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 min (dev) / 5 min (prod)
    max: isDevelopment ? 200 : 30, // 200 attempts (dev) / 30 attempts (prod)
    message: isDevelopment
        ? 'Too many login attempts, please wait a moment.'
        : 'Too many login attempts, please try again in a few minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});
// API rate limiter
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000,
    max: 2000, // ใส่ 2000 ไปเลย
    message: 'Too many API requests, please slow down.',
});
// Helmet security headers configuration
exports.helmetConfig = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});
// Input validation middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
        });
    }
    next();
};
exports.validateRequest = validateRequest;
// Employee creation validation rules
exports.validateEmployeeCreation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .escape(), // Prevent XSS
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    (0, express_validator_1.body)('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Role must be between 2 and 50 characters')
        .escape(),
    (0, express_validator_1.body)('department')
        .trim()
        .notEmpty()
        .withMessage('Department is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Department must be between 2 and 50 characters')
        .escape(),
    (0, express_validator_1.body)('joinDate').optional().isISO8601().withMessage('Invalid date format'),
];
// Login validation rules
exports.validateLogin = [
    (0, express_validator_1.body)('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];
// Leave request validation rules
exports.validateLeaveRequest = [
    (0, express_validator_1.body)('type')
        .trim()
        .notEmpty()
        .withMessage('Leave type is required')
        .isIn(['Vacation', 'Sick Leave', 'Personal Day'])
        .withMessage('Invalid leave type')
        .escape(),
    (0, express_validator_1.body)('startDate')
        .notEmpty()
        .withMessage('Start date is required')
        .isISO8601()
        .withMessage('Invalid start date format'),
    (0, express_validator_1.body)('endDate')
        .notEmpty()
        .withMessage('End date is required')
        .isISO8601()
        .withMessage('Invalid end date format')
        .custom((endDate, { req }) => {
        if (new Date(endDate) < new Date(req.body.startDate)) {
            throw new Error('End date must be after start date');
        }
        return true;
    }),
    (0, express_validator_1.body)('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Reason must not exceed 500 characters')
        .escape(),
];
// File upload validation
const validateFileUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
    ];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            error: 'Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, GIF',
        });
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
        return res.status(400).json({
            error: 'File too large. Maximum size is 10MB',
        });
    }
    next();
};
exports.validateFileUpload = validateFileUpload;
// Sanitize HTML to prevent XSS
const sanitizeHtml = (text) => {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};
exports.sanitizeHtml = sanitizeHtml;
