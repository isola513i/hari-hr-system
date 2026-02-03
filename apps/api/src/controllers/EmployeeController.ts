import { Request, Response } from 'express';
import EmployeeService from '../services/EmployeeService';
import { getPaginationParams, getSortParams } from '../utils/pagination';

export class EmployeeController {
    /**
     * Get all employees with optional pagination
     * Query params: page, limit, department, status, search, sortBy, sortOrder
     */
    async getAllEmployees(req: Request, res: Response): Promise<void> {
        try {
            // Check if pagination is requested
            const usePagination = req.query.page !== undefined || req.query.limit !== undefined;

            if (usePagination) {
                const paginationParams = getPaginationParams(req);
                const sortParams = getSortParams(
                    req,
                    ['name', 'email', 'department', 'role', 'status', 'join_date', 'created_at'],
                    'name',
                    'ASC'
                );

                const filters = {
                    department: req.query.department as string | undefined,
                    status: req.query.status as string | undefined,
                    search: req.query.search as string | undefined,
                };

                const result = await EmployeeService.getEmployeesPaginated(
                    paginationParams,
                    filters,
                    sortParams.field,
                    sortParams.order
                );

                res.json(result);
            } else {
                // Backward compatibility: return all employees without pagination
                const employees = await EmployeeService.getAllEmployees();
                res.json(employees);
            }
        } catch (error: unknown) {
            console.error('Get employees error:', error);
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    }

    async getEmployeeById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const employee = await EmployeeService.getEmployeeById(id);

            if (!employee) {
                res.status(404).json({ error: 'Employee not found' });
                return;
            }

            res.json(employee);
        } catch (error: any) {
            console.error('Get employee error:', error);
            res.status(500).json({ error: 'Failed to fetch employee' });
        }
    }

    async createEmployee(req: Request, res: Response): Promise<void> {
        try {
            const employeeData = req.body;

            // Validate required fields
            if (!employeeData.name || !employeeData.email || !employeeData.role || !employeeData.department) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const employee = await EmployeeService.createEmployee(employeeData);
            res.status(201).json(employee);
        } catch (error: any) {
            console.error('Create employee error:', error);
            res.status(400).json({ error: error.message || 'Failed to create employee' });
        }
    }

    async updateEmployee(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user = (req as any).user;

            // Check if user is updating their own profile
            const isOwnProfile = user?.employeeId === id;
            const isAdmin = user?.role === 'HR_ADMIN';

            // If not admin and not own profile, deny access
            if (!isAdmin && !isOwnProfile) {
                res.status(403).json({ error: 'You can only update your own profile' });
                return;
            }

            // If employee updating own profile, restrict fields they can update
            let updateData = { id, ...req.body };
            if (!isAdmin && isOwnProfile) {
                // Employees can only update: name, email, avatar, bio
                const allowedFields = ['name', 'email', 'avatar', 'bio'];
                updateData = {
                    id,
                    ...Object.fromEntries(
                        Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
                    )
                };
            }

            const employee = await EmployeeService.updateEmployee(updateData);
            res.json(employee);
        } catch (error: any) {
            console.error('Update employee error:', error);
            if (error.message === 'Employee not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message || 'Failed to update employee' });
            }
        }
    }

    async deleteEmployee(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await EmployeeService.deleteEmployee(id);
            res.json({ message: 'Employee deleted successfully' });
        } catch (error: any) {
            console.error('Delete employee error:', error);
            if (error.message === 'Employee not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete employee' });
            }
        }
    }
}

export default new EmployeeController();
