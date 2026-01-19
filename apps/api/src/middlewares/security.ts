import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configuration
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limit for authentication endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});

// API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 requests per minute
    message: 'Too many API requests, please slow down.',
});

// Helmet security headers configuration
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding
    crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Input validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// Employee creation validation rules
export const validateEmployeeCreation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .escape(), // Prevent XSS
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('role')
        .trim()
        .notEmpty().withMessage('Role is required')
        .isLength({ min: 2, max: 50 }).withMessage('Role must be between 2 and 50 characters')
        .escape(),
    body('department')
        .trim()
        .notEmpty().withMessage('Department is required')
        .isLength({ min: 2, max: 50 }).withMessage('Department must be between 2 and 50 characters')
        .escape(),
    body('joinDate')
        .optional()
        .isISO8601().withMessage('Invalid date format'),
];

// Login validation rules
export const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Leave request validation rules
export const validateLeaveRequest = [
    body('type')
        .trim()
        .notEmpty().withMessage('Leave type is required')
        .isIn(['Vacation', 'Sick Leave', 'Personal Day']).withMessage('Invalid leave type')
        .escape(),
    body('startDate')
        .notEmpty().withMessage('Start date is required')
        .isISO8601().withMessage('Invalid start date format'),
    body('endDate')
        .notEmpty().withMessage('End date is required')
        .isISO8601().withMessage('Invalid end date format')
        .custom((endDate, { req }) => {
            if (new Date(endDate) < new Date(req.body.startDate)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
        .escape(),
];

// File upload validation
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
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
        'image/gif'
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            error: 'Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, GIF'
        });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
        return res.status(400).json({
            error: 'File too large. Maximum size is 10MB'
        });
    }

    next();
};

// Sanitize HTML to prevent XSS
export const sanitizeHtml = (text: string): string => {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};
