"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EmployeeController_1 = __importDefault(require("../controllers/EmployeeController"));
const security_1 = require("../middlewares/security");
const auth_1 = require("../middlewares/auth");
const cache_1 = require("../middlewares/cache");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Configure multer for avatar uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/avatars');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
    },
});
// All routes require authentication
router.use(auth_1.authenticateToken);
// POST /api/employees/upload-avatar - Upload avatar image
router.post('/upload-avatar', security_1.apiLimiter, upload.single('avatar'), (req, res) => {
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
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});
// GET /api/employees - Get all employees (any authenticated user) - cached for 30s
router.get('/', (0, cache_1.cacheMiddleware)(), EmployeeController_1.default.getAllEmployees.bind(EmployeeController_1.default));
// GET /api/employees/:id/manager - Get employee's manager (any authenticated user) - cached for 30s
router.get('/:id/manager', (0, cache_1.cacheMiddleware)(), EmployeeController_1.default.getEmployeeManager.bind(EmployeeController_1.default));
// GET /api/employees/:id/direct-reports - Get employee's direct reports (any authenticated user) - cached for 30s
router.get('/:id/direct-reports', (0, cache_1.cacheMiddleware)(), EmployeeController_1.default.getEmployeeDirectReports.bind(EmployeeController_1.default));
// GET /api/employees/:id - Get employee by ID (any authenticated user) - cached for 30s
router.get('/:id', (0, cache_1.cacheMiddleware)(), EmployeeController_1.default.getEmployeeById.bind(EmployeeController_1.default));
// POST /api/employees - Create new employee (HR_ADMIN only)
router.post('/', auth_1.requireAdmin, security_1.apiLimiter, security_1.validateEmployeeCreation, security_1.validateRequest, (0, cache_1.invalidateCache)('/api/employees'), EmployeeController_1.default.createEmployee.bind(EmployeeController_1.default));
// PATCH /api/employees/:id - Update own profile (any authenticated user) or any employee (HR_ADMIN)
router.patch('/:id', security_1.apiLimiter, (0, cache_1.invalidateCache)('/api/employees'), EmployeeController_1.default.updateEmployee.bind(EmployeeController_1.default));
// PUT /api/employees/:id - Update employee (HR_ADMIN only)
router.put('/:id', auth_1.requireAdmin, security_1.apiLimiter, (0, cache_1.invalidateCache)('/api/employees'), EmployeeController_1.default.updateEmployee.bind(EmployeeController_1.default));
// DELETE /api/employees/:id - Delete employee (HR_ADMIN only)
router.delete('/:id', auth_1.requireAdmin, security_1.apiLimiter, (0, cache_1.invalidateCache)('/api/employees'), EmployeeController_1.default.deleteEmployee.bind(EmployeeController_1.default));
exports.default = router;
