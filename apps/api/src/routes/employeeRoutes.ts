import { Router } from 'express';
import EmployeeController from '../controllers/EmployeeController';
import { apiLimiter, validateEmployeeCreation, validateRequest } from '../middlewares/security';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
    },
});

// All routes require authentication
router.use(authenticateToken);

// POST /api/employees/upload-avatar - Upload avatar image
router.post('/upload-avatar', apiLimiter, upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Return the URL to the uploaded file
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        res.status(200).json({
            success: true,
            avatarUrl,
            message: 'Avatar uploaded successfully'
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// GET /api/employees - Get all employees (any authenticated user) - cached for 30s
router.get('/', cacheMiddleware(), EmployeeController.getAllEmployees.bind(EmployeeController));

// GET /api/employees/:id/manager - Get employee's manager (any authenticated user) - cached for 30s
router.get('/:id/manager', cacheMiddleware(), EmployeeController.getEmployeeManager.bind(EmployeeController));

// GET /api/employees/:id/direct-reports - Get employee's direct reports (any authenticated user) - cached for 30s
router.get('/:id/direct-reports', cacheMiddleware(), EmployeeController.getEmployeeDirectReports.bind(EmployeeController));

// GET /api/employees/:id - Get employee by ID (any authenticated user) - cached for 30s
router.get('/:id', cacheMiddleware(), EmployeeController.getEmployeeById.bind(EmployeeController));

// POST /api/employees - Create new employee (HR_ADMIN only)
router.post(
    '/',
    requireAdmin,
    apiLimiter,
    validateEmployeeCreation,
    validateRequest,
    invalidateCache('/api/employees'),
    EmployeeController.createEmployee.bind(EmployeeController)
);

// PATCH /api/employees/:id - Update own profile (any authenticated user) or any employee (HR_ADMIN)
router.patch('/:id', apiLimiter, invalidateCache('/api/employees'), EmployeeController.updateEmployee.bind(EmployeeController));

// PUT /api/employees/:id - Update employee (HR_ADMIN only)
router.put('/:id', requireAdmin, apiLimiter, invalidateCache('/api/employees'), EmployeeController.updateEmployee.bind(EmployeeController));

// DELETE /api/employees/:id - Delete employee (HR_ADMIN only)
router.delete('/:id', requireAdmin, apiLimiter, invalidateCache('/api/employees'), EmployeeController.deleteEmployee.bind(EmployeeController));

export default router;
