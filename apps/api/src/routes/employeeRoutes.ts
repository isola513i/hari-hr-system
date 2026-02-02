import { Router } from 'express';
import EmployeeController from '../controllers/EmployeeController';
import { apiLimiter, validateEmployeeCreation, validateRequest } from '../middlewares/security';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/employees - Get all employees (any authenticated user)
router.get('/', EmployeeController.getAllEmployees.bind(EmployeeController));

// GET /api/employees/:id - Get employee by ID (any authenticated user)
router.get('/:id', EmployeeController.getEmployeeById.bind(EmployeeController));

// POST /api/employees - Create new employee (HR_ADMIN only)
router.post(
    '/',
    requireAdmin,
    apiLimiter,
    validateEmployeeCreation,
    validateRequest,
    EmployeeController.createEmployee.bind(EmployeeController)
);

// PUT /api/employees/:id - Update employee (HR_ADMIN only)
router.put('/:id', requireAdmin, apiLimiter, EmployeeController.updateEmployee.bind(EmployeeController));

// DELETE /api/employees/:id - Delete employee (HR_ADMIN only)
router.delete('/:id', requireAdmin, apiLimiter, EmployeeController.deleteEmployee.bind(EmployeeController));

export default router;
