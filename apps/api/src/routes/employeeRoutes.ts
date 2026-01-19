import { Router } from 'express';
import EmployeeController from '../controllers/EmployeeController';
import { apiLimiter, validateEmployeeCreation, validateRequest } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/employees - Get all employees
router.get('/', EmployeeController.getAllEmployees.bind(EmployeeController));

// GET /api/employees/:id - Get employee by ID
router.get('/:id', EmployeeController.getEmployeeById.bind(EmployeeController));

// POST /api/employees - Create new employee (with validation)
router.post(
    '/',
    apiLimiter,
    validateEmployeeCreation,
    validateRequest,
    EmployeeController.createEmployee.bind(EmployeeController)
);

// PUT /api/employees/:id - Update employee
router.put('/:id', apiLimiter, EmployeeController.updateEmployee.bind(EmployeeController));

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', apiLimiter, EmployeeController.deleteEmployee.bind(EmployeeController));

export default router;
