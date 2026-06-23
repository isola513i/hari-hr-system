import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { LEAVE_TYPES } from '../constants/leaveTypes';

// Rate limit values — override per environment via .env
// Defaults are production-safe; raise in .env for local dev if needed.
const env = {
  generalMax:          parseInt(process.env.RATE_LIMIT_GENERAL_MAX          || '500'),
  authMax:             parseInt(process.env.RATE_LIMIT_AUTH_MAX             || '30'),
  authWindowMs:        parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS       || String(5 * 60 * 1000)),
  forgotPasswordMax:   parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX  || '5'),
  forgotPasswordWindowMs: parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS || String(15 * 60 * 1000)),
  apiMax:              parseInt(process.env.RATE_LIMIT_API_MAX              || '100'),
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.generalMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: env.authWindowMs,
  max: env.authMax,
  message: 'Too many login attempts, please try again in a few minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: env.forgotPasswordWindowMs,
  max: env.forgotPasswordMax,
  message: 'Too many password reset requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: env.apiMax,
  message: 'Too many API requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet security headers configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://ui-avatars.com'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Input validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Employee creation validation rules
export const validateEmployeeCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(), // Prevent XSS
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Role must be between 2 and 50 characters')
    .escape(),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters')
    .escape(),
  body('joinDate').optional().isISO8601().withMessage('Invalid date format'),
];

// Login validation rules
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Leave request validation rules
export const validateLeaveRequest = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Leave type is required')
    .isIn([...LEAVE_TYPES])
    .withMessage('Invalid leave type')
    .escape(),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
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
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
    .escape(),
  body('handoverEmployeeId')
    .optional()
    .isUUID()
    .withMessage('Invalid handover employee ID'),
  body('handoverNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Handover notes must not exceed 2000 characters'),
  body('isHalfDay')
    .optional()
    .isBoolean()
    .withMessage('isHalfDay must be boolean'),
  body('halfDayPeriod')
    .optional()
    .isIn(['morning', 'afternoon'])
    .withMessage('halfDayPeriod must be morning or afternoon'),
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

// Forgot password validation rules
export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

// Reset password validation rules
export const validateResetPassword = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid token format'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required'),
];

// Sanitize HTML to prevent XSS
export const sanitizeHtml = (text: string): string => {
  return text
    // Strip HTML tags entirely
    .replace(/<[^>]*>/g, '')
    // Encode remaining HTML special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Block javascript: and data: URI schemes that could execute code
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    // Strip JS event handler attributes (onerror=, onclick=, etc.)
    .replace(/\bon\w+\s*=/gi, '');
};
